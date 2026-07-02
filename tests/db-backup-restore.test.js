const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const db = require('../src/db');

function tempUserData() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'health-tracker-backup-'));
}

test.afterEach(() => {
  db.close();
});

test('backs up and restores a validated SQLite database with a safety copy', async () => {
  const userDataPath = tempUserData();
  const backupPath = path.join(userDataPath, 'backup.sqlite');
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

  const backup = await db.backup(backupPath);
  assert.equal(backup.path, backupPath);
  assert.equal(fs.existsSync(backupPath), true);

  db.addRow('food_log', {
    date: '2026-07-02',
    meal_type: 'breakfast',
    description: 'Eggs',
    net_carbs: 1,
    protein: 30,
    fat: 20,
    calories: 320
  });
  assert.equal(db.getAllData().food_log.length, 2);

  const restore = db.restore(backupPath);
  const data = db.getAllData();

  assert.equal(fs.existsSync(restore.safetyBackupPath), true);
  assert.equal(data.food_log.length, 1);
  assert.equal(data.food_log[0].description, 'Chicken');
  assert.equal(data.daily_ledger.length, 1);
  assert.equal(data.daily_ledger[0].food_calories, 300);
});

test('rejects corrupted restore files and keeps current data', () => {
  const userDataPath = tempUserData();
  const badBackupPath = path.join(userDataPath, 'bad.sqlite');
  db.init(userDataPath);

  db.addRow('food_log', {
    date: '2026-07-01',
    meal_type: 'dinner',
    description: 'Keep me',
    net_carbs: 2,
    protein: 45,
    fat: 12,
    calories: 300
  });
  fs.writeFileSync(badBackupPath, 'not sqlite');

  assert.throws(() => db.restore(badBackupPath), /file is not a database|Backup/);
  const data = db.getAllData();

  assert.equal(data.food_log.length, 1);
  assert.equal(data.food_log[0].description, 'Keep me');
});

test('does not allow backup to overwrite the active database', async () => {
  const userDataPath = tempUserData();
  db.init(userDataPath);

  await assert.rejects(
    () => db.backup(path.join(userDataPath, 'my-health-tracker.sqlite')),
    /Backup target cannot replace the active database/
  );
});
