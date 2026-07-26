const assert = require('node:assert/strict');
const test = require('node:test');

const environmental = require('../src/shared/environmental');

test('uses actual temperature in the neutral range with no calorie adjustment', () => {
  const result = environmental.applyEnvironmentalAdjustment(500, {
    environment: 'outdoor',
    temperature_f: 65,
    humidity_percent: 50,
    wind_mph: 5
  });

  assert.equal(result.effective_temperature_f, 65);
  assert.equal(result.calorie_adjustment_percent, 0);
  assert.equal(result.final_calories, 500);
  assert.equal(result.environmental_load, 'Low');
});

test('uses heat index in hot conditions and applies exactly one adjustment', () => {
  const result = environmental.applyEnvironmentalAdjustment(500, {
    environment: 'outdoor',
    temperature_f: 96,
    humidity_percent: 60,
    wind_mph: 8
  });

  assert.equal(result.heat_index_f > 96, true);
  assert.equal(result.wind_chill_f, null);
  assert.equal(result.effective_temperature_f, result.heat_index_f);
  assert.equal(result.calorie_adjustment_percent, 6);
  assert.equal(result.final_calories, 530);
  assert.equal(result.environmental_load, 'Extreme');
});

test('uses wind chill in cold conditions', () => {
  const result = environmental.applyEnvironmentalAdjustment(400, {
    environment: 'outdoor',
    temperature_f: 25,
    humidity_percent: 50,
    wind_mph: 20
  });

  assert.equal(result.heat_index_f, null);
  assert.equal(result.wind_chill_f < 20, true);
  assert.equal(result.effective_temperature_f, result.wind_chill_f);
  assert.equal(result.calorie_adjustment_percent, 6);
  assert.equal(result.final_calories, 424);
  assert.equal(result.safety_warnings.includes('Dress appropriately to reduce heat loss.'), true);
});

test('never adjusts indoor exercise even when weather values are present', () => {
  const result = environmental.applyEnvironmentalAdjustment(500, {
    environment: 'indoor',
    temperature_f: 110,
    humidity_percent: 90,
    wind_mph: 50
  });

  assert.equal(result.effective_temperature_f, null);
  assert.equal(result.calorie_adjustment_percent, 0);
  assert.equal(result.final_calories, 500);
  assert.deepEqual(result.safety_warnings, []);
});

test('exposes configurable calorie bands at all required boundaries', () => {
  const cases = [
    [19, 6], [20, 4], [30, 2], [40, 1], [50, 0], [70, 0],
    [71, 1], [85, 2], [95, 4], [105, 6]
  ];
  for (const [temperature, expected] of cases) {
    assert.equal(environmental.calorieAdjustmentPercent(temperature), expected);
  }
  assert.equal(Object.isFrozen(environmental.CALORIE_ADJUSTMENT_BANDS), true);
});
