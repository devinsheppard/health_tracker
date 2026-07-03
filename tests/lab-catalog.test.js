const assert = require('node:assert/strict');
const test = require('node:test');

const catalog = require('../src/renderer/labCatalog');

test('contains a practical built-in common lab catalog', () => {
  assert.equal(catalog.categories.includes('CBC / Hematology'), true);
  assert.equal(catalog.categories.includes('Thyroid'), true);
  assert.ok(catalog.builtInTests.length >= 250);
  assert.ok(catalog.builtInTests.length <= 500);
});

test('searches Hemoglobin A1c by abbreviation and aliases', () => {
  const byA1c = catalog.searchBuiltInTests('A1c');
  const byHbA1c = catalog.searchBuiltInTests('HbA1c');
  const byName = catalog.searchBuiltInTests('Hemoglobin A1c');

  assert.equal(byA1c[0].displayName, 'Hemoglobin A1c');
  assert.equal(byHbA1c[0].id, byA1c[0].id);
  assert.equal(byName[0].id, byA1c[0].id);
  assert.equal(byA1c[0].category, 'Diabetes');
});

test('searches TSH by abbreviation and category', () => {
  const results = catalog.searchBuiltInTests('TSH');

  assert.equal(results[0].displayName, 'Thyroid Stimulating Hormone');
  assert.equal(results[0].category, 'Thyroid');
  assert.equal(results[0].defaultUnit, 'uIU/mL');
});

test('supports category filtering and id lookup', () => {
  const thyroid = catalog.searchBuiltInTests('', { category: 'Thyroid', limit: 100 });

  assert.ok(thyroid.length > 5);
  assert.equal(thyroid.every((test) => test.category === 'Thyroid'), true);
  assert.equal(catalog.findBuiltInTest(thyroid[0].id).id, thyroid[0].id);
});
