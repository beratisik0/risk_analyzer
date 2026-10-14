// ============================================================
// src/utils/messaging.ts - Extension İçi Mesajlaşma Katmanı
// ============================================================

import type { ExtensionMessage, MessageType } from '../types/index';

/**
 * Mesaj gönder (background <-> popup <-> content script arası).
 */
export function sendMessage<T = unknown>(
  type: MessageType,
  payload?: unknown
): Promise<T> {
  return new Promise((resolve, reject) => {
    const message: ExtensionMessage = { type, payload };

    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response as T);
    });
  });
}

/**
 * Aktif sekmeye mesaj gönder (background -> content script).
 */
export async function sendMessageToActiveTab<T = unknown>(
  type: MessageType,
  payload?: unknown
): Promise<T> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];

  if (!activeTab?.id) {
    throw new Error('Aktif sekme bulunamadı');
  }

  return new Promise((resolve, reject) => {
    const message: ExtensionMessage = { type, payload };

    chrome.tabs.sendMessage(activeTab.id!, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response as T);
    });
  });
}

/**
 * Mesaj dinleyicisi ekler.
 */
export function onMessage(
  handler: (
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => boolean | void
): void {
  chrome.runtime.onMessage.addListener(handler);
}

/**
 * Popup'a ilerleme güncellemesi gönder.
 */
export function sendProgressUpdate(step: string, percentage: number): void {
  chrome.runtime.sendMessage({
    type: 'ANALYSIS_PROGRESS',
    payload: { step, percentage },
  }).catch(() => {
    // Popup kapalıysa hata görmezden gel
  });
}
