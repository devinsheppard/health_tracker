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

test('calculates Cable Kong Curl through shared bilateral workout logic', () => {
  const exercise = { exercise: 'Cable Kong Curl', mode: 'bilateral', sets: 2, reps: 10, weight: 40 };
  const pounds = calc.exercisePounds(exercise, 220);
  const withPounds = { ...exercise, pounds };
  const calories = calc.workoutCalorieEstimate({ effort: 'moderate', duration: 30 }, [withPounds], 220, 2100);
  const challenge = calc.lifetimePounds([withPounds], [{ date: '2026-07-16' }], '2026-07-16');

  assert.equal(pounds, 800);
  assert.equal(pounds, calc.exercisePounds({ mode: 'bilateral', sets: 2, reps: 10, weight: 40 }, 220));
  assert.notEqual(pounds, 1600);
  assert.equal(calories.pounds, 800);
  assert.equal(calories.duration, 30);
  assert.equal(challenge.total, 800);
  assert.equal(challenge.week, 1);
  assert.equal(challenge.month, 1);
});

test('calculates Behind-the-Body Cable Curl through shared bilateral workout logic', () => {
  const exercise = { exercise: 'Behind-the-Body Cable Curl', mode: 'bilateral', sets: 3, reps: 12, weight: 35 };
  const pounds = calc.exercisePounds(exercise, 220);
  const withPounds = { ...exercise, pounds };
  const calories = calc.workoutCalorieEstimate({ effort: 'moderate', duration: 30 }, [withPounds], 220, 2100);
  const challenge = calc.lifetimePounds([withPounds], [{ date: '2026-07-17' }], '2026-07-17');

  assert.equal(pounds, 1260);
  assert.equal(pounds, calc.exercisePounds({ mode: 'bilateral', sets: 3, reps: 12, weight: 35 }, 220));
  assert.equal(calories.pounds, 1260);
  assert.equal(calories.duration, 30);
  assert.equal(challenge.total, 1260);
  assert.equal(challenge.week, 1);
  assert.equal(challenge.month, 1);
});

test('calculates Behind-the-Body Pronated Cable Curl through shared bilateral workout logic', () => {
  const exercise = { exercise: 'Behind-the-Body Pronated Cable Curl', mode: 'bilateral', sets: 3, reps: 12, weight: 35 };
  const pounds = calc.exercisePounds(exercise, 220);
  const withPounds = { ...exercise, pounds };
  const calories = calc.workoutCalorieEstimate({ effort: 'moderate', duration: 30 }, [withPounds], 220, 2100);
  const challenge = calc.lifetimePounds([withPounds], [{ date: '2026-07-17' }], '2026-07-17');

  assert.equal(pounds, 1260);
  assert.equal(pounds, calc.exercisePounds({ mode: 'bilateral', sets: 3, reps: 12, weight: 35 }, 220));
  assert.equal(calories.pounds, 1260);
  assert.equal(calories.duration, 30);
  assert.equal(challenge.total, 1260);
  assert.equal(challenge.week, 1);
  assert.equal(challenge.month, 1);
});

test('calculates new shoulder cable and pivot movements through shared single-side workout logic', () => {
  const exercises = [
    { exercise: 'Rear Delt Cable Fly', mode: 'single', sets: 3, reps: 12, weight: 20 },
    { exercise: 'Arm-Wrestling Inward Pivot', mode: 'single', sets: 2, reps: 15, weight: 25 }
  ].map((exercise) => ({ ...exercise, pounds: calc.exercisePounds(exercise, 220) }));
  const calories = calc.workoutCalorieEstimate({ effort: 'moderate', duration: 30 }, exercises, 220, 2100);
  const challenge = calc.lifetimePounds(exercises, [{ date: '2026-07-25' }], '2026-07-25');

  assert.equal(exercises[0].pounds, 1440);
  assert.equal(exercises[1].pounds, 1500);
  assert.equal(exercises[0].pounds, calc.exercisePounds({ mode: 'single', sets: 3, reps: 12, weight: 20 }, 220));
  assert.equal(exercises[1].pounds, calc.exercisePounds({ mode: 'single', sets: 2, reps: 15, weight: 25 }, 220));
  assert.equal(calories.pounds, 2940);
  assert.equal(calories.duration, 30);
  assert.equal(challenge.total, 2940);
  assert.equal(challenge.week, 1);
  assert.equal(challenge.month, 1);
});

test('calculates High and Wide Face Pulls through shared bilateral workout logic', () => {
  const exercise = { exercise: 'High and Wide Face Pulls', mode: 'bilateral', sets: 3, reps: 12, weight: 40 };
  const pounds = calc.exercisePounds(exercise, 220);
  const withPounds = { ...exercise, pounds };
  const calories = calc.workoutCalorieEstimate({ effort: 'moderate', duration: 30 }, [withPounds], 220, 2100);
  const challenge = calc.lifetimePounds([withPounds], [{ date: '2026-07-25' }], '2026-07-25');

  assert.equal(pounds, 1440);
  assert.equal(pounds, calc.exercisePounds({ mode: 'bilateral', sets: 3, reps: 12, weight: 40 }, 220));
  assert.notEqual(pounds, 2880);
  assert.equal(calories.pounds, 1440);
  assert.equal(calories.duration, 30);
  assert.equal(calories.calories > 0, true);
  assert.equal(challenge.total, 1440);
  assert.equal(challenge.week, 1);
  assert.equal(challenge.month, 1);
});

