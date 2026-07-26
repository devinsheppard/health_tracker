const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const Database = require('better-sqlite3');

const db = require('../src/db');

function tempUserData() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'health-tracker-db-'));
}

function openRaw(userDataPath) {
  return new Database(path.join(userDataPath, 'my-health-tracker.sqlite'));
}

test.afterEach(() => {
  db.close();
});

test('initializes a new database at the current schema version', () => {
  const userDataPath = tempUserData();

  db.init(userDataPath);

  assert.equal(db.getSchemaVersion(), db.SCHEMA_VERSION);

  const raw = openRaw(userDataPath);
  try {
    assert.equal(raw.pragma('user_version', { simple: true }), db.SCHEMA_VERSION);
    assert.deepEqual(raw.prepare('SELECT version, name FROM schema_migrations').all(), [
      { version: 1, name: 'baseline_health_tracker_schema' },
      { version: 2, name: 'daily_ledger_summary' },
      { version: 3, name: 'workout_templates' },
      { version: 4, name: 'profile_ui_scale' },
      { version: 5, name: 'custom_lab_test_catalog' },
      { version: 6, name: 'lab_result_catalog_metadata' },
      { version: 7, name: 'daily_step_log' },
      { version: 8, name: 'daily_ledger_step_totals' },
      { version: 9, name: 'blood_pressure_heart_rate' },
      { version: 10, name: 'carry_forward_effective_weight' }
    ]);
    assert.equal(raw.prepare('SELECT COUNT(*) AS count FROM profile').get().count, 1);
    assert.equal(raw.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'workout_templates'").get().count, 1);
    assert.equal(raw.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'lab_test_catalog_custom'").get().count, 1);
    assert.equal(raw.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'step_log'").get().count, 1);
    assert.equal(raw.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'blood_pressure_readings'").get().count, 1);
    const activityColumns = raw.prepare('PRAGMA table_info(activities)').all();
    assert.equal(activityColumns.find((column) => column.name === 'source_session_id').type, 'INTEGER');
    const labColumns = raw.prepare('PRAGMA table_info(lab_results)').all().map((column) => column.name);
    assert.equal(labColumns.includes('test_category'), true);
    assert.equal(labColumns.includes('unit'), true);
    assert.equal(labColumns.includes('catalog_source'), true);
    assert.equal(labColumns.includes('catalog_id'), true);
    const ledgerColumns = raw.prepare('PRAGMA table_info(daily_ledger)').all().map((column) => column.name);
    assert.equal(ledgerColumns.includes('step_count'), true);
    assert.equal(ledgerColumns.includes('step_calories'), true);
    assert.equal(ledgerColumns.includes('bp_count'), true);
    assert.equal(ledgerColumns.includes('systolic_avg'), true);
    assert.equal(ledgerColumns.includes('diastolic_avg'), true);
    assert.equal(ledgerColumns.includes('heart_rate_avg'), true);
    assert.equal(raw.prepare('SELECT ui_scale FROM profile WHERE id = 1').get().ui_scale, 'normal');
  } finally {
    raw.close();
  }
});

test('migration rebuilds historical ledger rows with effective carried weights', () => {
  const userDataPath = tempUserData();

  db.init(userDataPath);
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
  db.close();

  const raw = openRaw(userDataPath);
  try {
    raw.prepare("UPDATE daily_ledger SET weight = 0, body_fat = 0, lean_body_mass = 0 WHERE date = '2026-07-02'").run();
    raw.prepare('DELETE FROM schema_migrations WHERE version = 10').run();
    raw.pragma('user_version = 9');
  } finally {
    raw.close();
  }

  db.init(userDataPath);
  const data = db.getAllData();
  const carried = data.daily_ledger.find((row) => row.date === '2026-07-02');

  assert.equal(carried.weight, 240.2);
  assert.equal(carried.body_fat, 25);
  assert.equal(carried.lean_body_mass, 180.15);
  assert.equal(data.weight_log.length, 1);
});

test('migrates an existing unversioned database without losing rows', () => {
  const userDataPath = tempUserData();

  db.init(userDataPath);
  db.addRow('food_log', {
    date: '2026-07-01',
    meal_type: 'dinner',
    description: 'Chicken',
    net_carbs: 2,
    protein: 45,
    fat: 12,
    calories: 300
  });
  db.addRow('lab_results', {
    date: '2026-07-01',
    test_name: 'A1C',
    value: 5.8,
    reference_range: '<5.7',
    notes: 'older row'
  });
  db.close();

  const raw = openRaw(userDataPath);
  try {
    raw.pragma('user_version = 0');
    raw.prepare('DELETE FROM schema_migrations').run();
  } finally {
    raw.close();
  }

  db.init(userDataPath);
  const data = db.getAllData();

  assert.equal(db.getSchemaVersion(), db.SCHEMA_VERSION);
  assert.equal(data.food_log.length, 1);
  assert.equal(data.food_log[0].description, 'Chicken');
  assert.equal(data.lab_results.length, 1);
  assert.equal(data.lab_results[0].test_name, 'A1C');
  assert.equal(data.lab_results[0].unit, null);
  assert.equal(data.lab_results[0].catalog_source, null);
  assert.equal(data.daily_ledger.length, 1);
  assert.equal(data.daily_ledger[0].food_calories, 300);
  assert.equal(data.profile.ui_scale, 'normal');
  assert.deepEqual(data.lab_test_catalog_custom, []);
  assert.deepEqual(data.step_log, []);
});
