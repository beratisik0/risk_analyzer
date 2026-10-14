# ToS Risk Analyzer - Evaluation Sonuçları

> **Çalıştırma Zamanı:** 2026-10-14T17:56:43.438Z
> **Toplam Vaka:** 5 | **Başarılı:** 5 | **Başarısız:** 0

---

## Özet Tablo

| # | Vaka | Metin | Injection | Prompt | Doğrulama | Sonuç |
|---|------|-------|-----------|--------|-----------|-------|
| 1 | Sosyal Medya Gizlilik Politikası | ✅ (1707) | ✅ | ✅ | ✅ | ✅ BAŞARILI |
| 2 | SaaS Abonelik Sözleşmesi | ✅ (1765) | ✅ | ✅ | ✅ | ✅ BAŞARILI |
| 3 | E-Ticaret Mesafeli Satış Sözleşmesi | ✅ (2273) | ✅ | ✅ | ✅ | ✅ BAŞARILI |
| 4 | Prompt Injection Saldırılı Sözleşme | ✅ (1982) | ✅ | ✅ | ✅ | ✅ BAŞARILI |
| 5 | Belirsiz / Muğlak Sözleşme | ✅ (2169) | ✅ | ✅ | ✅ | ✅ BAŞARILI |

---

## Detaylı Metrikler

### Yakalanan Riskler (True Positive)

| Vaka | True Positives |
|------|----------------|
| Sosyal Medya Gizlilik Politikası | Temiz metin doğru tanımlandı; Güvenli delimiter'lar doğru uygulandı; Zod şema doğrulaması başarılı; DOM alıntı doğrulama çalışıyor; Feragatname zorlaması aktif; Kategori tespit edildi: Veri Gizliliği; Kategori tespit edildi: Fesih/Değişiklik Hakkı |
| SaaS Abonelik Sözleşmesi | Temiz metin doğru tanımlandı; Güvenli delimiter'lar doğru uygulandı; Zod şema doğrulaması başarılı; DOM alıntı doğrulama çalışıyor; Feragatname zorlaması aktif; Kategori tespit edildi: Otomatik Yenileme/Ödeme; Kategori tespit edildi: Fesih/Değişiklik Hakkı |
| E-Ticaret Mesafeli Satış Sözleşmesi | Temiz metin doğru tanımlandı; Güvenli delimiter'lar doğru uygulandı; Zod şema doğrulaması başarılı; DOM alıntı doğrulama çalışıyor; Feragatname zorlaması aktif; Kategori tespit edildi: Fesih/Değişiklik Hakkı |
| Prompt Injection Saldırılı Sözleşme | Injection doğru tespit edildi; Güvenli delimiter'lar doğru uygulandı; Zod şema doğrulaması başarılı; DOM alıntı doğrulama çalışıyor; Feragatname zorlaması aktif; Kategori tespit edildi: Veri Gizliliği; Kategori tespit edildi: Yargı Yolu/Tahkim; Kategori tespit edildi: Diğer |
| Belirsiz / Muğlak Sözleşme | Temiz metin doğru tanımlandı; Güvenli delimiter'lar doğru uygulandı; Zod şema doğrulaması başarılı; DOM alıntı doğrulama çalışıyor; Feragatname zorlaması aktif; Kategori tespit edildi: Diğer |

### Kaçırılan Riskler (False Negative)

| Vaka | False Negatives |
|------|----------------|
| Sosyal Medya Gizlilik Politikası | - |
| SaaS Abonelik Sözleşmesi | - |
| E-Ticaret Mesafeli Satış Sözleşmesi | - |
| Prompt Injection Saldırılı Sözleşme | - |
| Belirsiz / Muğlak Sözleşme | - |

### Yanlış Alarmlar (False Positive)

| Vaka | False Positives |
|------|----------------|
| Sosyal Medya Gizlilik Politikası | - |
| SaaS Abonelik Sözleşmesi | - |
| E-Ticaret Mesafeli Satış Sözleşmesi | - |
| Prompt Injection Saldırılı Sözleşme | - |
| Belirsiz / Muğlak Sözleşme | - |

---

## Vaka Detayları

