const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const db = require('../src/db');

function tempUserData() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'health-tracker-validation-'));
}

function init() {
  db.init(tempUserData());
}

test.afterEach(() => {
  db.close();
});

test('accepts valid profile and health rows', () => {
  init();

  db.saveProfile({
    name: 'Tester',
    date_of_birth: '1980-01-01',
    sex: 'male',
    height_ft: 6,
    height_in: 1,
    current_weight: 240,
    body_fat: 25,
    lean_body_mass: 180,
    goals: 'weight loss',
    diet_type: 'keto',
    medical_conditions: '',
    protein_target: 160,
    a1c_goal: 5.7,
    theme: 'dark',
    ui_scale: 'large',
    eating_window: ''
  });

  db.addRow('glucose_readings', { date: '2026-07-01', time: '07:15', context: 'fasting morning', value: 110, notes: '' });
  db.addRow('food_log', { date: '2026-07-01', meal_type: 'breakfast', description: 'Eggs', net_carbs: 2, protein: 30, fat: 22, calories: 330 });
  db.addRow('weight_log', { date: '2026-07-01', weight: 240, body_fat: 25, lean_body_mass: 180, notes: '' });
  db.addRow('sleep_log', { date: '2026-07-01', hours: 7.5, quality: 'good', morning_glucose: 108, notes: '' });
  db.addRow('lab_results', {
    date: '2026-07-01',
    test_name: 'Hemoglobin A1c',
    test_category: 'Diabetes',
    unit: '%',
    value: 5.8,
    reference_range: '<5.7',
    notes: '',
    catalog_source: 'built-in',
    catalog_id: 'diabetes-hemoglobin-a1c'
  });

  const data = db.getAllData();
  assert.equal(data.profile.sex, 'male');
  assert.equal(data.profile.ui_scale, 'large');
  assert.equal(data.lab_results[0].unit, '%');
  assert.equal(data.lab_results[0].catalog_source, 'built-in');
  assert.equal(data.daily_ledger.length, 1);
  assert.equal(data.daily_ledger[0].food_calories, 330);
});

test('accepts valid workout and activity rows', () => {
  init();

  const session = db.addRow('workout_sessions', {
    date: '2026-07-01',
    pre_glucose: 110,
    post_glucose: 100,
    duration: 60,
    effort: 'moderate',
    notes: ''
  });

  db.addRow('workout_exercises', {
    session_id: session.id,
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
    name: 'Moderate walking',
    met: 3.5,
    duration: 30,
    calories: 150,
    notes: '',
    kind: 'activity',
    source_session_id: null
  });

  const row = db.getAllData().daily_ledger[0];
  assert.equal(row.workout_volume, 3000);
  assert.equal(row.activity_calories, 150);
});

test('accepts valid workout templates', () => {
  init();

  db.addRow('workout_templates', {
    name: 'Push day',
    duration: 60,
    effort: 'moderate',
    notes: 'Reusable draft',
    exercises: JSON.stringify([
      { muscle_group: 'Chest', exercise: 'Bench press', sets: 3, reps: 10, weight: 100, seconds: null, mode: 'bilateral' },
      { muscle_group: 'Chest', exercise: 'Push-ups', sets: 3, reps: 12, weight: null, seconds: null, mode: 'bodyweight' }
    ])
  });

  const template = db.getAllData().workout_templates[0];
  assert.equal(template.name, 'Push day');
  assert.equal(JSON.parse(template.exercises).length, 2);
});

test('accepts valid custom lab catalog tests', () => {
  init();

  db.addRow('lab_test_catalog_custom', {
    display_name: 'Experimental Marker',
    abbreviation: 'EXP',
    aliases: 'experimental marker, research marker',
    category: 'Other',
    default_unit: 'units',
    reference_range: '1-5',
    notes: 'Personal catalog default, editable when logging.'
  });

  const custom = db.getAllData().lab_test_catalog_custom[0];
  assert.equal(custom.display_name, 'Experimental Marker');
  assert.equal(custom.category, 'Other');
});

test('saves lab results from custom catalog tests', () => {
  init();

  const custom = db.addRow('lab_test_catalog_custom', {
    display_name: 'Experimental Marker',
    abbreviation: '',
    aliases: '',
    category: 'Other',
    default_unit: 'units',
    reference_range: '1-5',
    notes: 'Personal catalog default.'
  });

  db.addRow('lab_results', {
    date: '2026-07-01',
    test_name: 'Experimental Marker',
    test_category: 'Other',
    unit: 'units',
    value: 3,
    reference_range: '1-5',
    notes: 'Logged from custom test.',
    catalog_source: 'custom',
    catalog_id: String(custom.id)
  });

  const data = db.getAllData();
  assert.equal(data.lab_test_catalog_custom[0].display_name, 'Experimental Marker');
  assert.equal(data.lab_results[0].catalog_source, 'custom');
  assert.equal(data.lab_results[0].catalog_id, String(custom.id));
  assert.equal(data.lab_results[0].test_name, 'Experimental Marker');
});


