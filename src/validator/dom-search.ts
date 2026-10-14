// ============================================================
// src/validator/dom-search.ts - DOM Substring Arama Motoru
// ============================================================

/**
 * Metni normalize eder: fazla boşlukları kaldırır, küçük harfe çevirir.
 */
function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width karakterleri kaldır
    .replace(/[""]/g, '"') // Akıllı tırnak normalleştirme
    .replace(/['']/g, "'")
    .replace(/[\u2013\u2014]/g, '-') // Em/en dash normalleştirme
    .replace(/\u2026/g, '...') // Ellipsis normalleştirme
    .trim()
    .toLowerCase();
}

/**
 * Bir alıntının DOM metninde birebir karşılığını arar.
 *
 * Arama stratejisi:
 * 1. Birebir eşleşme (normalize edilmiş)
 * 2. Esnek eşleşme (kelime bazlı fuzzy substring)
 * 3. Parçalı eşleşme (alıntının %80'inin bulunması)
 *
 * @returns Eşleşme bulunup bulunmadığı ve eşleşme kalitesi
 */
export function verifyQuoteInDom(
  quote: string,
  domText: string
): { found: boolean; matchType: 'exact' | 'normalized' | 'partial' | 'none'; confidence: number } {
  if (!quote || !domText) {
    return { found: false, matchType: 'none', confidence: 0 };
  }

  const normalizedQuote = normalizeText(quote);
  const normalizedDom = normalizeText(domText);

  // Strateji 1: Normalize edilmiş birebir eşleşme
  if (normalizedDom.includes(normalizedQuote)) {
    return { found: true, matchType: 'exact', confidence: 1.0 };
  }

  // Strateji 2: Kelime bazlı esnek eşleşme
  // Alıntıdaki kelimelerin sırayla DOM'da bulunup bulunmadığını kontrol et
  const quoteWords = normalizedQuote.split(/\s+/).filter((w) => w.length > 2);
  const domWords = normalizedDom.split(/\s+/);

  if (quoteWords.length > 0) {
    let matchCount = 0;
    let lastFoundIndex = -1;

    for (const word of quoteWords) {
      const idx = domWords.indexOf(word, lastFoundIndex + 1);
      if (idx !== -1) {
        matchCount++;
        lastFoundIndex = idx;
      }
    }

    const matchRatio = matchCount / quoteWords.length;

    if (matchRatio >= 0.9) {
      return { found: true, matchType: 'normalized', confidence: matchRatio };
    }

    if (matchRatio >= 0.7) {
      return { found: true, matchType: 'partial', confidence: matchRatio };
    }
  }

  // Strateji 3: Parçalı substring arama (uzun alıntıları bölümlere ayır)
  if (normalizedQuote.length > 50) {
    const segments = splitIntoSegments(normalizedQuote, 3);
    let foundSegments = 0;

    for (const segment of segments) {
      if (normalizedDom.includes(segment)) {
        foundSegments++;
      }
    }

    const segmentRatio = foundSegments / segments.length;
    if (segmentRatio >= 0.66) {
      return { found: true, matchType: 'partial', confidence: segmentRatio * 0.85 };
    }
  }

  return { found: false, matchType: 'none', confidence: 0 };
}

/**
 * Metni eşit segmentlere böler.
 */
function splitIntoSegments(text: string, count: number): string[] {
  const words = text.split(/\s+/);
  const segmentSize = Math.ceil(words.length / count);
  const segments: string[] = [];

  for (let i = 0; i < words.length; i += segmentSize) {
    segments.push(words.slice(i, i + segmentSize).join(' '));
  }

  return segments;
}

/**
 * Birden fazla alıntıyı toplu olarak doğrular.
 */
export function verifyAllQuotes(
  quotes: Array<{ index: number; exactQuote: string }>,
  domText: string
): Array<{
  index: number;
  exactQuote: string;
  found: boolean;
  matchType: string;
  confidence: number;
}> {
  return quotes.map(({ index, exactQuote }) => {
    const result = verifyQuoteInDom(exactQuote, domText);
    return {
      index,
      exactQuote,
      ...result,
    };
  });
}

/**
 * Doğrulanamayan alıntıları filtreler veya işaretler.
 * Anti-halüsinasyon katmanı.
 */
export function filterUnverifiedQuotes<
  T extends { exactQuote: string; quoteFoundInDom: boolean }
>(items: T[], domText: string): T[] {
  return items.map((item) => {
    const verification = verifyQuoteInDom(item.exactQuote, domText);

    if (!verification.found) {
      return {
        ...item,
        quoteFoundInDom: false,
        // Alıntıyı "doğrulanamadı" olarak işaretle
        exactQuote: `[DOĞRULANAMAYAN ALINTI] ${item.exactQuote}`,
      };
    }

    return {
      ...item,
      quoteFoundInDom: true,
    };
  });
}
