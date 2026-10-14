describe('ToS Risk Analyzer - Options Settings Page', () => {
  beforeEach(() => {
    let storedSettings: any = {
      settings: {
        provider: 'openai',
        apiKey: 'sk-test-key-12345',
        modelName: 'gpt-4o',
        maxTokens: 4096,
        temperature: 0.1,
      }
    };

    cy.visit('src/options/options.html', {
      onBeforeLoad(win: any) {
        win.chrome = {
          storage: {
            local: {
              get: (keys: any, cb?: any) => {
                let res: any = {};
                if (typeof keys === 'string') {
                  res = { [keys]: storedSettings[keys] };
                } else if (Array.isArray(keys)) {
                  keys.forEach(k => res[k] = storedSettings[k]);
                } else {
                  res = storedSettings;
                }
                if (cb) cb(res);
                return Promise.resolve(res);
              },
              set: (obj: any, cb?: any) => {
                storedSettings = { ...storedSettings, ...obj };
                if (cb) cb();
                return Promise.resolve();
              },
              remove: (_keys: any, cb?: any) => { if (cb) cb(); return Promise.resolve(); },
              clear: (cb?: any) => { storedSettings = {}; if (cb) cb(); return Promise.resolve(); }
            }
          }
        };
      }
    });

    cy.readFile('dist/options/options.js').then((code: string) => {
      const cleanCode = code.replace(/import\s+[^;]+;/, '');
      cy.window().then((win: any) => {
        const script = win.document.createElement('script');
        script.textContent = cleanCode;
        win.document.body.appendChild(script);
      });
    });
  });

  it('renders settings page elements correctly', () => {
    cy.get('h1').should('contain', 'ToS Risk Analyzer Ayarları');
    cy.get('#provider').should('exist');
    cy.get('#apiKey').should('exist');
    cy.get('#modelName').should('exist');
    cy.get('#maxTokens').should('exist');
    cy.get('#temperature').should('exist');
    cy.get('#saveBtn').should('contain', 'Kaydet');
    cy.get('#clearBtn').should('contain', 'Tüm Verileri Temizle');
  });

  it('toggles password visibility for API key input', () => {
    cy.get('#apiKey').should('have.attr', 'type', 'password');
    cy.get('#toggleApiKey').click();
    cy.get('#apiKey').should('have.attr', 'type', 'text');
    cy.get('#toggleApiKey').click();
    cy.get('#apiKey').should('have.attr', 'type', 'password');
  });

  it('allows changing provider selection', () => {
    cy.get('#provider').select('anthropic');
    cy.get('#provider').should('have.value', 'anthropic');
    cy.get('#provider').select('gemini');
    cy.get('#provider').should('have.value', 'gemini');
    cy.get('#provider').select('openai');
    cy.get('#provider').should('have.value', 'openai');
  });

  it('updates temperature slider value display', () => {
    cy.get('#temperature').invoke('val', 0.2).trigger('input');
    cy.get('#tempValue').should('contain', '0.2');
  });
});
