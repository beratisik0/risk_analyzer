// ============================================================
// src/types/index.ts - Merkezi Tip Tanımları
// ============================================================

/** LLM sağlayıcı türleri */
export type LLMProvider = 'local' | 'openai' | 'anthropic' | 'gemini';

/** Risk seviyesi */
export type RiskLevel = 'DÜŞÜK' | 'ORTA' | 'YÜKSEK' | 'KRİTİK';

/** Risk maddesi seviyesi */
export type RiskSeverity = 'DÜŞÜK' | 'ORTA' | 'YÜKSEK';

/** Risk kategorisi */
export type RiskCategory =
  | 'Veri Gizliliği'
  | 'Otomatik Yenileme/Ödeme'
  | 'Yargı Yolu/Tahkim'
  | 'Fesih/Değişiklik Hakkı'
  | 'Diğer';

/** Tek bir risk maddesi */
export interface RiskItem {
  category: RiskCategory;
  title: string;
  simpleExplanationTr: string;
  severity: RiskSeverity;
  exactQuote: string;
  quoteFoundInDom: boolean;
}

/** Tam risk raporu */
export interface RiskReport {
  riskScore: number;
  riskLevel: RiskLevel;
  summary: string;
  disclaimer: string;
  riskItems: RiskItem[];
  confidenceScore: number;
  unclearClauses?: string[];
}

/** Kullanıcı ayarları (options sayfasında saklanan) */
export interface UserSettings {
  apiKey: string;
  provider: LLMProvider;
  modelName: string;
  maxTokens: number;
  temperature: number;
}

/** Extension içi mesajlaşma */
export interface ExtensionMessage {
  type: MessageType;
  payload?: unknown;
}

export type MessageType =
  | 'ANALYZE_PAGE'
  | 'ANALYSIS_STARTED'
  | 'ANALYSIS_PROGRESS'
  | 'ANALYSIS_COMPLETE'
  | 'ANALYSIS_ERROR'
  | 'GET_PAGE_TEXT'
  | 'PAGE_TEXT_RESULT'
  | 'VERIFY_QUOTES'
  | 'QUOTES_VERIFIED'
  | 'GET_SETTINGS'
  | 'SETTINGS_RESULT';

/** Analiz ilerleme durumu */
export interface AnalysisProgress {
  step: string;
  percentage: number;
}

/** DOM'dan alınan sayfa verisi */
export interface PageData {
  url: string;
  title: string;
  rawText: string;
  pageType: 'tos' | 'privacy' | 'subscription' | 'unknown';
  extractedAt: string;
}
