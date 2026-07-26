const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const db = require('../src/db');

function tempUserData() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'health-tracker-ledger-'));
}

test.afterEach(() => {
  db.close();
});

test('maintains one daily ledger row with health totals for each date', () => {
  const userDataPath = tempUserData();
  db.init(userDataPath);

  db.addRow('weight_log', {
    date: '2026-07-01',
    weight: 240,
    body_fat: 25,
    lean_body_mass: 180,
    notes: 'weekly weigh-in'
  });
  db.addRow('glucose_readings', {
    date: '2026-07-01',
    time: '07:00',
    context: 'fasting morning',
    value: 100,
    notes: 'morning reading'
  });
  db.addRow('glucose_readings', {
    date: '2026-07-01',
    time: '20:00',
    context: 'bedtime',
    value: 140,
    notes: ''
  });
  db.addRow('blood_pressure_readings', {
    date: '2026-07-01',
    time: '08:00',
    systolic: 128,
    diastolic: 82,
    heart_rate: 72,
    position: 'seated',
    notes: 'morning BP'
  });
  db.addRow('blood_pressure_readings', {
    date: '2026-07-01',
    time: '21:00',
    systolic: 122,
    diastolic: 78,
    heart_rate: 68,
    position: 'seated',
    notes: ''
  });
  db.addRow('food_log', {
    date: '2026-07-01',
    meal_type: 'breakfast',
    description: 'Eggs',
    net_carbs: 2,
    protein: 30,
    fat: 22,
    calories: 330
  });
  db.addRow('food_log', {
    date: '2026-07-01',
    meal_type: 'dinner',
    description: 'Steak',
    net_carbs: 1,
    protein: 60,
    fat: 30,
    calories: 520
  });
  const workout = db.addRow('workout_sessions', {
    date: '2026-07-01',
    pre_glucose: 110,
    post_glucose: 100,
    duration: 60,
    effort: 'moderate',
    notes: 'upper body'
  });
  db.addRow('workout_exercises', {
    session_id: workout.id,
    muscle_group: 'Chest',
    exercise: 'Bench press',
    sets: 3,
    reps: 10,
    weight: 100,
    seconds: null,
    mode: 'bilateral',
    pounds: 3000
  });
  db.addRow('activities', {
    date: '2026-07-01',
    name: 'Workout: moderate resistance training',
    met: 5,
    duration: 60,
    calories: 400,
    notes: 'linked burn',
    kind: 'workout',
    source_session_id: workout.id
  });
  db.addRow('activities', {
    date: '2026-07-01',
    name: 'Moderate walking',
    met: 3.5,
    duration: 30,
    calories: 150,
    notes: 'outside walk',
    kind: 'activity',
    source_session_id: null
  });
  db.addRow('step_log', {
    date: '2026-07-01',
    steps: 10000,
    notes: 'watch total'
  });
  db.addRow('sleep_log', {
    date: '2026-07-01',
    hours: 7.5,
    quality: 'good',
    morning_glucose: 102,
    notes: 'slept well'
  });
  db.addRow('lab_results', {
    date: '2026-07-01',
    test_name: 'A1C',
    value: 5.8,
    reference_range: '<5.7',
    notes: 'review next visit'
  });

  const row = db.getAllData().daily_ledger.find((entry) => entry.date === '2026-07-01');

  assert.equal(row.weight, 240);
  assert.equal(row.body_fat, 25);
  assert.equal(row.lean_body_mass, 180);
  assert.equal(row.glucose_count, 2);
  assert.equal(row.glucose_avg, 120);
  assert.equal(row.fasting_glucose_count, 1);
  assert.equal(row.fasting_glucose_avg, 100);
  assert.equal(row.bp_count, 2);
  assert.equal(row.systolic_avg, 125);
  assert.equal(row.diastolic_avg, 80);
  assert.equal(row.heart_rate_avg, 70);
  assert.equal(row.food_calories, 850);
  assert.equal(row.net_carbs, 3);
  assert.equal(row.protein, 90);
  assert.equal(row.fat, 52);
  assert.equal(row.step_count, 10000);
  assert.equal(Number(row.step_calories.toFixed(1)), 602.3);
  assert.equal(Number(row.activity_calories.toFixed(1)), 602.3);
  assert.equal(row.activity_minutes, 0);
  assert.equal(row.workout_calories, 400);
  assert.equal(row.workout_minutes, 60);
  assert.equal(row.workout_sessions, 1);
  assert.equal(row.workout_volume, 3000);
  assert.equal(row.lifetime_lifting_total, 3000);
  assert.equal(row.sleep_hours, 7.5);
  assert.equal(row.sleep_quality, 'good');
  assert.equal(row.morning_glucose, 102);
  assert.equal(row.lab_count, 1);
  assert.match(row.notes, /Glucose: morning reading/);
  assert.match(row.notes, /Blood pressure: morning BP/);
  assert.match(row.notes, /Workout: upper body/);
  assert.match(row.notes, /Activity: outside walk/);
  assert.match(row.notes, /Steps: watch total/);
  assert.match(row.notes, /Weight: weekly weigh-in/);
  assert.match(row.notes, /Sleep: slept well/);
  assert.match(row.notes, /Lab: review next visit/);
});