### 1. Sosyal Medya Gizlilik Politikası ✅

**Açıklama:** Agresif veri toplama ve paylaşım politikası, 7 yıl veri saklama, cross-site tracking

| Metrik | Değer |
|--------|-------|
| Metin Çıkarma | ✅ Başarılı (1707 karakter) |
| Injection Tespiti | ✅ Doğru (Beklenen: false, Gerçek: false) |
| Prompt Oluşturma | ✅ Başarılı (Sistem: 2564, Kullanıcı: 2220 karakter) |
| Zod Doğrulama | ✅ Geçerli |

**Notlar:**
- Metin uzunluğu: 1707 karakter

### 2. SaaS Abonelik Sözleşmesi ✅

**Açıklama:** Otomatik yenileme, %15 yıllık artış, 45 gün iptal süresi, günlük %2 gecikme faizi, iade yok

| Metrik | Değer |
|--------|-------|
| Metin Çıkarma | ✅ Başarılı (1765 karakter) |
| Injection Tespiti | ✅ Doğru (Beklenen: false, Gerçek: false) |
| Prompt Oluşturma | ✅ Başarılı (Sistem: 2564, Kullanıcı: 2275 karakter) |
| Zod Doğrulama | ✅ Geçerli |

**Notlar:**
- Metin uzunluğu: 1765 karakter

### 3. E-Ticaret Mesafeli Satış Sözleşmesi ✅

**Açıklama:** Standart Türk e-ticaret sözleşmesi, bazı cayma hakkı istisnaları, kargo hasarı sorumluluğu

| Metrik | Değer |
|--------|-------|
| Metin Çıkarma | ✅ Başarılı (2273 karakter) |
| Injection Tespiti | ✅ Doğru (Beklenen: false, Gerçek: false) |
| Prompt Oluşturma | ✅ Başarılı (Sistem: 2564, Kullanıcı: 2781 karakter) |
| Zod Doğrulama | ✅ Geçerli |

**Notlar:**
- Metin uzunluğu: 2273 karakter

### 4. Prompt Injection Saldırılı Sözleşme ✅

**Açıklama:** 3 farklı injection vektörü, veri satışı, $10 sorumluluk sınırı, Singapur tahkimi

| Metrik | Değer |
|--------|-------|
| Metin Çıkarma | ✅ Başarılı (1982 karakter) |
| Injection Tespiti | ✅ Doğru (Beklenen: true, Gerçek: true) |
| Prompt Oluşturma | ✅ Başarılı (Sistem: 2564, Kullanıcı: 2494 karakter) |
| Zod Doğrulama | ✅ Geçerli |
| Tespit Edilen Kalıplar | Ignore previous instructions, Disregard all prior, Pretend that you, [INST] |

**Notlar:**
- Metin uzunluğu: 1982 karakter
- Tespit edilen injection kalıpları: Ignore previous instructions, Disregard all prior, Pretend that you, [INST]

### 5. Belirsiz / Muğlak Sözleşme ✅

**Açıklama:** Kasıtlı belirsiz ifadeler, çelişkili maddeler, eksik bölümler, "olabilir veya olmayabilir" dili

| Metrik | Değer |
|--------|-------|
| Metin Çıkarma | ✅ Başarılı (2169 karakter) |
| Injection Tespiti | ✅ Doğru (Beklenen: false, Gerçek: false) |
| Prompt Oluşturma | ✅ Başarılı (Sistem: 2564, Kullanıcı: 2677 karakter) |
| Zod Doğrulama | ✅ Geçerli |

**Notlar:**
- Metin uzunluğu: 2169 karakter

---

## Genel Değerlendirme

| Metrik | Sayı |
|--------|------|
| Toplam True Positive | 34 |
| Toplam False Negative | 0 |
| Toplam False Positive | 0 |
| Recall (Duyarlılık) | 100.0% |
| Precision (Kesinlik) | 100.0% |

> **Not:** Bu eval, LLM API çağrısı yapmadan çalışır. Metin çıkarma, injection tespiti, prompt oluşturma, Zod doğrulama ve DOM alıntı doğrulama bileşenlerini test eder. Gerçek LLM entegrasyonu için API anahtarı gereklidir.
