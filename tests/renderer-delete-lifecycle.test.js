const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'app.js'), 'utf8');

test('shared delete handler releases focus, clears stale state, and restores input focus', () => {
  const bindDeletes = appJs.slice(appJs.indexOf('function bindDeletes()'), appJs.indexOf('function formData(form)'));

  assert.match(bindDeletes, /releaseInputFocus\(\)/);
  assert.match(bindDeletes, /clearDeletedState\(tableName, id\)/);
  assert.match(bindDeletes, /focusFirstEditableInput\(\)/);
  assert.match(bindDeletes, /api\.delete\(tableName, id\)/);
});

test('activity detail delete uses the same cleanup path as list deletes', () => {
  const detailDelete = appJs.slice(appJs.indexOf("document.querySelector('[data-delete-detail]'"), appJs.indexOf('function bindExerciseFormIfPresent()'));

  assert.match(detailDelete, /releaseInputFocus\(\)/);
  assert.match(detailDelete, /clearDeletedState\('workout_sessions'/);
  assert.match(detailDelete, /clearDeletedState\('activities'/);
  assert.match(detailDelete, /focusFirstEditableInput\(\)/);
});

test('delete cleanup clears stale edit and selection state for affected tables', () => {
  const cleanup = appJs.slice(appJs.indexOf('function clearDeletedState'), appJs.indexOf('function formData(form)'));

  assert.match(cleanup, /selectedWorkoutSessionId = null/);
  assert.match(cleanup, /editingWorkoutSessionId = null/);
  assert.match(cleanup, /editingExerciseId = null/);
  assert.match(cleanup, /selectedActivityId = null/);
  assert.match(cleanup, /editingActivityId = null/);
  assert.match(cleanup, /editingStepLogId = null/);
  assert.match(cleanup, /editingLabResultId = null/);
});
