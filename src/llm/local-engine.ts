// ============================================================
// src/llm/local-engine.ts - Anahtarsız / Yerel Akıllı Hukuki Analiz Motoru
// ============================================================
// Herhangi bir harici API anahtarına (OpenAI, Gemini, Anthropic vb.)
// ihtiyaç duymadan sözleşme metinlerini doğrudan analiz eden,
// DOM tabanlı alıntı eşleştirmesi yapan ve Zod şemalı rapor üreten
// yerleşik kural ve NLP motoru.
// ============================================================

import type { RiskReport, RiskItem, RiskCategory, RiskSeverity, RiskLevel } from '../types/index';
import { detectPromptInjectionPatterns } from './prompt-builder';
import { verifyQuoteInDom } from '../validator/dom-search';
import { RiskReportSchema } from '../validator/schema';

interface ClauseRule {
  category: RiskCategory;
  title: string;
  simpleExplanationTr: string;
  severity: RiskSeverity;
  pattern: RegExp;
  weight: number;
}

const CLAUSE_RULES: ClauseRule[] = [
  // --- Otomatik Yenileme ve Ödeme ---
  {
    category: 'Otomatik Yenileme/Ödeme',
    title: 'Otomatik Abonelik Yenilemesi',
    simpleExplanationTr: 'Aboneliğiniz dönem sonunda onayınız alınmaksızın otomatik olarak yenilenir ve kartınızdan çekim yapılır.',
    severity: 'YÜKSEK',
    pattern: /(otomatik\s+olarak\s+yenilen|kendiliğinden\s+uzatıl|otomatik\s+yenileme|auto-renew|automatically\s+renew)/i,
    weight: 22,
  },
  {
    category: 'Otomatik Yenileme/Ödeme',
    title: 'Gecikme Faizi ve Cezai Şart',
    simpleExplanationTr: 'Geciken veya başarısız olan ödemelerde yüksek oranlı gecikme faizi ve işlem ücreti tahsil edilir.',
    severity: 'ORTA',
    pattern: /(gecikme\s+faizi|faiz\s+uygulan|cezai\s+şart|late\s+fee|interest\s+rate)/i,
    weight: 15,
  },
  {
    category: 'Otomatik Yenileme/Ödeme',
    title: 'Ücret İadesi Yapılmaması (No Refund)',
    simpleExplanationTr: 'Ödenen abonelik veya hizmet bedelleri için hiçbir koşulda para iadesi yapılmayacağı belirtilmektedir.',
    severity: 'YÜKSEK',
    pattern: /(iade\s+(veya\s+para\s+iadesi\s+)?(hiçbir\s+koşulda\s+)?yapılmaz|ücret\s+iadesi\s+yapılmaz|no\s+refunds?|non-refundable)/i,
    weight: 25,
  },
  {
    category: 'Otomatik Yenileme/Ödeme',
    title: 'Uzun İptal Bildirim Süresi',
    simpleExplanationTr: 'Aboneliği sonlandırmak için sonraki dönemden uzun süre önce (örn. 30-45 gün) yazılı bildirim zorunluluğu getirilmiştir.',
    severity: 'ORTA',
    pattern: /(en\s+az\s+\d+\s+gün\s+önce\s+(yazılı\s+olarak\s+)?bildiril|iptal\s+talebi.*en\s+az\s+\d+\s+gün|prior\s+notice\s+of\s+at\s+least)/i,
    weight: 18,
  },
  {
    category: 'Otomatik Yenileme/Ödeme',
    title: 'Tek Taraflı Fiyat Artışı Hakkı',
    simpleExplanationTr: 'Şirket önceden belirlenen oranlarda veya dilediğinde fiyat artışı yapma hakkını saklı tutar.',
    severity: 'ORTA',
    pattern: /(her\s+yıl\s+%\d+.*artırılabilir|fiyat\s+artışı\s+hakkı|ücretlerde\s+değişiklik\s+yapma)/i,
    weight: 14,
  },

  // --- Veri Gizliliği ---
  {
    category: 'Veri Gizliliği',
    title: 'Kişisel Verilerin Reklam Ortaklarıyla Paylaşımı',
    simpleExplanationTr: 'Kullanım alışkanlıklarınız, profil verileriniz ve cihaz bilgileriniz üçüncü taraf reklam ağlarıyla paylaşılabilir.',
    severity: 'YÜKSEK',
    pattern: /(reklam\s+ortak|pazarlama\s+ve\s+iş\s+ortak|üçüncü\s+taraf\s+veri\s+sağlayıcı|üçüncü\s+taraflarla\s+paylaş|share.*with\s+third\s+parties|advertising\s+partners)/i,
    weight: 25,
  },
  {
    category: 'Veri Gizliliği',
    title: 'Hassas ve Biyometrik / Konum Verisi Toplama',
    simpleExplanationTr: 'Hassas GPS konum verileri, cihaz kimlikleri ve etkileşim geçmişiniz sürekli olarak toplanmaktadır.',
    severity: 'YÜKSEK',
    pattern: /(konum\s+verileri|gps\s+dahil|biyometrik\s+veri|cihaz\s+bilgileri.*tarayıcı\s+geçmişi|location\s+data|biometric)/i,
    weight: 24,
  },
  {
    category: 'Veri Gizliliği',
    title: 'Uzun Süreli / Süresiz Veri Saklama',
    simpleExplanationTr: 'Hesabınızı silseniz bile verileriniz 7 yıla kadar veya süresiz biçimde şirket bünyesinde tutulabilir.',
    severity: 'ORTA',
    pattern: /(\d+\s+yıla\s+kadar\s+saklayabilir|süresiz\s+olarak\s+saklanır|retain.*up\s+to\s+\d+\s+years|retained\s+indefinitely)/i,
    weight: 18,
  },
  {
    category: 'Veri Gizliliği',
    title: 'Siteler Arası Takip ve Çerezler (Cross-Site Tracking)',
    simpleExplanationTr: 'Farklı web siteleri ve uygulamalar üzerindeki çevrimiçi hareketleriniz izleme teknolojileriyle takip edilmektedir.',
    severity: 'ORTA',
    pattern: /(çevrimiçi\s+davranışlarınızı.*izleyebilir|cross-site\s+tracking|web\s+beacon|izleme\s+teknolojileri)/i,
    weight: 16,
  },

  // --- Yargı Yolu ve Tahkim ---
  {
    category: 'Yargı Yolu/Tahkim',
    title: 'Bağlayıcı Tahkim Zorunluluğu',
    simpleExplanationTr: 'Uyuşmazlıklarda tüketici mahkemeleri yerine tek hakemli bağlayıcı tahkime gitme zorunluluğu konulmuştur.',
    severity: 'ORTA',
    pattern: /(bağlayıcı\s+tahkim|tek\s+hakem|tahkim\s+yoluyla\s+çözül|binding\s+arbitration|rules\s+of\s+arbitration)/i,
    weight: 18,
  },
  {
    category: 'Yargı Yolu/Tahkim',
    title: 'Toplu Dava Açma Hakkından Feragat',
    simpleExplanationTr: 'Kullanıcılar haklarını ararken diğer mağdurlarla toplu dava açma hakkından peşinen feragat etmiş sayılır.',
    severity: 'YÜKSEK',
    pattern: /(toplu\s+dava\s+(açma\s+hakkından\s+)?feragat|class\s+action\s+waiver|waive.*class\s+action)/i,
    weight: 22,
  },
  {
    category: 'Yargı Yolu/Tahkim',
    title: 'Yabancı veya Uzak Yargı Yetkisi',
    simpleExplanationTr: 'Uyuşmazlıklarda tüketicinin ikametgahı yerine firmanın seçtiği yabancı bir mahkeme yetkili kılınmıştır.',
    severity: 'ORTA',
    pattern: /(münhasır(an)?\s+yetkili(dir)?|uyuşmazlıkların\s+çözümünde.*mahkemeleri|delaware|singapur|exclusive\s+jurisdiction)/i,
    weight: 16,
  },

  // --- Fesih ve Değişiklik Hakkı ---
  {
    category: 'Fesih/Değişiklik Hakkı',
    title: 'Önceden Bildirimsiz Sözleşme Değişikliği',
    simpleExplanationTr: 'Hizmet sağlayıcı sözleşme ve kuralları kullanıcılara önceden haber vermeksizin dilediğinde değiştirebilir.',
    severity: 'ORTA',
    pattern: /(önceden\s+bildirim(de)?\s+bulunmaksızın\s+değiştir|modify.*without\s+(prior\s+)?notice|haber\s+vermeksizin\s+değişiklik)/i,
    weight: 17,
  },
  {
    category: 'Fesih/Değişiklik Hakkı',
    title: 'Gerekçesiz Hesap Kapatma veya Fesih',
    simpleExplanationTr: 'Firma dilediği zaman sebep bildirmeksizin hesabınızı askıya alabilir veya hizmeti tamamen durdurabilir.',
    severity: 'YÜKSEK',
    pattern: /(herhangi\s+bir\s+gerekçe\s+bildirmeksizin|sebep\s+göstermeksizin.*hesabınızı\s+(askıya\s+al|kapat)|terminate.*at\s+any\s+time.*without\s+cause)/i,
    weight: 20,
  },

  // --- Diğer ve Sorumluluk Reddi ---
  {
    category: 'Diğer',
    title: 'Ağır Sorumluluk Reddi (As-Is / Garanti Yok)',
    simpleExplanationTr: 'Hizmet kesintileri, veri kayıpları veya arızalardan firmanın hiçbir sorumluluk taşımadığı belirtilmektedir.',
    severity: 'ORTA',
    pattern: /(kesintilerden\s+kaynaklanan\s+zararlardan\s+sorumlu\s+değil|hiçbir\s+garanti\s+verilmez|as\s+is|olduğu\s+gibi\s+sunulur|limitation\s+of\s+liability|disclaim\s+all\s+warranties)/i,
    weight: 15,
  },
  {
    category: 'Diğer',
    title: 'Tazminat Taleplerine Düşük Üst Sınır',
    simpleExplanationTr: 'Şirketin kusurunda dahi ödenecek azami tazminat bedeli sembolik bir tutarla (örn. 1 aylık ücret) sınırlandırılmıştır.',
    severity: 'ORTA',
    pattern: /(tazminat\s+taleplerinde\s+üst\s+sınır|toplam\s+sorumluluğumuz.*\$\d+|liability\s+shall\s+not\s+exceed)/i,
    weight: 15,
  },
];

