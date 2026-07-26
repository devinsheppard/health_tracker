const assert = require('node:assert/strict');
const test = require('node:test');

const weight = require('../src/shared/weight');

test('carries the latest recorded weight forward without falling forward', () => {
  const rows = [
    { id: 1, date: '2026-07-01', weight: 240.2 },
    { id: 2, date: '2026-07-04', weight: 239.6 }
  ];

  assert.equal(weight.effectiveWeightOnOrBefore(rows, '2026-06-30'), null);
  assert.equal(weight.effectiveWeightOnOrBefore(rows, '2026-07-01').weight, 240.2);
  assert.equal(weight.effectiveWeightOnOrBefore(rows, '2026-07-03').weight, 240.2);
  assert.equal(weight.effectiveWeightOnOrBefore(rows, '2026-07-05').weight, 239.6);
});

test('uses the last entry when multiple measurements exist on one day', () => {
  const rows = [
    { id: 1, date: '2026-07-01', weight: 240.2 },
    { id: 2, date: '2026-07-01', weight: 239.9 }
  ];

  assert.equal(weight.effectiveWeightOnOrBefore(rows, '2026-07-02').weight, 239.9);
});
