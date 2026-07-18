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

test('keeps Behind-the-Body Cable Curl as one bilateral biceps entry with cable curls', () => {
  const biceps = catalog.exerciseGroups.Biceps;
  const matches = biceps.filter(([name]) => name === 'Behind-the-Body Cable Curl');
  const cableKongIndex = biceps.findIndex(([name]) => name === 'Cable Kong Curl');
  const behindBodyIndex = biceps.findIndex(([name]) => name === 'Behind-the-Body Cable Curl');
  const pronatedIndex = biceps.findIndex(([name]) => name === 'Behind-the-Body Pronated Cable Curl');
  const concentrationIndex = biceps.findIndex(([name]) => name === 'Concentration curls');

  assert.deepEqual(matches, [['Behind-the-Body Cable Curl', 'bilateral']]);
  assert.equal(behindBodyIndex, cableKongIndex + 1);
  assert.equal(pronatedIndex, behindBodyIndex + 1);
  assert.equal(pronatedIndex < concentrationIndex, true);
});

test('keeps Behind-the-Body Pronated Cable Curl distinct from the standard variation', () => {
  const biceps = catalog.exerciseGroups.Biceps;
  const standard = biceps.filter(([name]) => name === 'Behind-the-Body Cable Curl');
  const pronated = biceps.filter(([name]) => name === 'Behind-the-Body Pronated Cable Curl');

  assert.deepEqual(standard, [['Behind-the-Body Cable Curl', 'bilateral']]);
  assert.deepEqual(pronated, [['Behind-the-Body Pronated Cable Curl', 'bilateral']]);
});
