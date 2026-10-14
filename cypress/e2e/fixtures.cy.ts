describe('Evaluation Fixtures DOM Verification', () => {
  it('loads SaaS Subscription fixture with recurring billing clauses', () => {
    cy.visit('eval/fixtures/saas-subscription.html');
    cy.get('h1').should('contain', 'SuperSaaS Pro Abonelik Sözleşmesi');
    cy.get('body').should('contain', 'otomatik olarak yenilenir');
    cy.get('body').should('contain', 'Veri Sahipliği');
  });

  it('loads Social Media Privacy fixture with data sharing clauses', () => {
    cy.visit('eval/fixtures/social-media-privacy.html');
    cy.get('h1').should('contain', 'SosyalAğ Gizlilik Politikası');
    cy.get('body').should('contain', 'Toplanan Veriler');
    cy.get('body').should('contain', 'Verilerin Paylaşımı');
  });

  it('loads E-Commerce Terms fixture with unilateral modification clauses', () => {
    cy.visit('eval/fixtures/ecommerce-terms.html');
    cy.get('h1').should('contain', 'MeGaShop E-Ticaret');
    cy.get('body').should('contain', 'Cayma Hakkı');
    cy.get('body').should('contain', 'Taraflar');
  });

  it('identifies hidden injection vectors in Malicious Injection fixture', () => {
    cy.visit('eval/fixtures/malicious-injection.html');
    cy.get('h1').should('contain', 'CloudX Platform Terms of Service');
    // Injection vectors should exist in the DOM
    cy.get('body').should('contain', 'SYSTEM OVERRIDE');
    cy.get('.hidden-payload, [style*="display: none"], [style*="opacity: 0"]').should('exist');
  });

  it('loads Ambiguous Terms fixture with contradictory and vague clauses', () => {
    cy.visit('eval/fixtures/ambiguous-terms.html');
    cy.get('h1').should('contain', 'NebulaApp Hizmet Sözleşmesi');
    cy.get('body').should('contain', 'Genel Koşullar');
  });
});
