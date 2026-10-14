// ============================================================
// src/popup/popup.ts - Popup Ana Kontrolcüsü
// ============================================================

import type { RiskReport, RiskItem, ExtensionMessage } from '../types/index';

// ---- DOM Elementleri ----
const elements = {
  // Durum konteynerleri
  initialState: document.getElementById('initialState')!,
  loadingState: document.getElementById('loadingState')!,
  errorState: document.getElementById('errorState')!,
  reportState: document.getElementById('reportState')!,

  // Butonlar
  analyzeBtn: document.getElementById('analyzeBtn')!,
  settingsBtn: document.getElementById('settingsBtn')!,
  retryBtn: document.getElementById('retryBtn')!,
  reAnalyzeBtn: document.getElementById('reAnalyzeBtn')!,

  // Yükleniyor
  loaderPercentage: document.getElementById('loaderPercentage')!,
  loadingStep: document.getElementById('loadingStep')!,
  progressBar: document.getElementById('progressBar') as HTMLDivElement,

  // Hata
  errorMessage: document.getElementById('errorMessage')!,

  // Rapor
  riskScoreCard: document.getElementById('riskScoreCard')!,
  scoreFill: document.getElementById('scoreFill') as unknown as SVGCircleElement,
  scoreValue: document.getElementById('scoreValue')!,
  riskLevelBadge: document.getElementById('riskLevelBadge')!,
  riskSummary: document.getElementById('riskSummary')!,
  confidenceFill: document.getElementById('confidenceFill') as HTMLDivElement,
  confidenceValue: document.getElementById('confidenceValue')!,
  injectionWarning: document.getElementById('injectionWarning')!,
  injectionDetails: document.getElementById('injectionDetails')!,
  itemCount: document.getElementById('itemCount')!,
  categoryFilters: document.getElementById('categoryFilters')!,
  riskItemsList: document.getElementById('riskItemsList')!,
  unclearSection: document.getElementById('unclearSection')!,
  unclearList: document.getElementById('unclearList')!,
};

// ---- Durum Yönetimi ----
let currentReport: RiskReport | null = null;
let currentFilter: string = 'all';

// ---- Durum Geçişleri ----
function showState(state: 'initial' | 'loading' | 'error' | 'report'): void {
  elements.initialState.classList.toggle('hidden', state !== 'initial');
  elements.loadingState.classList.toggle('hidden', state !== 'loading');
  elements.errorState.classList.toggle('hidden', state !== 'error');
  elements.reportState.classList.toggle('hidden', state !== 'report');
}

function showError(message: string): void {
  elements.errorMessage.textContent = message;
  showState('error');
}

function updateProgress(step: string, percentage: number): void {
  elements.loaderPercentage.textContent = `${percentage}%`;
  elements.loadingStep.textContent = step;
  elements.progressBar.style.width = `${percentage}%`;
}

// ---- Analiz Başlatma ----
async function startAnalysis(): Promise<void> {
  showState('loading');
  updateProgress('Analiz başlatılıyor...', 0);

  try {
    const response = await sendMessage<{
      success: boolean;
      report?: RiskReport;
      error?: string;
      promptInjectionDetected?: boolean;
      detectedPatterns?: string[];
    }>('ANALYZE_PAGE');

    if (response.success && response.report) {
      currentReport = response.report;
      renderReport(response.report, response.promptInjectionDetected, response.detectedPatterns);
      showState('report');
    } else {
      showError(response.error || 'Bilinmeyen bir hata oluştu.');
    }
  } catch (error) {
    showError(
      error instanceof Error ? error.message : 'Bağlantı hatası. Lütfen tekrar deneyin.'
    );
  }
}

// ---- Rapor Render'lama ----
function renderReport(
  report: RiskReport,
  injectionDetected?: boolean,
  detectedPatterns?: string[]
): void {
  // Risk skoru animasyonu
  const circumference = 2 * Math.PI * 52; // r=52
  const offset = circumference - (report.riskScore / 100) * circumference;
  const scoreColor = getScoreColor(report.riskScore);

  elements.scoreFill.style.stroke = scoreColor;
  elements.scoreValue.style.color = scoreColor;

  // Animasyonlu sayı gösterimi
  animateNumber(elements.scoreValue, 0, report.riskScore, 1500);

  // SVG circle animasyonu
  setTimeout(() => {
    elements.scoreFill.style.strokeDashoffset = String(offset);
  }, 100);

  // Risk seviyesi badge'i
  elements.riskLevelBadge.textContent = report.riskLevel;
  elements.riskLevelBadge.className = `risk-level-badge ${getRiskLevelClass(report.riskLevel)}`;

  // Özet
  elements.riskSummary.textContent = report.summary;

  // Güven skoru
  const confidencePercent = Math.round(report.confidenceScore * 100);
  elements.confidenceFill.style.width = `${confidencePercent}%`;
  elements.confidenceValue.textContent = `${confidencePercent}%`;

  // Prompt injection uyarısı
  if (injectionDetected) {
    elements.injectionWarning.classList.remove('hidden');
    elements.injectionDetails.textContent =
      `Tespit edilen kalıplar: ${detectedPatterns?.join(', ') || 'Bilinmeyen'}`;
  } else {
    elements.injectionWarning.classList.add('hidden');
  }

  // Risk maddeleri
  elements.itemCount.textContent = String(report.riskItems.length);
  renderRiskItems(report.riskItems);

  // Belirsiz maddeler
  if (report.unclearClauses && report.unclearClauses.length > 0) {
    elements.unclearSection.classList.remove('hidden');
    elements.unclearList.innerHTML = report.unclearClauses
      .map((clause) => `<li>${escapeHtml(clause)}</li>`)
      .join('');
  } else {
    elements.unclearSection.classList.add('hidden');
  }
}

