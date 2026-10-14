// ============================================================
// src/background/service-worker.ts - Background Service Worker
// ============================================================
// Manifest V3 service worker. API isteklerini yönetir,
// content script ile popup arasında köprü görevi görür.

import { analyzePageText } from '../llm/client';
import { analyzePageTextLocally } from '../llm/local-engine';
import { getSettings, saveLastReport, addToHistory } from '../utils/storage';
import type { ExtensionMessage, PageData, RiskItem } from '../types/index';

/**
 * Ana mesaj dinleyicisi.
 */
chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => {
    switch (message.type) {
      case 'ANALYZE_PAGE': {
        handleAnalyzePage(sendResponse);
        return true; // Asenkron yanıt
      }

      case 'GET_SETTINGS': {
        handleGetSettings(sendResponse);
        return true;
      }

      default:
        return false;
    }
  }
);

/**
 * Sayfa analizi akışını yönetir.
 *
 * Akış:
 * 1. Content script'ten sayfa metnini al
 * 2. Yerel motor veya LLM ile analiz et
 * 3. Sonuçları content script'e göndererek alıntıları doğrula
 * 4. Final raporu sakla ve popup'a gönder
 */
async function handleAnalyzePage(
  sendResponse: (response: unknown) => void
): Promise<void> {
  try {
    // Adım 1: Önce ayarları kontrol et
    broadcastProgress('Ayarlar kontrol ediliyor...', 5);
    const settings = await getSettings();

    // Yerel motor kullanılacaksa API anahtarı gerekmez
    const isLocalMode = settings.provider === 'local' || !settings.apiKey;

    // Harici LLM kullanılacaksa API anahtarı zorunlu
    if (!isLocalMode && !settings.apiKey) {
      sendResponse({
        success: false,
        error: 'API anahtarı ayarlanmamış. Lütfen Ayarlar (sağ üstteki dişli simgesi) sayfasından API anahtarınızı girin veya Yerel Analiz Motoru seçin.',
      });
      return;
    }

    // Adım 2: Aktif sekmeyi kontrol et
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];

    if (!activeTab?.id) {
      sendResponse({ success: false, error: 'Aktif sekme bulunamadı.' });
      return;
    }

    const tabUrl = activeTab.url || '';

    // Sistem sayfalarında content script çalışamaz
    if (
      tabUrl.startsWith('chrome://') ||
      tabUrl.startsWith('chrome-extension://') ||
      tabUrl.startsWith('edge://') ||
      tabUrl.startsWith('about:') ||
      tabUrl.startsWith('view-source:')
    ) {
      sendResponse({
        success: false,
        error: 'Bu eklenti tarayıcı sistem sayfalarında (chrome:// vb.) çalışamaz. Lütfen analiz etmek istediğiniz bir web sitesini (ör. Kullanım Koşulları veya Gizlilik Politikası) açın.',
      });
      return;
    }

    // Yerel dosya (file://) kontrolü
    if (tabUrl.startsWith('file://')) {
      const isFileAllowed = await new Promise<boolean>((resolve) => {
        if (chrome.extension?.isAllowedFileSchemeAccess) {
          chrome.extension.isAllowedFileSchemeAccess(resolve);
        } else {
          resolve(true);
        }
      });

      if (!isFileAllowed) {
        sendResponse({
          success: false,
          error: 'Yerel HTML dosyalarını (file://) analiz edebilmek için: chrome://extensions sayfasına gidin, ToS Risk Analyzer detaylarına tıklayın ve "Dosya URL\'lerine erişime izin ver" (Allow access to file URLs) seçeneğini açın.',
        });
        return;
      }
    }

    broadcastProgress('Sayfa metni alınıyor...', 15);

    // Content script'in yüklü olduğundan emin ol
    try {
      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ['content/content-script.js'],
      });
      await new Promise((r) => setTimeout(r, 100));
    } catch (injectErr) {
      console.warn('[ToS Risk Analyzer] Script enjeksiyon uyarısı:', injectErr);
    }

    let pageTextResult: {
      success: boolean;
      pageData?: PageData;
      rawDomText?: string;
      error?: string;
    };

    try {
      pageTextResult = await sendMessageToTab<{
        success: boolean;
        pageData?: PageData;
        rawDomText?: string;
        error?: string;
      }>(activeTab.id, { type: 'GET_PAGE_TEXT' });
    } catch (tabMsgErr) {
      sendResponse({
        success: false,
        error: 'Sayfa içeriğine erişilemedi. Lütfen analiz etmek istediğiniz sekmeyi yenileyin (F5) ve eklentiyi tekrar açın.',
      });
      return;
    }

    if (!pageTextResult.success || !pageTextResult.pageData) {
      sendResponse({
        success: false,
        error: pageTextResult.error || 'Sayfa metni alınamadı.',
      });
      return;
    }

    // Adım 3: Analiz (Yerel Motor veya Harici LLM)
    let finalReport;
    let promptInjectionDetected = false;
    let detectedPatterns: string[] = [];

    if (isLocalMode) {
      // ---- YEREL MOTOR: API anahtarı gerektirmez ----
      broadcastProgress('Yerel analiz motoru çalıştırılıyor...', 40);

      const localReport = analyzePageTextLocally(
        pageTextResult.pageData.rawText,
        pageTextResult.pageData.url
      );

      broadcastProgress('Risk maddeleri değerlendiriliyor...', 70);

      // Prompt injection tespiti
      const { detectPromptInjectionPatterns } = await import('../llm/prompt-builder');
      detectedPatterns = detectPromptInjectionPatterns(pageTextResult.pageData.rawText);
      promptInjectionDetected = detectedPatterns.length > 0;

      finalReport = localReport;

    } else {
      // ---- HARİCİ LLM API ----
      const analysisResult = await analyzePageText(
        pageTextResult.pageData.rawText,
        pageTextResult.pageData.url,
        settings,
        (step, percentage) => broadcastProgress(step, percentage)
      );

      if (!analysisResult.success || !analysisResult.report) {
        sendResponse({
          success: false,
          error: analysisResult.error || 'Analiz başarısız.',
          rawResponse: analysisResult.rawResponse,
        });
        return;
      }

      promptInjectionDetected = analysisResult.promptInjectionDetected || false;
      detectedPatterns = analysisResult.detectedPatterns || [];
      finalReport = analysisResult.report;
    }

    // Adım 4: Alıntıları content script'te doğrula (DOM erişimi için)
    broadcastProgress('DOM alıntıları doğrulanıyor...', 88);

    try {
      const quoteResult = await sendMessageToTab<{
        success: boolean;
        verifiedItems?: RiskItem[];
        error?: string;
      }>(activeTab.id, {
        type: 'VERIFY_QUOTES',
        payload: finalReport.riskItems,
      });

      if (quoteResult.success && quoteResult.verifiedItems) {
        finalReport = {
          ...finalReport,
          riskItems: quoteResult.verifiedItems,
        };
      }
    } catch {
      // Doğrulama başarısız olursa orijinal sonuçları kullan
      console.warn('[ToS Risk Analyzer] DOM alıntı doğrulama atlandı');
    }

    // Adım 5: Raporu sakla
    await saveLastReport(finalReport, pageTextResult.pageData.url);
    await addToHistory(finalReport, pageTextResult.pageData.url);

    broadcastProgress('Analiz tamamlandı!', 100);

    sendResponse({
      success: true,
      report: finalReport,
      pageData: pageTextResult.pageData,
      promptInjectionDetected,
      detectedPatterns,
    });
  } catch (error) {
    sendResponse({
      success: false,
      error: `Analiz hatası: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

/**
 * Ayarları döndürür.
 */
async function handleGetSettings(sendResponse: (response: unknown) => void): Promise<void> {
  try {
    const settings = await getSettings();
    sendResponse({ success: true, settings });
  } catch (error) {
    sendResponse({
      success: false,
      error: `Ayar okuma hatası: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

/**
 * Belirli bir sekmeye mesaj gönder.
 */
function sendMessageToTab<T>(
  tabId: number,
  message: ExtensionMessage
): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response as T);
    });
  });
}

/**
 * İlerleme güncellemesi yayınla (popup'a).
 */
function broadcastProgress(step: string, percentage: number): void {
  chrome.runtime.sendMessage({
    type: 'ANALYSIS_PROGRESS',
    payload: { step, percentage },
  }).catch(() => {
    // Popup kapalıysa görmezden gel
  });
}

// Service worker yüklendiğinde log
console.log('[ToS Risk Analyzer] Service worker başlatıldı');
