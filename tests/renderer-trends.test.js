const assert = require('node:assert/strict');
const test = require('node:test');

const trends = require('../src/renderer/trends');

test('calculates moving averages with partial early windows', () => {
  assert.deepEqual(trends.movingAverage([10, 20, 30, 40], 3), [10, 15, 20, 30]);
});

test('builds ledger trend series from the most recent sorted rows', () => {
  const series = trends.ledgerTrendSeries([
    { date: '2026-07-03', weight: 238, glucose_count: 1, glucose_avg: 110, food_calories: 1900, activity_calories: 100, workout_calories: 300, workout_volume: 3000 },
    { date: '2026-07-01', weight: 240, glucose_count: 0, glucose_avg: 0, food_calories: 1800, activity_calories: 50, workout_calories: 0, workout_volume: 0 },
    { date: '2026-07-02', weight: 239, glucose_count: 2, glucose_avg: 120, food_calories: 2000, activity_calories: 150, workout_calories: 250, workout_volume: 2000 }
  ], 2, 1400);

  assert.deepEqual(series.labels, ['2026-07-02', '2026-07-03']);
  assert.deepEqual(series.weight, [239, 238]);
  assert.deepEqual(series.glucose, [120, 110]);
  assert.deepEqual(series.balance, [200, 100]);
  assert.deepEqual(series.volume, [2000, 3000]);
});

test('uses step-inclusive activity calories in deficit and surplus trends', () => {
  const series = trends.ledgerTrendSeries([
    { date: '2026-07-01', food_calories: 2000, activity_calories: 650, step_calories: 350, workout_calories: 250 }
  ], 1, 1500);

  assert.deepEqual(series.balance, [-400]);
});

test('calculates trend deltas from finite values only', () => {
  assert.equal(trends.trendDelta([null, 240, 238]), -2);
  assert.equal(trends.trendDelta([null, undefined]), null);
});