function renderRiskItems(items: RiskItem[], filter: string = 'all'): void {
  const filtered =
    filter === 'all' ? items : items.filter((item) => item.category === filter);

  elements.riskItemsList.innerHTML = filtered
    .map(
      (item, index) => `
      <div class="risk-item" data-index="${index}" onclick="this.classList.toggle('expanded')">
        <div class="risk-item-header">
          <div class="severity-dot ${getSeverityClass(item.severity)}"></div>
          <div class="risk-item-content">
            <div class="risk-item-title">${escapeHtml(item.title)}</div>
            <div class="risk-item-category">${escapeHtml(item.category)}</div>
          </div>
          <span class="severity-badge ${getSeverityClass(item.severity)}">${item.severity}</span>
        </div>
        <div class="risk-item-details">
          <p class="risk-item-explanation">${escapeHtml(item.simpleExplanationTr)}</p>
          <blockquote class="risk-item-quote ${item.quoteFoundInDom ? '' : 'unverified'}">
            "${escapeHtml(item.exactQuote)}"
            <div class="quote-status ${item.quoteFoundInDom ? 'verified' : 'unverified'}">
              ${item.quoteFoundInDom
                ? '✓ Alıntı DOM\'da doğrulandı'
                : '✗ Alıntı doğrulanamadı — geçersiz alıntı olabilir'}
            </div>
          </blockquote>
        </div>
      </div>
    `
    )
    .join('');
}

// ---- Yardımcı Fonksiyonlar ----
function getScoreColor(score: number): string {
  if (score <= 25) return '#22c55e';
  if (score <= 50) return '#f59e0b';
  if (score <= 75) return '#ef4444';
  return '#dc2626';
}

function getRiskLevelClass(level: string): string {
  switch (level) {
    case 'DÜŞÜK': return 'low';
    case 'ORTA': return 'medium';
    case 'YÜKSEK': return 'high';
    case 'KRİTİK': return 'critical';
    default: return '';
  }
}

function getSeverityClass(severity: string): string {
  switch (severity) {
    case 'DÜŞÜK': return 'low';
    case 'ORTA': return 'medium';
    case 'YÜKSEK': return 'high';
    default: return '';
  }
}

function animateNumber(element: HTMLElement, start: number, end: number, duration: number): void {
  const startTime = performance.now();

  function update(currentTime: number): void {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + (end - start) * eased);

    element.textContent = String(current);

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function sendMessage<T>(type: string, payload?: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response as T);
    });
  });
}

// ---- Olay Dinleyicileri ----

// Analiz butonu
elements.analyzeBtn.addEventListener('click', startAnalysis);

// Tekrar dene butonu
elements.retryBtn.addEventListener('click', startAnalysis);

// Yeniden analiz butonu
elements.reAnalyzeBtn.addEventListener('click', startAnalysis);

// Ayarlar butonu
elements.settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Kategori filtreleri
elements.categoryFilters.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (!target.classList.contains('filter-btn')) return;

  // Aktif filtre güncelle
  elements.categoryFilters
    .querySelectorAll('.filter-btn')
    .forEach((btn) => btn.classList.remove('active'));
  target.classList.add('active');

  currentFilter = target.dataset.category || 'all';

  if (currentReport) {
    renderRiskItems(currentReport.riskItems, currentFilter);
  }
});

// İlerleme güncellemesi dinle
chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
  if (message.type === 'ANALYSIS_PROGRESS') {
    const { step, percentage } = message.payload as { step: string; percentage: number };
    updateProgress(step, percentage);
  }
});

// Sayfa yüklendiğinde son raporu kontrol et
async function checkLastReport(): Promise<void> {
  try {
    const result = await chrome.storage.local.get('lastReport');
    if (result.lastReport) {
      // Aktif sekmenin URL'sini al
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentUrl = tabs[0]?.url;

      // Son rapor bu sayfa içinse göster
      if (currentUrl && result.lastReport.url === currentUrl) {
        currentReport = result.lastReport.report;
        renderReport(result.lastReport.report);
        showState('report');
        return;
      }
    }
  } catch {
    // Son rapor yoksa başlangıç durumunda kal
  }

  showState('initial');
}

// Başlat
checkLastReport();