/**
 * Metinden cümle / paragraf çıkarıp tam orijinal alıntıyı bulur.
 */
function extractSentenceQuote(text: string, matchIndex: number): string {
  // Eşleşmenin öncesinde ve sonrasında cümle sınırlarını bul (nokta, yeni satır vb.)
  const lookBehindStart = Math.max(0, matchIndex - 120);
  const lookAheadEnd = Math.min(text.length, matchIndex + 180);

  const beforeText = text.substring(lookBehindStart, matchIndex);
  const afterText = text.substring(matchIndex, lookAheadEnd);

  // Cümle başı
  const lastDotBefore = Math.max(
    beforeText.lastIndexOf('. '),
    beforeText.lastIndexOf('.\n'),
    beforeText.lastIndexOf('\n')
  );
  const sentenceStart = lastDotBefore !== -1 ? lookBehindStart + lastDotBefore + 2 : lookBehindStart;

  // Cümle sonu
  const firstDotAfter = afterText.indexOf('. ');
  const firstNewlineAfter = afterText.indexOf('\n');
  let cutOffset = afterText.length;
  if (firstDotAfter !== -1 && firstNewlineAfter !== -1) {
    cutOffset = Math.min(firstDotAfter, firstNewlineAfter);
  } else if (firstDotAfter !== -1) {
    cutOffset = firstDotAfter;
  } else if (firstNewlineAfter !== -1) {
    cutOffset = firstNewlineAfter;
  }

  const sentenceEnd = matchIndex + cutOffset + (afterText[cutOffset] === '.' ? 1 : 0);
  const rawQuote = text.substring(sentenceStart, sentenceEnd).trim().replace(/\s+/g, ' ');

  // Eğer alıntı çok kısaysa genişlet
  if (rawQuote.length < 30) {
    const fallbackStart = Math.max(0, matchIndex - 40);
    const fallbackEnd = Math.min(text.length, matchIndex + 120);
    return text.substring(fallbackStart, fallbackEnd).trim().replace(/\s+/g, ' ');
  }

  return rawQuote.length > 250 ? rawQuote.substring(0, 247) + '...' : rawQuote;
}

