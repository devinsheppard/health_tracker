const assert = require('node:assert/strict');
const test = require('node:test');

const ui = require('../src/renderer/ui');

test('formats local dates and times from Date objects', () => {
  const date = new Date(2026, 6, 2, 8, 7);

  assert.equal(ui.localDateKey(date), '2026-07-02');
  assert.equal(ui.today(date), '2026-07-02');
  assert.equal(ui.nowTime(date), '08:07');
});

test('formats finite numbers and blanks consistently', () => {
  assert.equal(ui.fmt(12.345, 1), '12.3');
  assert.equal(ui.fmt('20', 0), '20');
  assert.equal(ui.fmt(undefined), '--');
});

test('calculates age relative to the supplied date', () => {
  assert.equal(ui.age('1980-07-03', new Date(2026, 6, 2)), 45);
  assert.equal(ui.age('1980-07-02', new Date(2026, 6, 2)), 46);
  assert.equal(ui.age('', new Date(2026, 6, 2)), '');
});
