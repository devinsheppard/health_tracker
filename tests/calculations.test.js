const assert = require('node:assert/strict');
const test = require('node:test');

const calc = require('../src/shared/calculations');

test('calculates lean body mass and Katch-McArdle BMR', () => {
  assert.equal(calc.leanBodyMass(240, 25), 180);
  assert.equal(Math.round(calc.katchMcardleBmr(180)), 2134);
});

test('summarizes food totals with missing values treated as zero', () => {
  assert.deepEqual(calc.foodTotals([
    { net_carbs: 5, protein: 40, fat: 20, calories: 360 },
    { net_carbs: '12', protein: '', fat: 18, calories: 300 }
  ]), {
    net_carbs: 17,
    protein: 40,
    fat: 38,
    calories: 660
  });
});

test('estimates A1C from average glucose readings', () => {
  const summary = calc.glucoseSummary([
    { context: 'fasting morning', value: 110 },
    { context: '2hr post-meal', value: 150 },
    { context: 'bedtime', value: 130 }
  ]);

  assert.equal(summary.count, 3);
  assert.equal(summary.avg, 130);
  assert.equal(Number(summary.a1c.toFixed(2)), 6.16);
  assert.equal(summary.fastingCount, 1);
  assert.equal(summary.fastingAvg, 110);
});

test('classifies glucose readings by context', () => {
  assert.equal(calc.glucoseClass('fasting morning', 65), 'reading-low');
  assert.equal(calc.glucoseClass('1hr post-meal', 180), 'reading-amber');
  assert.equal(calc.glucoseClass('2hr post-meal', 190), 'reading-red');
  assert.equal(calc.glucoseClass('bedtime', 105), 'reading-green');
});

test('calculates activity calories from MET, duration, and body weight', () => {
  assert.equal(Number(calc.metCalories(5, 60, 220).toFixed(1)), 499);
});

test('estimates step calories from steps, weight, and height', () => {
  assert.equal(Number(calc.stepCalories(10000, 220, 6, 0).toFixed(1)), 547.2);
});

test('detects walking activities for step double-count prevention', () => {
  assert.equal(calc.isWalkingActivity('Moderate walking'), true);
  assert.equal(calc.isWalkingActivity('Brisk walk'), true);
  assert.equal(calc.isWalkingActivity('Cycling'), false);
});

test('includes step calories in renderer-style activity burn totals', () => {
  const totals = calc.activityBurnTotals([], {
    steps: 10000,
    weightPounds: 220,
    heightFt: 6,
    heightIn: 0
  });

  assert.equal(Number(totals.stepBurn.toFixed(1)), 547.2);
  assert.equal(totals.stepBurn > 0, true);
  assert.equal(totals.activityBurn, totals.stepBurn);
});

test('prevents walking double count while keeping non-walking activity', () => {
  const totals = calc.activityBurnTotals([
    { name: 'Moderate walking', kind: 'activity', duration: 30, calories: 150 },
    { name: 'Cycling', kind: 'activity', duration: 30, calories: 300 }
  ], {
    steps: 10000,
    weightPounds: 220,
    heightFt: 6,
    heightIn: 0
  });

  assert.equal(Number(totals.activityBurn.toFixed(1)), 847.2);
  assert.equal(totals.activityMinutes, 30);
});

test('renderer-style TDEE includes step calories', () => {
  const bmr = 1800;
  const totals = calc.activityBurnTotals([], {
    steps: 10000,
    weightPounds: 220,
    heightFt: 6,
    heightIn: 0
  });

  assert.equal(Number((bmr + totals.activityBurn).toFixed(1)), 2347.2);
});

test('calculates exercise pounds for bilateral, single-side, bodyweight, and timed modes', () => {
  assert.equal(calc.exercisePounds({ mode: 'bilateral', sets: 3, reps: 10, weight: 100 }, 200), 3000);
  assert.equal(calc.exercisePounds({ mode: 'single', sets: 3, reps: 10, weight: 25 }, 200), 1500);
  assert.equal(calc.exercisePounds({ mode: 'bodyweight', sets: 3, reps: 12 }, 200), 7200);
  assert.equal(calc.exercisePounds({ mode: 'timed', seconds: 60 }, 200), 0);
});

test('estimates workout duration and calories using MET, BMR, load, and body weight', () => {
  const exercises = [
    { mode: 'bilateral', sets: 4, reps: 10, pounds: 4000 },
    { mode: 'timed', seconds: 120, pounds: 0 }
  ];
  const estimate = calc.workoutCalorieEstimate({ effort: 'moderate' }, exercises, 220, 2100);

  assert.equal(estimate.duration, 8);
  assert.equal(estimate.pounds, 4000);
  assert.equal(Number(estimate.calories.toFixed(1)), 79.6);
});

test('summarizes lifetime lifting totals by week and month', () => {
  const totals = calc.lifetimePounds(
    [{ pounds: 1000 }, { pounds: 2500 }],
    [{ date: '2026-06-30' }, { date: '2026-07-01' }, { date: '2026-06-20' }],
    '2026-07-02'
  );

  assert.deepEqual(totals, {
    total: 3500,
    sessions: 3,
    week: 2,
    month: 1
  });
});
