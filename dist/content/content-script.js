(function () {
  'use strict';

  function detectPageType(url, title, text) {
    const combined = `${url} ${title} ${text.substring(0, 2e3)}`.toLowerCase();
    const tosPatterns = [
      "terms of service",
      "terms of use",
      "terms and conditions",
      "kullanım koşulları",
      "kullanım şartları",
      "hizmet şartları",
      "kullanim kosullari",
      "terms & conditions"
    ];
    const privacyPatterns = [
      "privacy policy",
      "privacy notice",
      "data protection",
      "gizlilik politikası",
      "gizlilik sözleşmesi",
      "kişisel veri",
      "gizlilik bildirimi",
      "veri koruma"
    ];
    const subscriptionPatterns = [
      "subscription",
      "billing",
      "payment terms",
      "refund policy",
      "abonelik",
      "ödeme koşulları",
      "fatura",
      "ücretlendirme",
      "satış sözleşmesi",
      "mesafeli satış"
    ];
    for (const pattern of tosPatterns) {
      if (combined.includes(pattern)) return "tos";
    }
    for (const pattern of privacyPatterns) {
      if (combined.includes(pattern)) return "privacy";
    }
    for (const pattern of subscriptionPatterns) {
      if (combined.includes(pattern)) return "subscription";
    }
    return "unknown";
  }
  function extractMainContent() {
    const noiseSelectors = [
      "nav",
      "header",
      "footer",
      '[role="navigation"]',
      '[role="banner"]',
      '[role="contentinfo"]',
      ".cookie-banner",
      ".cookie-notice",
      "#cookie-consent",
      ".advertisement",
      ".ad-container",
      '[class*="ad-"]',
      "script",
      "style",
      "noscript",
      "iframe",
      ".social-share",
      ".share-buttons",
      "#comments",
      ".comments-section"
    ];
    const contentSelectors = [
      "main",
      "article",
      '[role="main"]',
      ".content",
      "#content",
      ".main-content",
      "#main-content",
      ".terms-content",
      ".privacy-content",
      ".legal-content",
      ".policy-content",
      ".entry-content",
      ".post-content"
    ];
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent && element.textContent.trim().length > 500) {
        return cleanText(element.textContent);
      }
    }
    const clonedBody = document.body.cloneNode(true);
    for (const selector of noiseSelectors) {
      const noiseElements = clonedBody.querySelectorAll(selector);
      noiseElements.forEach((el) => el.remove());
    }
    return cleanText(clonedBody.textContent || "");
  }
  function cleanText(text) {
    return text.replace(/\t/g, " ").replace(/ {2,}/g, " ").replace(/\n{3,}/g, "\n\n").split("\n").map((line) => line.trim()).filter((line) => line.length > 0).join("\n").trim();
  }
  function getRawDomText() {
    return document.body.innerText || "";
  }
  function extractPageData() {
    const rawText = extractMainContent();
    const url = window.location.href;
    const title = document.title;
    return {
      url,
      title,
      rawText,
      pageType: detectPageType(url, title, rawText),
      extractedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  function isPageAnalyzable() {
    const text = document.body.innerText || "";
    return text.trim().length >= 200;
  }

  function normalizeText(text) {
    return text.replace(/\s+/g, " ").replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/[""]/g, '"').replace(/['']/g, "'").replace(/[\u2013\u2014]/g, "-").replace(/\u2026/g, "...").trim().toLowerCase();
  }
  function verifyQuoteInDom(quote, domText) {
    if (!quote || !domText) {
      return { found: false, matchType: "none", confidence: 0 };
    }
    const normalizedQuote = normalizeText(quote);
    const normalizedDom = normalizeText(domText);
    if (normalizedDom.includes(normalizedQuote)) {
      return { found: true, matchType: "exact", confidence: 1 };
    }
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
        return { found: true, matchType: "normalized", confidence: matchRatio };
      }
      if (matchRatio >= 0.7) {
        return { found: true, matchType: "partial", confidence: matchRatio };
      }
    }
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
        return { found: true, matchType: "partial", confidence: segmentRatio * 0.85 };
      }
    }
    return { found: false, matchType: "none", confidence: 0 };
  }
  function splitIntoSegments(text, count) {
    const words = text.split(/\s+/);
    const segmentSize = Math.ceil(words.length / count);
    const segments = [];
    for (let i = 0; i < words.length; i += segmentSize) {
      segments.push(words.slice(i, i + segmentSize).join(" "));
    }
    return segments;
  }

  function verifyQuotesInPage(riskItems) {
    const domText = getRawDomText();
    if (!domText || domText.trim().length === 0) {
      return riskItems.map((item) => ({
        ...item,
        quoteFoundInDom: false
      }));
    }
    return riskItems.map((item) => {
      const result = verifyQuoteInDom(item.exactQuote, domText);
      return {
        ...item,
        quoteFoundInDom: result.found,
        // Doğrulanamayan alıntıları işaretle
        ...result.found ? {} : {
          exactQuote: `[DOĞRULANAMAYAN ALINTI - Güven: ${(result.confidence * 100).toFixed(0)}%] ${item.exactQuote}`
        }
      };
    });
  }

  chrome.runtime.onMessage.addListener(
    (message, _sender, sendResponse) => {
      switch (message.type) {
        case "GET_PAGE_TEXT": {
          handleGetPageText(sendResponse);
          return true;
        }
        case "VERIFY_QUOTES": {
          const riskItems = message.payload;
          handleVerifyQuotes(riskItems, sendResponse);
          return true;
        }
        default:
          return false;
      }
    }
  );
  function handleGetPageText(sendResponse) {
    try {
      if (!isPageAnalyzable()) {
        sendResponse({
          success: false,
          error: "Sayfa analiz için yeterli metin içermiyor (minimum 200 karakter gerekli)."
        });
        return;
      }
      const pageData = extractPageData();
      const rawDomText = getRawDomText();
      sendResponse({
        success: true,
        pageData,
        rawDomText
      });
    } catch (error) {
      sendResponse({
        success: false,
        error: `DOM okuma hatası: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }
  function handleVerifyQuotes(riskItems, sendResponse) {
    try {
      const verifiedItems = verifyQuotesInPage(riskItems);
      sendResponse({
        success: true,
        verifiedItems
      });
    } catch (error) {
      sendResponse({
        success: false,
        error: `Alıntı doğrulama hatası: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }
  console.log("[ToS Risk Analyzer] Content script yüklendi:", window.location.href);

})();
//# sourceMappingURL=content-script.js.map