test('carries forward effective weight without inserting synthetic weight entries', () => {
  const userDataPath = tempUserData();
  db.init(userDataPath);
  db.saveSettings({ current_weight: 300 });

  db.addRow('glucose_readings', {
    date: '2026-06-30',
    time: '07:00',
    context: 'fasting morning',
    value: 100,
    notes: 'before first weight'
  });
  db.addRow('step_log', {
    date: '2026-06-30',
    steps: 10000,
    notes: 'no weight exists yet'
  });
  db.addRow('weight_log', {
    date: '2026-07-01',
    weight: 240.2,
    body_fat: 25,
    lean_body_mass: 180.15,
    notes: 'first weight'
  });
  db.addRow('food_log', {
    date: '2026-07-02',
    meal_type: 'dinner',
    description: 'No weigh-in day',
    net_carbs: 5,
    protein: 40,
    fat: 20,
    calories: 360
  });
  db.addRow('step_log', {
    date: '2026-07-03',
    steps: 10000,
    notes: 'carried step burn'
  });
  db.addRow('weight_log', {
    date: '2026-07-04',
    weight: 239.6,
    body_fat: 24.8,
    lean_body_mass: 180.2,
    notes: 'next weight'
  });
  db.addRow('food_log', {
    date: '2026-07-05',
    meal_type: 'dinner',
    description: 'Carry new weight',
    net_carbs: 5,
    protein: 40,
    fat: 20,
    calories: 360
  });

  const data = db.getAllData();
  const byDate = Object.fromEntries(data.daily_ledger.map((row) => [row.date, row]));

  assert.equal(byDate['2026-06-30'].weight, null);
  assert.equal(byDate['2026-06-30'].step_calories, 0);
  assert.equal(byDate['2026-07-01'].weight, 240.2);
  assert.equal(byDate['2026-07-02'].weight, 240.2);
  assert.equal(byDate['2026-07-03'].weight, 240.2);
  assert.equal(byDate['2026-07-04'].weight, 239.6);
  assert.equal(byDate['2026-07-05'].weight, 239.6);
  assert.equal(byDate['2026-07-02'].body_fat, 25);
  assert.equal(byDate['2026-07-05'].body_fat, 24.8);
  assert.equal(Number(byDate['2026-07-03'].step_calories.toFixed(1)), 602.8);
  assert.equal(data.weight_log.length, 2);
});

test('recalculates bodyweight challenge volume from effective historical weight', () => {
  const userDataPath = tempUserData();
  db.init(userDataPath);

  db.addRow('weight_log', {
    date: '2026-07-01',
    weight: 200,
    body_fat: 25,
    lean_body_mass: 150,
    notes: ''
  });
  const firstSession = db.addRow('workout_sessions', {
    date: '2026-07-03',
    pre_glucose: null,
    post_glucose: null,
    duration: 30,
    effort: 'moderate',
    notes: ''
  });
  db.addRow('workout_exercises', {
    session_id: firstSession.id,
    muscle_group: 'Chest',
    exercise: 'Push-ups',
    sets: 2,
    reps: 10,
    weight: null,
    seconds: null,
    mode: 'bodyweight',
    pounds: 0
  });
  db.addRow('weight_log', {
    date: '2026-07-04',
    weight: 190,
    body_fat: 24,
    lean_body_mass: 144.4,
    notes: ''
  });
  const secondSession = db.addRow('workout_sessions', {
    date: '2026-07-05',
    pre_glucose: null,
    post_glucose: null,
    duration: 30,
    effort: 'moderate',
    notes: ''
  });
  db.addRow('workout_exercises', {
    session_id: secondSession.id,
    muscle_group: 'Chest',
    exercise: 'Push-ups',
    sets: 1,
    reps: 10,
    weight: null,
    seconds: null,
    mode: 'bodyweight',
    pounds: 0
  });

  const data = db.getAllData();
  const byDate = Object.fromEntries(data.daily_ledger.map((row) => [row.date, row]));

  assert.equal(byDate['2026-07-03'].workout_volume, 4000);
  assert.equal(byDate['2026-07-03'].lifetime_lifting_total, 4000);
  assert.equal(byDate['2026-07-05'].workout_volume, 1900);
  assert.equal(byDate['2026-07-05'].lifetime_lifting_total, 5900);
  assert.equal(data.workout_exercises.every((row) => row.pounds === 0), true);
});

