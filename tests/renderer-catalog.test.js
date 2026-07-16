const assert = require('node:assert/strict');
const test = require('node:test');

const catalog = require('../src/renderer/catalog');

test('exposes page, diet, and activity catalogs', () => {
  assert.deepEqual(catalog.pages[0], ['dashboard', 'Dashboard']);
  assert.equal(catalog.activities['Slow walking'], 2.5);
  assert.equal(catalog.dietProfiles.keto.includes('30g'), true);
});

test('keeps Skull crushers as one bilateral exercise entry', () => {
  const triceps = catalog.exerciseGroups.Triceps.filter(([name]) => /skull/i.test(name));

  assert.deepEqual(triceps, [['Skull crushers', 'bilateral']]);
});

test('keeps Barbell curls as one bilateral biceps entry', () => {
  const biceps = catalog.exerciseGroups.Biceps.filter(([name]) => /barbell curls/i.test(name));

  assert.deepEqual(biceps, [['Barbell curls', 'bilateral']]);
});

test('keeps Cable Kong Curl as one bilateral biceps entry', () => {
  const biceps = catalog.exerciseGroups.Biceps.filter(([name]) => name === 'Cable Kong Curl');

  assert.deepEqual(biceps, [['Cable Kong Curl', 'bilateral']]);
});
