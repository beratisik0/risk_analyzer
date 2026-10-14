// ============================================================
// src/llm/providers.ts - LLM Sağlayıcı Konfigürasyonları
// ============================================================

import type { LLMProvider } from '../types/index';

export interface ProviderConfig {
  name: string;
  apiUrl: string;
  defaultModel: string;
  availableModels: string[];
  headers: (apiKey: string) => Record<string, string>;
  buildBody: (model: string, systemPrompt: string, userPrompt: string, maxTokens: number, temperature: number) => unknown;
  extractResponse: (data: unknown) => string;
}

const OPENAI_CONFIG: ProviderConfig = {
  name: 'OpenAI',
  apiUrl: 'https://api.openai.com/v1/chat/completions',
  defaultModel: 'gpt-4o',
  availableModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  headers: (apiKey) => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  }),
  buildBody: (model, systemPrompt, userPrompt, maxTokens, temperature) => ({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: maxTokens,
    temperature,
    response_format: { type: 'json_object' },
  }),
  extractResponse: (data: unknown) => {
    const d = data as { choices: Array<{ message: { content: string } }> };
    return d.choices[0]?.message?.content ?? '';
  },
};

const ANTHROPIC_CONFIG: ProviderConfig = {
  name: 'Anthropic',
  apiUrl: 'https://api.anthropic.com/v1/messages',
  defaultModel: 'claude-sonnet-4-20250514',
  availableModels: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
  headers: (apiKey) => ({
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  }),
  buildBody: (model, systemPrompt, userPrompt, maxTokens, temperature) => ({
    model,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    max_tokens: maxTokens,
    temperature,
  }),
  extractResponse: (data: unknown) => {
    const d = data as { content: Array<{ type: string; text: string }> };
    const textBlock = d.content.find((c) => c.type === 'text');
    return textBlock?.text ?? '';
  },
};

const GEMINI_CONFIG: ProviderConfig = {
  name: 'Google Gemini',
  apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
  defaultModel: 'gemini-3.8-flash',
  availableModels: ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  headers: (_apiKey) => ({
    'Content-Type': 'application/json',
  }),
  buildBody: (model, systemPrompt, userPrompt, maxTokens, temperature) => {
    const resolvedModel = model === 'gemini-2.0-flash' ? 'gemini-3.8-flash' : (model || 'gemini-3.8-flash');
    return {
      _model: resolvedModel, // Gemini URL'sine eklenir
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
        },
      ],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
        responseMimeType: 'application/json',
      },
    };
  },
  extractResponse: (data: unknown) => {
    const d = data as {
      candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    };
    return d.candidates[0]?.content?.parts[0]?.text ?? '';
  },
};

export const PROVIDERS: Partial<Record<LLMProvider, ProviderConfig>> = {
  openai: OPENAI_CONFIG,
  anthropic: ANTHROPIC_CONFIG,
  gemini: GEMINI_CONFIG,
  // 'local' sağlayıcısı API kullanmaz, local-engine.ts tarafından yönetilir
};

/**
 * Gemini için tam API URL'si oluştur (model adı URL'de).
 */
export function getApiUrl(provider: LLMProvider, apiKey: string, model: string): string {
  if (provider === 'local') {
    return ''; // Yerel motor API kullanmaz
  }
  if (provider === 'gemini') {
    const resolvedModel = model === 'gemini-2.0-flash' ? 'gemini-3.8-flash' : (model || 'gemini-3.8-flash');
    return `${PROVIDERS.gemini!.apiUrl}/${resolvedModel}:generateContent?key=${apiKey}`;
  }
  return PROVIDERS[provider]?.apiUrl || '';
}
