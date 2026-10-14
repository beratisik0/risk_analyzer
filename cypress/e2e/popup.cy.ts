describe('ToS Risk Analyzer - Popup UI', () => {
  beforeEach(() => {
    // Mock chrome storage and chrome runtime if needed
    cy.visit('src/popup/popup.html', {
      onBeforeLoad(win: any) {
        win.chrome = {
          storage: {
            local: {
              get: (_keys: any, cb: any) => cb({}),
              set: (_obj: any, cb?: any) => { if (cb) cb(); },
              remove: (_keys: any, cb?: any) => { if (cb) cb(); },
              clear: (cb?: any) => { if (cb) cb(); }
            }
          },
          runtime: {
            sendMessage: (_msg: any, cb?: any) => { if (cb) cb({ success: true }); },
            openOptionsPage: cy.stub().as('openOptionsPage')
          },
          tabs: {
            query: (_query: any, cb: any) => cb([{ id: 1, url: 'https://example.com/terms' }]),
            sendMessage: (_id: any, _msg: any, cb?: any) => { if (cb) cb({ success: true, text: 'Sample ToS' }); }
          }
        };
      }
    });
  });

  it('renders header, legal banner, and initial state', () => {
    cy.get('#legalBanner').should('be.visible');
    cy.get('#legalBanner').should('contain', 'hukuki tavsiye vermez');
    cy.get('.app-title').should('contain', 'ToS Risk Analyzer');
    cy.get('#analyzeBtn').should('be.visible').and('contain', 'Sayfayı Analiz Et');
    cy.get('#settingsBtn').should('be.visible');
  });

  it('displays category filter buttons correctly', () => {
    cy.get('.filter-btn').should('have.length', 6);
    cy.get('.filter-btn[data-category="all"]').should('contain', 'Tümü');
    cy.get('.filter-btn[data-category="Veri Gizliliği"]').should('contain', 'Veri Gizliliği');
    cy.get('.filter-btn[data-category="Otomatik Yenileme/Ödeme"]').should('contain', 'Ödeme');
    cy.get('.filter-btn[data-category="Yargı Yolu/Tahkim"]').should('contain', 'Yargı');
    cy.get('.filter-btn[data-category="Fesih/Değişiklik Hakkı"]').should('contain', 'Fesih');
    cy.get('.filter-btn[data-category="Diğer"]').should('contain', 'Diğer');
  });

  it('handles state visibility toggle between initial and loading state', () => {
    cy.get('#initialState').should('not.have.class', 'hidden');
    cy.get('#loadingState').should('have.class', 'hidden');
    cy.get('#reportState').should('have.class', 'hidden');
  });

  it('has risk score and confidence meter elements in report container', () => {
    cy.get('#riskScoreCard').should('exist');
    cy.get('#scoreValue').should('exist');
    cy.get('#confidenceValue').should('exist');
    cy.get('#riskLevelBadge').should('exist');
    cy.get('#injectionWarning').should('exist');
  });
});
