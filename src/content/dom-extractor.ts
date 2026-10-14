// ============================================================
// src/content/dom-extractor.ts - DOM İçerik Çıkarma Modülü
// ============================================================
// Alibaba Page Agent'ın DOM dehydration mantığından esinlenerek
// sayfa metnini yapılandırılmış şekilde çıkarır.

import type { PageData } from '../types/index';

/**
 * Sayfanın tipini URL ve başlıktan tespit eder.
 */
function detectPageType(url: string, title: string, text: string): PageData['pageType'] {
  const combined = `${url} ${title} ${text.substring(0, 2000)}`.toLowerCase();

  const tosPatterns = [
    'terms of service', 'terms of use', 'terms and conditions',
    'kullanım koşulları', 'kullanım şartları', 'hizmet şartları',
    'kullanim kosullari', 'terms & conditions',
  ];

  const privacyPatterns = [
    'privacy policy', 'privacy notice', 'data protection',
    'gizlilik politikası', 'gizlilik sözleşmesi', 'kişisel veri',
    'gizlilik bildirimi', 'veri koruma',
  ];

  const subscriptionPatterns = [
    'subscription', 'billing', 'payment terms', 'refund policy',
    'abonelik', 'ödeme koşulları', 'fatura', 'ücretlendirme',
    'satış sözleşmesi', 'mesafeli satış',
  ];

  for (const pattern of tosPatterns) {
    if (combined.includes(pattern)) return 'tos';
  }

  for (const pattern of privacyPatterns) {
    if (combined.includes(pattern)) return 'privacy';
  }

  for (const pattern of subscriptionPatterns) {
    if (combined.includes(pattern)) return 'subscription';
  }

  return 'unknown';
}

/**
 * Gereksiz DOM öğelerini temizler ve ana içeriği çıkarır.
 * Page Agent'ın DOM dehydration yaklaşımından esinlenilmiştir.
 */
function extractMainContent(): string {
  // Kaldırılacak seçiciler (navigasyon, footer, sidebar vb.)
  const noiseSelectors = [
    'nav', 'header', 'footer',
    '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
    '.cookie-banner', '.cookie-notice', '#cookie-consent',
    '.advertisement', '.ad-container', '[class*="ad-"]',
    'script', 'style', 'noscript', 'iframe',
    '.social-share', '.share-buttons',
    '#comments', '.comments-section',
  ];

  // Ana içerik aday seçicileri (öncelik sırasına göre)
  const contentSelectors = [
    'main', 'article',
    '[role="main"]',
    '.content', '#content',
    '.main-content', '#main-content',
    '.terms-content', '.privacy-content',
    '.legal-content', '.policy-content',
    '.entry-content', '.post-content',
  ];

  // Önce ana içerik alanını bulmayı dene
  for (const selector of contentSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent && element.textContent.trim().length > 500) {
      return cleanText(element.textContent);
    }
  }

  // Ana içerik bulunamazsa, body'den gürültüyü çıkar
  const clonedBody = document.body.cloneNode(true) as HTMLElement;

  for (const selector of noiseSelectors) {
    const noiseElements = clonedBody.querySelectorAll(selector);
    noiseElements.forEach((el) => el.remove());
  }

  return cleanText(clonedBody.textContent || '');
}

/**
 * Metni temizler ve normalleştirir.
 */
function cleanText(text: string): string {
  return text
    .replace(/\t/g, ' ')
    .replace(/ {2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n')
    .trim();
}

/**
 * Sayfanın ham DOM metnini döndürür (alıntı doğrulama için).
 */
export function getRawDomText(): string {
  return document.body.innerText || '';
}

/**
 * Tam sayfa verisini çıkarır.
 */
export function extractPageData(): PageData {
  const rawText = extractMainContent();
  const url = window.location.href;
  const title = document.title;

  return {
    url,
    title,
    rawText,
    pageType: detectPageType(url, title, rawText),
    extractedAt: new Date().toISOString(),
  };
}

/**
 * Sayfa metninin analiz için yeterli olup olmadığını kontrol eder.
 */
export function isPageAnalyzable(): boolean {
  const text = document.body.innerText || '';
  // En az 200 karakter metin olmalı
  return text.trim().length >= 200;
}
