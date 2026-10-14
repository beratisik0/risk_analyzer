// ============================================================
// src/options/options.ts - Ayarlar Sayfası Kontrolcüsü
// ============================================================

import type { UserSettings, LLMProvider } from '../types/index';

// Sağlayıcı modelleri
const PROVIDER_MODELS: Record<LLMProvider, string[]> = {
  local: ['local-rules-v1'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
  gemini: ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
};

// DOM Elementleri
const providerSelect = document.getElementById('provider') as HTMLSelectElement;
const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
const modelSelect = document.getElementById('modelName') as HTMLSelectElement;
const maxTokensInput = document.getElementById('maxTokens') as HTMLInputElement;
const temperatureInput = document.getElementById('temperature') as HTMLInputElement;
const tempValueSpan = document.getElementById('tempValue')!;
const toggleApiKeyBtn = document.getElementById('toggleApiKey')!;
const saveBtn = document.getElementById('saveBtn')!;
const clearBtn = document.getElementById('clearBtn')!;
const statusMessage = document.getElementById('statusMessage')!;

// API anahtarı alanını içeren form-group
const apiKeyGroup = apiKeyInput.closest('.form-group') as HTMLElement | null;

/**
 * Model listesini günceller.
 */
function updateModelList(provider: LLMProvider, selectedModel?: string): void {
  const models = PROVIDER_MODELS[provider] || [];
  modelSelect.innerHTML = models
    .map((model) => `<option value="${model}" ${model === selectedModel ? 'selected' : ''}>${model}</option>`)
    .join('');
}

/**
 * Yerel motor seçildiğinde API anahtarı alanını gizle,
 * diğer sağlayıcılarda göster.
 */
function toggleApiKeyVisibility(provider: LLMProvider): void {
  if (apiKeyGroup) {
    if (provider === 'local') {
      apiKeyGroup.style.display = 'none';
    } else {
      apiKeyGroup.style.display = '';
    }
  }
}

/**
 * Kayıtlı ayarları yükler.
 */
async function loadSettings(): Promise<void> {
  const result = await chrome.storage.local.get('settings');
  const settings: UserSettings = result.settings || {
    apiKey: '',
    provider: 'local',
    modelName: 'local-rules-v1',
    maxTokens: 4096,
    temperature: 0.1,
  };

  // Eski/kaldırılan Gemini modelini otomatik olarak en güncel sürüme yükselt
  if (settings.provider === 'gemini' && (settings.modelName === 'gemini-2.0-flash' || !settings.modelName)) {
    settings.modelName = 'gemini-3.8-flash';
    await chrome.storage.local.set({ settings });
  }

  providerSelect.value = settings.provider;
  apiKeyInput.value = settings.apiKey;
  maxTokensInput.value = String(settings.maxTokens);
  temperatureInput.value = String(settings.temperature);
  tempValueSpan.textContent = String(settings.temperature);

  updateModelList(settings.provider, settings.modelName);
  toggleApiKeyVisibility(settings.provider);
}

/**
 * Ayarları kaydeder.
 */
async function saveSettings(): Promise<void> {
  const provider = providerSelect.value as LLMProvider;

  const settings: UserSettings = {
    apiKey: apiKeyInput.value.trim(),
    provider,
    modelName: modelSelect.value,
    maxTokens: parseInt(maxTokensInput.value, 10) || 4096,
    temperature: parseFloat(temperatureInput.value) || 0.1,
  };

  // Doğrulama: Yerel motor hariç API anahtarı zorunlu
  if (provider !== 'local' && !settings.apiKey) {
    showStatus('Lütfen API anahtarınızı girin veya Yerel Analiz Motoru seçin.', 'error');
    return;
  }

  await chrome.storage.local.set({ settings });
  showStatus('Ayarlar başarıyla kaydedildi! ✓', 'success');
}

/**
 * Tüm verileri temizler.
 */
async function clearAllData(): Promise<void> {
  if (!confirm('Tüm ayarlar, raporlar ve geçmiş silinecektir. Devam etmek istiyor musunuz?')) {
    return;
  }

  await chrome.storage.local.clear();
  apiKeyInput.value = '';
  providerSelect.value = 'local';
  updateModelList('local');
  toggleApiKeyVisibility('local');
  maxTokensInput.value = '4096';
  temperatureInput.value = '0.1';
  tempValueSpan.textContent = '0.1';

  showStatus('Tüm veriler temizlendi.', 'success');
}

/**
 * Durum mesajı gösterir.
 */
function showStatus(message: string, type: 'success' | 'error'): void {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.classList.remove('hidden');

  setTimeout(() => {
    statusMessage.classList.add('hidden');
  }, 3000);
}

// ---- Olay Dinleyicileri ----

providerSelect.addEventListener('change', () => {
  const provider = providerSelect.value as LLMProvider;
  updateModelList(provider);
  toggleApiKeyVisibility(provider);

  // Placeholder güncelle
  const placeholders: Record<LLMProvider, string> = {
    local: '',
    openai: 'sk-...',
    anthropic: 'sk-ant-...',
    gemini: 'AIza...',
  };
  apiKeyInput.placeholder = placeholders[provider] || '';
});

temperatureInput.addEventListener('input', () => {
  tempValueSpan.textContent = temperatureInput.value;
});

toggleApiKeyBtn.addEventListener('click', () => {
  apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
});

saveBtn.addEventListener('click', saveSettings);
clearBtn.addEventListener('click', clearAllData);

// Sayfa yüklendiğinde ayarları yükle
loadSettings();
