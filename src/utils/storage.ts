// ============================================================
// src/utils/storage.ts - Chrome Storage Yardımcıları
// ============================================================

import type { UserSettings, RiskReport } from '../types/index';

const DEFAULT_SETTINGS: UserSettings = {
  apiKey: '',
  provider: 'local',
  modelName: 'local-rules-v1',
  maxTokens: 4096,
  temperature: 0.1,
};

/**
 * Kullanıcı ayarlarını Chrome storage'dan okur.
 */
export async function getSettings(): Promise<UserSettings> {
  return new Promise((resolve) => {
    chrome.storage.local.get('settings', (result) => {
      let settings: UserSettings = result.settings
        ? { ...DEFAULT_SETTINGS, ...result.settings }
        : DEFAULT_SETTINGS;

      // Eski/kaldırılan Gemini modelini otomatik güncelle
      if (settings.provider === 'gemini' && (settings.modelName === 'gemini-2.0-flash' || !settings.modelName)) {
        settings.modelName = 'gemini-3.8-flash';
        chrome.storage.local.set({ settings });
      }

      resolve(settings);
    });
  });
}

/**
 * Kullanıcı ayarlarını Chrome storage'a kaydeder.
 * API key güvenliği için yalnızca chrome.storage.local kullanılır (sync değil).
 */
export async function saveSettings(settings: UserSettings): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ settings }, resolve);
  });
}

/**
 * Son analiz raporunu saklar.
 */
export async function saveLastReport(report: RiskReport, url: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(
      {
        lastReport: {
          report,
          url,
          timestamp: new Date().toISOString(),
        },
      },
      resolve
    );
  });
}

/**
 * Son analiz raporunu okur.
 */
export async function getLastReport(): Promise<{
  report: RiskReport;
  url: string;
  timestamp: string;
} | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get('lastReport', (result) => {
      resolve(result.lastReport || null);
    });
  });
}

/**
 * Analiz geçmişini saklar (son 20 rapor).
 */
export async function addToHistory(report: RiskReport, url: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.get('history', (result) => {
      const history = result.history || [];
      history.unshift({
        report,
        url,
        timestamp: new Date().toISOString(),
      });

      // Son 20 raporu tut
      const trimmed = history.slice(0, 20);
      chrome.storage.local.set({ history: trimmed }, resolve);
    });
  });
}

/**
 * Tüm verileri temizler.
 */
export async function clearAllData(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.clear(resolve);
  });
}
