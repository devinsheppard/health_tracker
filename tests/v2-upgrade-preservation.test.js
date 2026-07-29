const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const db = require('../src/db');
const { seedCurrentReleaseData } = require('./fixtures/current-release-data');

test('v2 opens a realistic copy of current release data without changing records', () => {
  const currentDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'health-tracker-v1-data-'));
  const upgradedDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'health-tracker-v2-data-'));

  try {
    db.init(currentDataDir);
    seedCurrentReleaseData(db);
    const before = db.getAllData();
    const schemaBefore = db.getSchemaVersion();
    db.close();

    fs.copyFileSync(
      path.join(currentDataDir, 'my-health-tracker.sqlite'),
      path.join(upgradedDataDir, 'my-health-tracker.sqlite')
    );

    db.init(upgradedDataDir);
    const after = db.getAllData();

    assert.equal(schemaBefore, 11);
    assert.equal(db.getSchemaVersion(), schemaBefore);
    assert.deepEqual(after, before);
    assert.equal(after.profile.name, 'Upgrade Test User');
    assert.equal(after.glucose_readings[0].value, 104);
    assert.equal(after.workout_exercises[0].exercise, 'Bench press');
    assert.equal(after.step_log[0].steps, 7250);
    assert.equal(after.lab_results[0].test_name, 'Hemoglobin A1c');
  } finally {
    db.close();
    fs.rmSync(currentDataDir, { recursive: true, force: true });
    fs.rmSync(upgradedDataDir, { recursive: true, force: true });
  }
});
