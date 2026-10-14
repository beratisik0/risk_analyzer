// ============================================================
// src/content/content-script.ts - Content Script Ana Modül
// ============================================================
// Sayfa DOM'una enjekte edilen ana script.
// Page Agent tarzı DOM okuma ve alıntı doğrulama görevlerini yürütür.

import { extractPageData, getRawDomText, isPageAnalyzable } from './dom-extractor';
import { verifyQuotesInPage } from './quote-verifier';
import type { ExtensionMessage, PageData, RiskItem } from '../types/index';

/**
 * Mesaj dinleyicisini kur.
 * Background script'ten gelen taleplere yanıt verir.
 */
chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => {
    switch (message.type) {
      case 'GET_PAGE_TEXT': {
        handleGetPageText(sendResponse);
        return true; // Asenkron yanıt
      }

      case 'VERIFY_QUOTES': {
        const riskItems = message.payload as RiskItem[];
        handleVerifyQuotes(riskItems, sendResponse);
        return true;
      }

      default:
        return false;
    }
  }
);

/**
 * Sayfa metnini çıkarır ve döndürür.
 */
function handleGetPageText(sendResponse: (response: unknown) => void): void {
  try {
    if (!isPageAnalyzable()) {
      sendResponse({
        success: false,
        error: 'Sayfa analiz için yeterli metin içermiyor (minimum 200 karakter gerekli).',
      });
      return;
    }

    const pageData: PageData = extractPageData();
    const rawDomText = getRawDomText();

    sendResponse({
      success: true,
      pageData,
      rawDomText,
    });
  } catch (error) {
    sendResponse({
      success: false,
      error: `DOM okuma hatası: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

/**
 * Risk maddelerindeki alıntıları DOM'da doğrular.
 */
function handleVerifyQuotes(
  riskItems: RiskItem[],
  sendResponse: (response: unknown) => void
): void {
  try {
    const verifiedItems = verifyQuotesInPage(riskItems);

    sendResponse({
      success: true,
      verifiedItems,
    });
  } catch (error) {
    sendResponse({
      success: false,
      error: `Alıntı doğrulama hatası: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

// Content script yüklendiğinde konsola bilgi yaz
console.log('[ToS Risk Analyzer] Content script yüklendi:', window.location.href);
