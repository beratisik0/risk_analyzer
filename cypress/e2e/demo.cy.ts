// ============================================================
// cypress/e2e/demo.cy.ts - ToS Risk Analyzer 90s Demo Senaryosu
// ============================================================

describe('ToS Risk Analyzer - Demo Senaryoları (Maks. 90sn)', () => {
  function setupMockChrome(win: any, mockReport: any, injectionDetected: boolean = false) {
    let stored: any = {
      settings: { provider: 'openai', apiKey: 'sk-demo-key-12345', modelName: 'gpt-4o' }
    };

    win.chrome = {
      storage: {
        local: {
          get: (keys: any, cb?: any) => {
            const res = typeof keys === 'string' ? { [keys]: stored[keys] } : stored;
            if (cb) cb(res);
            return Promise.resolve(res);
          },
          set: (obj: any, cb?: any) => {
            stored = { ...stored, ...obj };
            if (cb) cb();
            return Promise.resolve();
          },
          remove: (_keys: any, cb?: any) => { if (cb) cb(); return Promise.resolve(); },
          clear: (cb?: any) => { stored = {}; if (cb) cb(); return Promise.resolve(); }
        }
      },
      runtime: {
        lastError: null,
        sendMessage: (msg: any, cb?: any) => {
          if (msg.type === 'ANALYZE_PAGE') {
            setTimeout(() => {
              const res = {
                success: true,
                report: mockReport,
                promptInjectionDetected: injectionDetected,
                detectedPatterns: injectionDetected ? ['IGNORE_INSTRUCTIONS'] : []
              };
              if (cb) cb(res);
            }, 300);
          } else {
            if (cb) cb({ success: true });
          }
        },
        onMessage: {
          addListener: () => {},
          removeListener: () => {}
        },
        openOptionsPage: cy.stub().as('openOptionsPage')
      },
      tabs: {
        query: (_query: any, cb?: any) => {
          const res = [{ id: 1, url: 'https://example.com/terms' }];
          if (cb) cb(res);
          return Promise.resolve(res);
        },
        sendMessage: (_id: any, _msg: any, cb?: any) => {
          const res = { success: true, text: 'Terms content' };
          if (cb) cb(res);
          return Promise.resolve(res);
        }
      }
    };
  }

  function injectPopupScript() {
    cy.readFile('dist/popup/popup.js').then((code: string) => {
      // Strip ES module imports for direct script injection
      const cleanCode = code.replace(/import\s+[^;]+;/, '');
      cy.window().then((win: any) => {
        const script = win.document.createElement('script');
        script.textContent = cleanCode;
        win.document.body.appendChild(script);
      });
    });
  }

  // ------------------------------------------------------------
  // SENARYO 1: Mutlu Yol (Happy Path)
  // ------------------------------------------------------------
  it('Senaryo 1: Mutlu Yol (Happy Path) - Standart ToS Analizi & Orijinal Alıntılar', () => {
    const happyPathReport = {
      riskScore: 75,
      riskLevel: 'YÜKSEK',
      summary: 'Bu sözleşme agresif otomatik yenileme, geniş veri paylaşımı ve tahkim zorunluluğu nedeniyle yüksek risk taşımaktadır.',
      disclaimer: 'Bu rapor hukuki tavsiye niteliği taşımaz.',
      confidenceScore: 0.95,
      riskItems: [
        {
          category: 'Otomatik Yenileme/Ödeme',
          title: 'İptal Edilmeyen Aboneliklerde Otomatik Kart Çekimi',
          simpleExplanationTr: 'Abonelik süresi bitmeden 48 saat önce iptal edilmezse kartınızdan otomatik olarak yıllık ücret tahsil edilir.',
          severity: 'YÜKSEK',
          exactQuote: 'Aboneliğinizi yenileme tarihinden en az 48 saat önce iptal etmediğiniz takdirde, üyelik otomatik olarak bir yıl daha uzatılır ve kayıtlı kartınızdan tahsilat yapılır.',
          quoteFoundInDom: true
        },
        {
          category: 'Veri Gizliliği',
          title: 'Kişisel Verilerin Reklam Ortaklarına Aktarımı',
          simpleExplanationTr: 'Konum ve kullanım alışkanlıklarınız üçüncü taraf reklam ağlarıyla süresiz olarak paylaşılabilir.',
          severity: 'YÜKSEK',
          exactQuote: 'Kullanıcı verileri, cihaz kimlikleri ve hassas konum bilgileri pazarlama ve iş ortaklarımızla anonimleştirilmeden paylaşılabilir.',
          quoteFoundInDom: true
        },
        {
          category: 'Yargı Yolu/Tahkim',
          title: 'Toplu Dava ve Mahkeme Hakkından Feragat',
          simpleExplanationTr: 'Kullanıcı tüketici mahkemelerine başvuramaz, yalnızca bağlayıcı tekil tahkime gidebilir.',
          severity: 'ORTA',
          exactQuote: 'Tüm uyuşmazlıklar tek hakemli bağlayıcı tahkim yoluyla çözülecek olup, kullanıcılar toplu dava açma hakkından açıkça feragat ederler.',
          quoteFoundInDom: true
        }
      ],
      unclearClauses: []
    };

    cy.visit('src/popup/popup.html', {
      onBeforeLoad(win: any) {
        setupMockChrome(win, happyPathReport, false);
      }
    });

    injectPopupScript();

    // 1. Karşılama ve Yasal Uyarı Kontrolü
    cy.get('#legalBanner').should('be.visible').and('contain', 'hukuki tavsiye vermez');
    cy.get('#initialState').should('be.visible');
    cy.get('#analyzeBtn').should('be.visible');

    // 2. Analizi Başlat
    cy.get('#analyzeBtn').click();
    cy.get('#loadingState').should('not.have.class', 'hidden');

    // 3. Raporun Gelmesini Bekle ve Skor Kartını Doğrula
    cy.get('#reportState', { timeout: 6000 }).should('not.have.class', 'hidden');
    cy.get('#scoreValue').should('contain', '75');
    cy.get('#riskLevelBadge').should('contain', 'YÜKSEK');
    cy.get('#riskSummary').should('contain', 'otomatik yenileme');
    cy.get('#confidenceValue').should('contain', '95%');

    // 4. Maddeler ve Doğrulanmış Alıntı Rozetleri
    cy.get('#itemCount').should('contain', '3');
    cy.get('.risk-item').should('have.length', 3);
    cy.get('.quote-status.verified').first().should('contain', 'Alıntı DOM\'da doğrulandı');

    // 5. Kategori Filtresi ile Etkileşim
    cy.get('.filter-btn[data-category="Otomatik Yenileme/Ödeme"]').click();
    cy.get('.risk-item').should('have.length', 1);
    cy.get('.risk-item-title').should('contain', 'Otomatik Kart Çekimi');

    // 6. Madde Detayını Açma ve Alıntıyı İnceleme
    cy.get('.risk-item').first().click();
    cy.get('.risk-item').first().should('have.class', 'expanded');
    cy.get('.risk-item-quote').should('be.visible');
    cy.get('.risk-item-quote').should('contain', '48 saat önce');

    // 7. Filtreyi Sıfırlama
    cy.get('.filter-btn[data-category="all"]').click();
    cy.get('.risk-item').should('have.length', 3);
  });

  // ------------------------------------------------------------
  // SENARYO 2: Belirsizlik & Dürüstlük Anı (Edge Case / Uncertainty)
  // ------------------------------------------------------------
  it('Senaryo 2: Belirsizlik & Dürüstlük Anı - Düşük Güven Skoru ve Muğlak Madde Tespiti', () => {
    const uncertainReport = {
      riskScore: 50,
      riskLevel: 'ORTA',
      summary: 'Sözleşmede çelişkili fesih hükümleri ve yetki alanı belirsizlikleri saptanmıştır.',
      disclaimer: 'Bu rapor hukuki tavsiye niteliği taşımaz.',
      confidenceScore: 0.42, // Düşük güven skoru (< 0.50)
      riskItems: [
        {
          category: 'Fesih/Değişiklik Hakkı',
          title: 'Tek Taraflı Fesih ve Hizmet Durdurma',
          simpleExplanationTr: 'Firma önceden haber vermeksizin hizmeti sonlandırabileceğini bildirmektedir.',
          severity: 'ORTA',
          exactQuote: 'Şirket dilediği zaman herhangi bir gerekçe bildirmeksizin hesabınızı askıya alabilir veya kapatabilir.',
          quoteFoundInDom: true
        }
      ],
      unclearClauses: [
        'Madde 8.1 ile Madde 14.3 birbiriyle çelişmektedir: Madde 8.1 "ücret iadesi yapılmaz" derken Madde 14.3 "yasal sürede oransal iade yapılır" demektedir. Bu madde hukuki açıdan belirsiz / net anlaşılamadı.',
        'Madde 12.4: "Tüm ihtilaflarda uygulanacak hukuk uluslararası teamüllere tabidir" ifadesi belirli bir yargı mercii veya ülke hukuku işaret etmemektedir. Hukuki açıdan muğlaktır.'
      ]
    };

    cy.visit('src/popup/popup.html', {
      onBeforeLoad(win: any) {
        setupMockChrome(win, uncertainReport, false);
      }
    });

    injectPopupScript();

    // 1. Analizi Başlat
    cy.get('#analyzeBtn').click();

    // 2. Raporun Yüklenmesi
    cy.get('#reportState', { timeout: 6000 }).should('not.have.class', 'hidden');

    // 3. Düşük Güven Skorunun Dürüstçe Yansıtılması
    cy.get('#confidenceValue').should('contain', '42%');
    cy.get('#riskLevelBadge').should('contain', 'ORTA');

    // 4. Belirsiz / Çelişkili Maddeler Bölümünün Görünür Olması
    cy.get('#unclearSection').should('not.have.class', 'hidden');
    cy.get('#unclearSection').should('be.visible');
    cy.get('#unclearSection .section-title').should('contain', 'Belirsiz / Çelişkili Maddeler');

    // 5. "Bu madde hukuki açıdan belirsiz / net anlaşılamadı" İfadesinin Varlığı
    cy.get('#unclearList li').should('have.length', 2);
    cy.get('#unclearList').should('contain', 'Bu madde hukuki açıdan belirsiz / net anlaşılamadı');
    cy.get('#unclearList').should('contain', 'Hukuki açıdan muğlaktır');
  });
});