test('calculates standard forearm plank calories from body weight and duration', () => {
  const calories = calc.plankCaloriesForExercise({ exercise: 'Forearm Plank', sets: 2, seconds: 60, mode: 'timed' }, 220, 'moderate');

  assert.equal(Number(calories.toFixed(1)), 11.5);
});

test('uses lower intensity for modified knee plank than standard forearm plank', () => {
  const standard = calc.plankCaloriesForExercise({ exercise: 'Forearm Plank', sets: 1, seconds: 60, mode: 'timed' }, 220, 'moderate');
  const modified = calc.plankCaloriesForExercise({ exercise: 'Knee Forearm Plank', sets: 1, seconds: 60, mode: 'timed' }, 220, 'moderate');

  assert.equal(modified < standard, true);
  assert.equal(Number(modified.toFixed(1)), 4.5);
});

test('uses entered duration for dynamic planks', () => {
  const calories = calc.plankCaloriesForExercise({ exercise: 'Plank Shoulder Taps', sets: 1, reps: 40, seconds: 60, mode: 'timed' }, 220, 'moderate');

  assert.equal(calc.plankActiveSeconds({ exercise: 'Plank Shoulder Taps', sets: 1, reps: 40, seconds: 60 }), 60);
  assert.equal(Number(calories.toFixed(1)), 8.0);
});

test('estimates dynamic plank duration from repetitions when duration is blank', () => {
  const row = { exercise: 'Plank Mountain Climbers', sets: 2, reps: 30, seconds: '', mode: 'timed' };

  assert.equal(calc.plankActiveSeconds(row), 48);
  assert.equal(Number(calc.plankCaloriesForExercise(row, 220, 'moderate').toFixed(1)), 9.8);
});

test('does not double count dynamic plank entries with both duration and repetitions', () => {
  const withBoth = { exercise: 'Plank Jacks', sets: 1, reps: 60, seconds: 45, mode: 'timed' };
  const withDuration = { exercise: 'Plank Jacks', sets: 1, reps: 0, seconds: 45, mode: 'timed' };

  assert.equal(calc.plankActiveSeconds(withBoth), 45);
  assert.equal(calc.plankCaloriesForExercise(withBoth, 220, 'moderate'), calc.plankCaloriesForExercise(withDuration, 220, 'moderate'));
});

test('applies bounded added-weight adjustment for weighted plank', () => {
  const unweighted = calc.plankCaloriesForExercise({ exercise: 'Weighted Forearm Plank', sets: 1, seconds: 60, weight: 0, mode: 'timed' }, 220, 'moderate');
  const weighted = calc.plankCaloriesForExercise({ exercise: 'Weighted Forearm Plank', sets: 1, seconds: 60, weight: 500, mode: 'timed' }, 220, 'moderate');

  assert.equal(Number(calc.plankWeightMultiplier({ exercise: 'Weighted Forearm Plank', weight: 500 }, 220).toFixed(2)), 1.15);
  assert.equal(Number((weighted / unweighted).toFixed(2)), 1.15);
});

test('handles unilateral plank time per side through sets', () => {
  const perSide = { exercise: 'Side Plank', sets: 2, seconds: 30, mode: 'timed' };
  const combined = { exercise: 'Side Plank', sets: 1, seconds: 60, mode: 'timed' };

  assert.equal(calc.plankActiveSeconds(perSide), 60);
  assert.equal(calc.plankActiveSeconds(combined), 60);
  assert.equal(calc.plankCaloriesForExercise(perSide, 220, 'moderate'), calc.plankCaloriesForExercise(combined, 220, 'moderate'));
});

test('plank calories handle missing weight, zero duration, and very large values safely', () => {
  assert.equal(calc.plankCaloriesForExercise({ exercise: 'Forearm Plank', sets: 1, seconds: 60 }, 0, 'moderate'), 0);
  assert.equal(calc.plankCaloriesForExercise({ exercise: 'Forearm Plank', sets: 1, seconds: 0 }, 220, 'moderate'), 0);
  assert.equal(calc.plankActiveSeconds({ exercise: 'Forearm Plank', sets: 100, seconds: 10000 }), 7200);
  assert.equal(Number.isFinite(calc.plankCaloriesForExercise({ exercise: 'Forearm Plank', sets: 100, seconds: 10000 }, 220, 'vigorous')), true);
});

test('plank workout calories use active plank time without regressing non-plank estimates', () => {
  const nonPlank = calc.workoutCalorieEstimate({ effort: 'moderate', duration: 30 }, [], 220, 2100);
  const plankOnly = calc.workoutCalorieEstimate({ effort: 'moderate' }, [{ exercise: 'Forearm Plank', mode: 'timed', sets: 2, seconds: 60, pounds: 0 }], 220, 2100);

  assert.equal(Number(nonPlank.calories.toFixed(1)), 293.2);
  assert.equal(plankOnly.duration, 2);
  assert.equal(Number(plankOnly.calories.toFixed(1)), 11.5);
  assert.equal(plankOnly.pounds, 0);
});