test('counts non-walking activity with steps while preventing walking double count', () => {
  const userDataPath = tempUserData();
  db.init(userDataPath);
  db.saveProfile({
    sex: 'male',
    current_weight: 220,
    height_ft: 6,
    height_in: 0,
    goals: 'weight loss',
    diet_type: 'keto',
    theme: 'dark'
  });
  db.addRow('weight_log', {
    date: '2026-07-01',
    weight: 220,
    body_fat: 25,
    lean_body_mass: 165,
    notes: ''
  });

  db.addRow('step_log', { date: '2026-07-01', steps: 10000, notes: '' });
  db.addRow('activities', {
    date: '2026-07-01',
    name: 'Moderate walking',
    met: 3.5,
    duration: 30,
    calories: 150,
    notes: '',
    kind: 'activity',
    source_session_id: null
  });
  db.addRow('activities', {
    date: '2026-07-01',
    name: 'Cycling',
    met: 8,
    duration: 30,
    calories: 300,
    notes: '',
    kind: 'activity',
    source_session_id: null
  });

  let row = db.getAllData().daily_ledger[0];
  assert.equal(row.step_count, 10000);
  assert.equal(Number(row.step_calories.toFixed(1)), 547.2);
  assert.equal(Number(row.activity_calories.toFixed(1)), 847.2);
  assert.equal(row.activity_minutes, 30);

  const step = db.getAllData().step_log[0];
  db.updateRow('step_log', step.id, { steps: 5000 });
  row = db.getAllData().daily_ledger[0];
  assert.equal(row.step_count, 5000);
  assert.equal(Number(row.step_calories.toFixed(1)), 273.6);
  assert.equal(Number(row.activity_calories.toFixed(1)), 573.6);
});

test('counts walking activity normally when no step calories exist', () => {
  const userDataPath = tempUserData();
  db.init(userDataPath);

  db.addRow('activities', {
    date: '2026-07-01',
    name: 'Moderate walking',
    met: 3.5,
    duration: 30,
    calories: 150,
    notes: '',
    kind: 'activity',
    source_session_id: null
  });

  const row = db.getAllData().daily_ledger[0];
  assert.equal(row.step_count, 0);
  assert.equal(row.step_calories, 0);
  assert.equal(row.activity_calories, 150);
  assert.equal(row.activity_minutes, 30);
});

test('updates the daily ledger after source rows are edited or deleted', () => {
  const userDataPath = tempUserData();
  db.init(userDataPath);

  const food = db.addRow('food_log', {
    date: '2026-07-01',
    meal_type: 'dinner',
    description: 'Chicken',
    net_carbs: 4,
    protein: 50,
    fat: 10,
    calories: 300
  });
  const activity = db.addRow('activities', {
    date: '2026-07-01',
    name: 'Moderate walking',
    met: 3.5,
    duration: 20,
    calories: 100,
    notes: '',
    kind: 'activity',
    source_session_id: null
  });

  db.updateRow('food_log', food.id, { calories: 450, protein: 65 });
  let row = db.getAllData().daily_ledger[0];
  assert.equal(row.food_calories, 450);
  assert.equal(row.protein, 65);
  assert.equal(row.activity_calories, 100);

  db.deleteRow('activities', activity.id);
  row = db.getAllData().daily_ledger[0];
  assert.equal(row.food_calories, 450);
  assert.equal(row.activity_calories, 0);
  assert.equal(row.activity_minutes, 0);
});