/**
 * Yerel Kural Tabanlı Hukuki Analiz Motoru.
 * Herhangi bir API anahtarı olmadan çalışır.
 */
export function analyzePageTextLocally(
  pageText: string,
  _pageUrl: string
): RiskReport {
  // 1. Prompt Injection Taraması
  const injectionPatterns = detectPromptInjectionPatterns(pageText);
  const injectionDetected = injectionPatterns.length > 0;

  // 2. Kural Eşleştirmesi ve Risk Maddeleri Çıkarma
  const riskItems: RiskItem[] = [];
  let totalScoreWeight = 0;
  const matchedCategories = new Set<string>();

  for (const rule of CLAUSE_RULES) {
    const match = pageText.match(rule.pattern);
    if (match && match.index !== undefined) {
      const quote = extractSentenceQuote(pageText, match.index);
      // verifyQuoteInDom {found, matchType, confidence} döndürür
      const verification = verifyQuoteInDom(quote, pageText);

      riskItems.push({
        category: rule.category,
        title: rule.title,
        simpleExplanationTr: rule.simpleExplanationTr,
        severity: rule.severity,
        exactQuote: quote,
        quoteFoundInDom: verification.found,
      });

      totalScoreWeight += rule.weight;
      matchedCategories.add(rule.category);
    }
  }

  // 3. Prompt Injection Varsa Yüksek Risk Maddesi Olarak Ekle
  if (injectionDetected) {
    riskItems.unshift({
      category: 'Diğer',
      title: 'Prompt Injection Saldırı Vektörü Tespit Edildi',
      simpleExplanationTr: 'Sayfa içeriğinde yapay zekayı aldatmaya yönelik gizli sistem talimatları bulundu.',
      severity: 'YÜKSEK',
      exactQuote: 'Tespit edilen saldırı kalıpları: ' + injectionPatterns.join(', '),
      quoteFoundInDom: true,
    });
    totalScoreWeight += 35;
  }

  // 4. Belirsizlik ve Çelişki Taraması (Muğlaklık Tespiti)
  const unclearClauses: string[] = [];
  let confidenceScore = 0.94;

  const ambiguityPatterns = [
    /olabilir\s+veya\s+olmayabilir/i,
    /henüz\s+oluşturulmamıştır/i,
    /taslak\s*\)/i,
    /belirli\s+durumlarda.*değişiklik\s+gösterebilir/i,
    /uluslararası\s+teamüllere\s+tabidir/i,
  ];

  for (const ambPattern of ambiguityPatterns) {
    const ambMatch = pageText.match(ambPattern);
    if (ambMatch && ambMatch.index !== undefined) {
      const ambQuote = extractSentenceQuote(pageText, ambMatch.index);
      unclearClauses.push(
        `"${ambQuote}" — Bu madde hukuki açıdan belirsiz / net anlaşılamadı.`
      );
    }
  }

  if (unclearClauses.length > 0) {
    confidenceScore = Math.max(0.35, 0.85 - unclearClauses.length * 0.2);
  }

  // 5. Risk Skorunu Normalize Et (0 - 100)
  let calculatedScore = Math.min(100, Math.round(totalScoreWeight * 0.95));
  if (riskItems.length === 0) {
    calculatedScore = 15; // Temiz veya standart sözleşme
  }

  // Risk Seviyesi Belirleme
  let riskLevel: RiskLevel = 'DÜŞÜK';
  if (calculatedScore >= 80 || injectionDetected) {
    riskLevel = 'KRİTİK';
  } else if (calculatedScore >= 60) {
    riskLevel = 'YÜKSEK';
  } else if (calculatedScore >= 30) {
    riskLevel = 'ORTA';
  }

  // 6. Özet Metni Oluşturma
  let summary = '';
  if (injectionDetected) {
    summary = 'Dikkat: Bu sayfada yapay zeka manipülasyonu amaçlayan kötü niyetli prompt injection girişimleri tespit edilmiştir. ';
  }
  if (matchedCategories.size > 0) {
    summary += `Bu sözleşmede ${Array.from(matchedCategories).join(', ')} alanlarında toplam ${riskItems.length} adet dikkat edilmesi gereken riskli madde saptanmıştır.`;
  } else {
    summary = 'Sayfa metninde standart dışı veya tüketici aleyhine ağır bir riskli madde tespit edilmemiştir.';
  }

  // 7. Rapor nesnesini oluştur ve Zod ile doğrula
  const rawReport: RiskReport = {
    riskScore: calculatedScore,
    riskLevel,
    summary,
    disclaimer: 'Bu rapor hukuki tavsiye niteliği taşımaz.',
    riskItems,
    confidenceScore,
    unclearClauses: unclearClauses.length > 0 ? unclearClauses : undefined,
  };

  // Zod şemasıyla doğrula (nesne olarak doğrudan safeParse kullan)
  const validated = RiskReportSchema.safeParse(rawReport);
  if (validated.success) {
    return validated.data as RiskReport;
  }

  // Doğrulama başarısızsa ham raporu döndür (zaten kurallara uygun olmalı)
  console.warn('[ToS Local Engine] Zod doğrulama uyarısı:', validated.error.issues);
  return rawReport;
}
