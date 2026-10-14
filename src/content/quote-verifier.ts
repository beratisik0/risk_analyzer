// ============================================================
// src/content/quote-verifier.ts - İçerik Taraflı Alıntı Doğrulama
// ============================================================

import { verifyQuoteInDom } from '../validator/dom-search';
import { getRawDomText } from './dom-extractor';
import type { RiskItem } from '../types/index';

/**
 * Content script tarafında çalışan alıntı doğrulama servisi.
 * DOM'a doğrudan erişimi olduğu için en güvenilir doğrulamayı yapar.
 */
export function verifyQuotesInPage(
  riskItems: RiskItem[]
): RiskItem[] {
  const domText = getRawDomText();

  if (!domText || domText.trim().length === 0) {
    // DOM metni alınamadıysa tüm alıntıları doğrulanamaz olarak işaretle
    return riskItems.map((item) => ({
      ...item,
      quoteFoundInDom: false,
    }));
  }

  return riskItems.map((item) => {
    const result = verifyQuoteInDom(item.exactQuote, domText);

    return {
      ...item,
      quoteFoundInDom: result.found,
      // Doğrulanamayan alıntıları işaretle
      ...(result.found
        ? {}
        : {
            exactQuote: `[DOĞRULANAMAYAN ALINTI - Güven: ${(result.confidence * 100).toFixed(0)}%] ${item.exactQuote}`,
          }),
    };
  });
}

/**
 * Tek bir alıntının DOM'da bulunup bulunmadığını kontrol eder.
 */
export function verifySingleQuote(quote: string): {
  found: boolean;
  matchType: string;
  confidence: number;
} {
  const domText = getRawDomText();
  return verifyQuoteInDom(quote, domText);
}