test('rejects invalid profile values', () => {
  init();

  assert.throws(() => db.saveProfile({ sex: 'unknown', theme: 'dark' }), /Validation failed: sex/);
  assert.throws(() => db.saveProfile({ sex: 'male', theme: 'dark', ui_scale: 'giant' }), /Validation failed: ui_scale/);
  assert.throws(() => db.saveProfile({ date_of_birth: '2026-02-31', sex: 'male' }), /Validation failed: date_of_birth/);
  assert.equal(db.getAllData().profile.sex, null);
});

test('rejects invalid health rows without saving them', () => {
  init();

  assert.throws(() => db.addRow('glucose_readings', {
    date: '2026-07-01',
    time: '25:00',
    context: 'fasting morning',
    value: 110,
    notes: ''
  }), /Validation failed: time/);
  assert.throws(() => db.addRow('food_log', {
    date: '2026-07-01',
    meal_type: 'breakfast',
    description: 'Invalid',
    net_carbs: -1,
    protein: 20,
    fat: 10,
    calories: 200
  }), /Validation failed: net_carbs/);
  assert.throws(() => db.addRow('sleep_log', {
    date: '2026-07-01',
    hours: 30,
    quality: 'good',
    morning_glucose: 100,
    notes: ''
  }), /Validation failed: hours/);
  assert.throws(() => db.addRow('lab_test_catalog_custom', {
    display_name: '',
    abbreviation: 'BAD',
    aliases: '',
    category: 'Other',
    default_unit: '',
    reference_range: '',
    notes: ''
  }), /Validation failed: display_name/);

  const data = db.getAllData();
  assert.equal(data.glucose_readings.length, 0);
  assert.equal(data.food_log.length, 0);
  assert.equal(data.sleep_log.length, 0);
  assert.equal(data.lab_test_catalog_custom.length, 0);
});

test('rejects invalid workout and activity rows without saving them', () => {
  init();

  assert.throws(() => db.addRow('workout_sessions', {
    date: '2026-07-01',
    pre_glucose: 110,
    post_glucose: 100,
    duration: 60,
    effort: 'extreme',
    notes: ''
  }), /Validation failed: effort/);
  assert.throws(() => db.addRow('workout_exercises', {
    session_id: 1,
    muscle_group: 'Chest',
    exercise: 'Bench press',
    sets: 3,
    reps: 10,
    weight: 100,
    seconds: null,
    mode: 'sideways',
    pounds: 3000
  }), /Validation failed: mode/);
  assert.throws(() => db.addRow('activities', {
    date: '2026-07-01',
    name: 'Impossible',
    met: 99,
    duration: 30,
    calories: 100,
    notes: '',
    kind: 'activity',
    source_session_id: null
  }), /Validation failed: met/);
  assert.throws(() => db.addRow('workout_templates', {
    name: 'Bad template',
    duration: 60,
    effort: 'moderate',
    notes: '',
    exercises: '[{"mode":"sideways"}]'
  }), /Validation failed: muscle_group/);

  const data = db.getAllData();
  assert.equal(data.workout_sessions.length, 0);
  assert.equal(data.workout_exercises.length, 0);
  assert.equal(data.activities.length, 0);
  assert.equal(data.workout_templates.length, 0);
});

test('validates partial edits without requiring unchanged fields', () => {
  init();
  const food = db.addRow('food_log', {
    date: '2026-07-01',
    meal_type: 'dinner',
    description: 'Chicken',
    net_carbs: 4,
    protein: 50,
    fat: 10,
    calories: 300
  });

  db.updateRow('food_log', food.id, { calories: 450 });
  assert.equal(db.getAllData().food_log[0].calories, 450);
  assert.throws(() => db.updateRow('food_log', food.id, { calories: -1 }), /Validation failed: calories/);
  assert.equal(db.getAllData().food_log[0].calories, 450);
});

test('updates lab results without creating duplicate records', () => {
  init();

  const lab = db.addRow('lab_results', {
    date: '2026-07-01',
    test_name: 'Hemoglobin A1c',
    test_category: 'Diabetes',
    unit: '%',
    value: 5.8,
    reference_range: '<5.7',
    notes: 'Original result.',
    catalog_source: 'built-in',
    catalog_id: 'diabetes-hemoglobin-a1c'
  });

  db.updateRow('lab_results', lab.id, {
    date: '2026-07-02',
    test_name: 'Hemoglobin A1c',
    test_category: 'Diabetes',
    unit: '%',
    value: 5.5,
    reference_range: '<5.7',
    notes: 'Edited result.',
    catalog_source: 'built-in',
    catalog_id: 'diabetes-hemoglobin-a1c'
  });

  const rows = db.getAllData().lab_results;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, lab.id);
  assert.equal(rows[0].date, '2026-07-02');
  assert.equal(rows[0].value, 5.5);
  assert.equal(rows[0].notes, 'Edited result.');
});
