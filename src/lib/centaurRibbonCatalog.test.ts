import assert from 'node:assert/strict';
import test from 'node:test';
import { CENTAUR_2026_PRODUCTS, ribbonUnitPrice } from './centaurRibbonCatalog';

test('uses the Canadian or US price list selected from the trial country', () => {
  assert.equal(ribbonUnitPrice('203', 'CAD', 1), 7.68);
  assert.equal(ribbonUnitPrice('203', 'USD', 1), 6.15);
});

test('applies Centaur quantity tiers without changing older estimates', () => {
  assert.equal(ribbonUnitPrice('CF7', 'CAD', 249), 0.71);
  assert.equal(ribbonUnitPrice('CF7', 'CAD', 250), 0.68);
  assert.equal(ribbonUnitPrice('CF7', 'CAD', 1000), 0.61);
});

test('includes the specialty styles and accent-inclusive prices from the full lists', () => {
  const codes = CENTAUR_2026_PRODUCTS.map((product) => product.code);
  assert.equal(new Set(codes).size, codes.length);
  for (const code of ['CF6', '105WA', 'PP3CL', '307DL', 'NRWM512', 'GCR4-7TEX', 'CDN-X-ROSES']) {
    assert.ok(codes.includes(code), `${code} should be available`);
  }
  assert.equal(ribbonUnitPrice('KS311', 'CAD', 1), 8.59);
  assert.equal(ribbonUnitPrice('Ultimate Grand', 'USD', 1), 125.51);
});
