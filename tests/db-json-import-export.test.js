const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const db = require('../src/db');

function tempUserData() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'health-tracker-json-'));
}

test.afterEach(() => {
  db.close();
});

test('exports and imports full JSON while preserving ids and rebuilding ledger', () => {
  db.init(tempUserData());
  db.saveProfile({
    name: 'Import Export',
    sex: 'male',
    goals: 'weight loss',
    diet_type: 'keto',
    protein_target: 160,
    a1c_goal: 5.7,
    theme: 'dark'
  });
  const session = db.addRow('workout_sessions', {
    date: '2026-07-01',
    pre_glucose: 110,
    post_glucose: 100,
    duration: 60,
    effort: 'moderate',
    notes: 'lift'
  });
  const exercise = db.addRow('workout_exercises', {
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
  db.addRow('food_log', {
    date: '2026-07-01',
    meal_type: 'dinner',
    description: 'Chicken',
    net_carbs: 2,
    protein: 45,
    fat: 12,
    calories: 300
  });
  const steps = db.addRow('step_log', {
    date: '2026-07-01',
    steps: 7200,
    notes: 'Lunch walk and errands'
  });
  const bp = db.addRow('blood_pressure_readings', {
    date: '2026-07-01',
    time: '08:00',
    systolic: 126,
    diastolic: 80,
    heart_rate: 72,
    position: 'seated',
    notes: 'morning pressure'
  });
  const lab = db.addRow('lab_results', {
    date: '2026-07-01',
    test_name: 'Hemoglobin A1c',
    test_category: 'Diabetes',
    unit: '%',
    value: 5.8,
    reference_range: '<5.7',
    notes: 'lab note',
    catalog_source: 'built-in',
    catalog_id: 'diabetes-hemoglobin-a1c'
  });
  const template = db.addRow('workout_templates', {
    name: 'Saved push day',
    duration: 60,
    effort: 'moderate',
    notes: 'template',
    exercises: JSON.stringify([
      { muscle_group: 'Chest', exercise: 'Bench press', sets: 3, reps: 10, weight: 100, seconds: null, mode: 'bilateral' }
    ])
  });
  const customLab = db.addRow('lab_test_catalog_custom', {
    display_name: 'Personal Lab Marker',
    abbreviation: 'PLM',
    aliases: 'personal marker',
    category: 'Other',
    default_unit: 'units',
    reference_range: '10-20',
    notes: 'Saved custom lab test'
  });

  const exported = db.exportFullJson();
  assert.equal(exported.format, 'my-health-tracker-full-json');
  assert.equal(exported.data.profile.name, 'Import Export');
  assert.equal(exported.data.tables.workout_sessions[0].id, session.id);
  assert.equal(exported.data.tables.workout_exercises[0].id, exercise.id);
  assert.equal(exported.data.tables.workout_templates[0].id, template.id);
  assert.equal(exported.data.tables.step_log[0].id, steps.id);
  assert.equal(exported.data.tables.step_log[0].steps, 7200);
  assert.equal(exported.data.tables.blood_pressure_readings[0].id, bp.id);
  assert.equal(exported.data.tables.blood_pressure_readings[0].systolic, 126);
  assert.equal(exported.data.tables.lab_results[0].id, lab.id);
  assert.equal(exported.data.tables.lab_results[0].unit, '%');
  assert.equal(exported.data.tables.lab_test_catalog_custom[0].id, customLab.id);

  db.clearAll();
  assert.equal(db.getAllData().food_log.length, 0);

  const imported = db.importFullJson(exported);
  const data = imported.data;

  assert.equal(fs.existsSync(imported.safetyBackupPath), true);
  assert.equal(data.profile.name, 'Import Export');
  assert.equal(data.workout_sessions[0].id, session.id);
  assert.equal(data.workout_exercises[0].session_id, session.id);
  assert.equal(data.workout_templates[0].name, 'Saved push day');
  assert.equal(data.step_log[0].steps, 7200);
  assert.equal(data.blood_pressure_readings[0].heart_rate, 72);
  assert.equal(data.lab_results[0].catalog_id, 'diabetes-hemoglobin-a1c');
  assert.equal(data.lab_results[0].unit, '%');
  assert.equal(data.lab_test_catalog_custom[0].display_name, 'Personal Lab Marker');
  assert.equal(data.food_log[0].description, 'Chicken');
  assert.equal(data.daily_ledger[0].workout_volume, 3000);
  assert.equal(data.daily_ledger[0].food_calories, 300);
});

test('rejects invalid full JSON imports without replacing current rows', () => {
  db.init(tempUserData());
  db.addRow('food_log', {
    date: '2026-07-01',
    meal_type: 'dinner',
    description: 'Keep me',
    net_carbs: 2,
    protein: 45,
    fat: 12,
    calories: 300
  });

  assert.throws(() => db.importFullJson({ format: 'wrong', data: {} }), /full JSON export/);
  assert.throws(() => db.importFullJson({
    format: 'my-health-tracker-full-json',
    data: {
      profile: {},
      tables: {
        glucose_readings: [],
        food_log: [{ id: 1, date: '2026-07-01', meal_type: 'breakfast', calories: -1 }],
        workout_sessions: [],
        workout_exercises: [],
        workout_templates: [],
        activities: [],
        step_log: [],
        blood_pressure_readings: [],
        weight_log: [],
        sleep_log: [],
        medications: [],
        lab_results: [],
        lab_test_catalog_custom: []
      }
    }
  }), /Validation failed: calories/);

  const data = db.getAllData();
  assert.equal(data.food_log.length, 1);
  assert.equal(data.food_log[0].description, 'Keep me');
});

test('imports older full JSON exports without workout templates', () => {
  db.init(tempUserData());
  db.addRow('lab_results', {
    date: '2026-07-01',
    test_name: 'Legacy A1C',
    value: 5.8,
    reference_range: '<5.7',
    notes: 'Older export row.'
  });
  const exported = db.exportFullJson();
  delete exported.data.tables.workout_templates;
  delete exported.data.tables.lab_test_catalog_custom;
  delete exported.data.tables.step_log;
  delete exported.data.tables.blood_pressure_readings;
  delete exported.data.tables.lab_results[0].test_category;
  delete exported.data.tables.lab_results[0].unit;
  delete exported.data.tables.lab_results[0].catalog_source;
  delete exported.data.tables.lab_results[0].catalog_id;

  const imported = db.importFullJson(exported);

  assert.equal(imported.data.workout_templates.length, 0);
  assert.equal(imported.data.lab_test_catalog_custom.length, 0);
  assert.equal(imported.data.step_log.length, 0);
  assert.equal(imported.data.blood_pressure_readings.length, 0);
  assert.equal(imported.data.lab_results[0].test_name, 'Legacy A1C');
  assert.equal(imported.data.lab_results[0].unit, null);
  assert.equal(imported.data.lab_results[0].catalog_source, null);
});
