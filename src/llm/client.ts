// ============================================================
// src/llm/client.ts - LLM API İstemcisi
// ============================================================

import type { UserSettings, RiskReport } from '../types/index';
import { PROVIDERS, getApiUrl } from './providers';
import { buildSystemPrompt, buildUserPrompt, detectPromptInjectionPatterns } from './prompt-builder';
import { parseAndValidateReport, enforceDisclaimer } from '../validator/schema';
import { filterUnverifiedQuotes } from '../validator/dom-search';

export interface AnalysisResult {
  success: boolean;
  report?: RiskReport;
  error?: string;
  promptInjectionDetected?: boolean;
  detectedPatterns?: string[];
  rawResponse?: string;
}

/**
 * Sayfa metnini analiz eder ve doğrulanmış risk raporu döndürür.
 *
 * İşlem akışı:
 * 1. Prompt injection kalıplarını tara
 * 2. Güvenli prompt oluştur (XML delimiter'lar ile)
 * 3. LLM API'sine istek gönder
 * 4. Yanıtı JSON olarak parse et
 * 5. Zod şemasıyla doğrula
 * 6. DOM alıntılarını doğrula (anti-halüsinasyon)
 * 7. Feragatnameyi zorla
 */
export async function analyzePageText(
  pageText: string,
  pageUrl: string,
  settings: UserSettings,
  onProgress?: (step: string, percentage: number) => void
): Promise<AnalysisResult> {
  if (settings.provider === 'local') {
    return { success: false, error: 'Yerel motor bu istemci üzerinden çalışmaz. service-worker.ts tarafından yönetilir.' };
  }

  const provider = PROVIDERS[settings.provider];

  if (!provider) {
    return { success: false, error: `Desteklenmeyen sağlayıcı: ${settings.provider}` };
  }

  if (!settings.apiKey) {
    return { success: false, error: 'API anahtarı ayarlanmamış. Lütfen Ayarlar sayfasından API anahtarınızı girin.' };
  }

  try {
    // Adım 1: Prompt injection taraması
    onProgress?.('Güvenlik taraması yapılıyor...', 10);
    const injectionPatterns = detectPromptInjectionPatterns(pageText);
    const promptInjectionDetected = injectionPatterns.length > 0;

    // Adım 2: Prompt oluşturma
    onProgress?.('Analiz promptu hazırlanıyor...', 20);
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(pageText, pageUrl);

    // Adım 3: API isteği
    onProgress?.('LLM analizi çalıştırılıyor...', 40);
    const apiUrl = getApiUrl(settings.provider, settings.apiKey, settings.modelName);
    const headers = provider.headers(settings.apiKey);
    const body = provider.buildBody(
      settings.modelName,
      systemPrompt,
      userPrompt,
      settings.maxTokens,
      settings.temperature
    );

    // Gemini için özel body temizliği
    let requestBody = body;
    if (settings.provider === 'gemini') {
      const { _model, ...rest } = body as Record<string, unknown>;
      requestBody = rest;
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `API hatası (${response.status}): ${errorText.substring(0, 500)}`,
      };
    }

    const data = await response.json();

    // Adım 4: Yanıttan metin çıkarma
    onProgress?.('Yanıt ayrıştırılıyor...', 60);
    const rawResponseText = provider.extractResponse(data);

    if (!rawResponseText) {
      return { success: false, error: 'LLM boş yanıt döndürdü.' };
    }

    // Adım 5: Zod doğrulama
    onProgress?.('Şema doğrulaması yapılıyor...', 70);
    const validationResult = parseAndValidateReport(rawResponseText);

    if (!validationResult.success || !validationResult.data) {
      const errorDetails = validationResult.rawParseError
        || validationResult.errors?.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
        || 'Bilinmeyen doğrulama hatası';

      return {
        success: false,
        error: `Yanıt doğrulama hatası: ${errorDetails}`,
        rawResponse: rawResponseText.substring(0, 1000),
      };
    }

    // Adım 6: DOM alıntı doğrulama (anti-halüsinasyon)
    onProgress?.('Alıntılar doğrulanıyor...', 85);
    const verifiedItems = filterUnverifiedQuotes(validationResult.data.riskItems, pageText);

    // Doğrulanmış ve doğrulanamamış maddeleri ayır
    const confirmedItems = verifiedItems.filter((item) => item.quoteFoundInDom);
    const unverifiedItems = verifiedItems.filter((item) => !item.quoteFoundInDom);

    // Adım 7: Final rapor oluştur
    onProgress?.('Rapor tamamlanıyor...', 95);
    let finalReport: RiskReport = {
      ...validationResult.data,
      riskItems: [
        ...confirmedItems,
        // Doğrulanamayan maddeleri de dahil et ama işaretle
        ...unverifiedItems,
      ],
    };

    // Prompt injection tespiti varsa risk skorunu güncelle
    if (promptInjectionDetected) {
      finalReport.riskItems.push({
        category: 'Diğer',
        title: '⚠️ Prompt Injection Saldırı Girişimi Tespit Edildi',
        simpleExplanationTr: `Bu sayfada yapay zeka sistemlerini manipüle etmeye yönelik gizli talimatlar tespit edildi. Bu, sayfanın güvenilirliğini ciddi şekilde sorgulatır. Tespit edilen kalıplar: ${injectionPatterns.join(', ')}`,
        severity: 'YÜKSEK',
        exactQuote: injectionPatterns[0] || '',
        quoteFoundInDom: true,
      });
    }

    // Feragatnameyi zorla
    finalReport = enforceDisclaimer(finalReport);

    onProgress?.('Analiz tamamlandı!', 100);

    return {
      success: true,
      report: finalReport,
      promptInjectionDetected,
      detectedPatterns: injectionPatterns,
      rawResponse: rawResponseText.substring(0, 200),
    };
  } catch (error) {
    return {
      success: false,
      error: `Beklenmeyen hata: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
