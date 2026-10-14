// ============================================================
// src/validator/schema.ts - Zod Şema Tanımları & Doğrulama
// ============================================================

import { z } from 'zod';

/** Risk kategorileri */
const RiskCategoryEnum = z.enum([
  'Veri Gizliliği',
  'Otomatik Yenileme/Ödeme',
  'Yargı Yolu/Tahkim',
  'Fesih/Değişiklik Hakkı',
  'Diğer',
]);

/** Risk seviyesi */
const RiskSeverityEnum = z.enum(['DÜŞÜK', 'ORTA', 'YÜKSEK']);

/** Risk seviyesi (rapor düzeyi) */
const RiskLevelEnum = z.enum(['DÜŞÜK', 'ORTA', 'YÜKSEK', 'KRİTİK']);

/** Tek bir risk maddesi şeması */
export const RiskItemSchema = z.object({
  category: RiskCategoryEnum,
  title: z.string().min(1, 'Başlık boş olamaz'),
  simpleExplanationTr: z.string().min(1, 'Açıklama boş olamaz'),
  severity: RiskSeverityEnum,
  exactQuote: z.string().min(1, 'Alıntı boş olamaz'),
  quoteFoundInDom: z.boolean(),
});

/** Tam risk raporu şeması */
export const RiskReportSchema = z.object({
  riskScore: z
    .number()
    .min(0, 'Risk skoru 0\'dan küçük olamaz')
    .max(100, 'Risk skoru 100\'den büyük olamaz'),
  riskLevel: RiskLevelEnum,
  summary: z.string().min(10, 'Özet en az 10 karakter olmalı'),
  disclaimer: z.string().min(1, 'Feragatname boş olamaz'),
  riskItems: z
    .array(RiskItemSchema)
    .min(0)
    .max(50, 'En fazla 50 risk maddesi olabilir'),
  confidenceScore: z
    .number()
    .min(0, 'Güven skoru 0\'dan küçük olamaz')
    .max(1, 'Güven skoru 1\'den büyük olamaz'),
  unclearClauses: z.array(z.string()).optional(),
});

/** Şema tiplerini dışa aktar */
export type ZodRiskReport = z.infer<typeof RiskReportSchema>;
export type ZodRiskItem = z.infer<typeof RiskItemSchema>;

/**
 * LLM yanıtını parse eder ve Zod şemasıyla doğrular.
 * Deterministik JSON çıktısı zorlanır.
 */
export function parseAndValidateReport(rawResponse: string): {
  success: boolean;
  data?: ZodRiskReport;
  errors?: z.ZodError;
  rawParseError?: string;
} {
  // Adım 1: JSON çıkarma (markdown code block'larından veya ham metinden)
  let jsonString = rawResponse.trim();

  // ```json ... ``` bloğu varsa çıkar
  const jsonBlockMatch = jsonString.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (jsonBlockMatch) {
    jsonString = jsonBlockMatch[1].trim();
  }

  // JSON objesini bul (ilk { ile son } arası)
  const firstBrace = jsonString.indexOf('{');
  const lastBrace = jsonString.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    jsonString = jsonString.substring(firstBrace, lastBrace + 1);
  }

  // Adım 2: JSON parse
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    return {
      success: false,
      rawParseError: `JSON parse hatası: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Adım 3: Zod doğrulama
  const result = RiskReportSchema.safeParse(parsed);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error };
}

/**
 * Rapor verilerini zorunlu feragatname ile güçlendirir.
 */
export function enforceDisclaimer(report: ZodRiskReport): ZodRiskReport {
  const MANDATORY_DISCLAIMER =
    'Bu rapor hukuki tavsiye niteliği taşımaz. Yalnızca bilgilendirme amaçlıdır.';

  return {
    ...report,
    disclaimer: MANDATORY_DISCLAIMER,
  };
}
