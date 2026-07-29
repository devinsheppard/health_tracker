const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const appJs = fs.readFileSync(path.join(root, 'src', 'renderer', 'app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'src', 'renderer', 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'src', 'renderer', 'styles.css'), 'utf8');
const packageJson = require('../package.json');

test('v2 renderer keeps every destination in grouped icon navigation', () => {
  for (const id of ['dashboard', 'glucose', 'bloodPressure', 'food', 'workouts', 'activity', 'weight', 'sleep', 'meds', 'labs', 'settings']) {
    assert.match(appJs, new RegExp(`['"]${id}['"]`));
  }
  for (const group of ['Overview', 'Vitals', 'Nutrition', 'Fitness', 'Health', 'System']) {
    assert.match(appJs, new RegExp(`['"]${group}['"]`));
  }
  assert.match(appJs, /aria-labelledby="nav-/);
  assert.match(appJs, /function appIcon/);
});

test('v2 dashboard derives supported cards from real application state', () => {
  const dashboard = appJs.slice(appJs.indexOf('function dashboard()'), appJs.indexOf('function dashboardStat'));

  assert.match(dashboard, /foodTotals\(\)/);
  assert.match(dashboard, /dailyBurn\(\)/);
  assert.match(dashboard, /glucoseSummary\(\)/);
  assert.match(dashboard, /state\.blood_pressure_readings/);
  assert.match(dashboard, /state\.sleep_log/);
  assert.match(dashboard, /effectiveWeightOnOrBefore/);
  assert.match(dashboard, /Protein goal/);
  assert.match(dashboard, /1 Million Pound Challenge/);
  assert.doesNotMatch(dashboard, /water|health score/i);
});

test('v2 visual system exposes accessible status, focus, contrast, and responsive contracts', () => {
  assert.match(indexHtml, /aria-label="Primary navigation"/);
  assert.match(indexHtml, /role="status" aria-live="polite"/);
  assert.match(indexHtml, /aria-label="Toggle light and dark theme"/);
  assert.match(styles, /button:focus-visible/);
  assert.match(styles, /--brand:\s*#e5484d/);
  assert.match(styles, /--good:\s*#48c78e/);
  assert.match(styles, /@media \(max-width: 1040px\)/);
  assert.match(styles, /\.table-wrap[\s\S]*overflow-x: auto/);
});

test('application release metadata is version 2.0.0', () => {
  assert.equal(packageJson.version, '2.0.0');
  assert.equal(packageJson.build.appId, 'com.local.myhealthtracker');
  assert.equal(packageJson.build.productName, 'My Health Tracker');
});
