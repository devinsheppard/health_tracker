const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'app.js'), 'utf8');

test('shared delete handler clears stale state without taking over global input focus', () => {
  const bindDeletes = appJs.slice(appJs.indexOf('function bindDeletes()'), appJs.indexOf('function formData(form)'));

  assert.match(bindDeletes, /await confirmDelete\('Delete this entry\?'\)/);
  assert.match(bindDeletes, /clearDeletedState\(tableName, id\)/);
  assert.match(bindDeletes, /api\.delete\(tableName, id\)/);
  assert.doesNotMatch(bindDeletes, /confirm\(/);
  assert.doesNotMatch(bindDeletes, /releaseInputFocus\(\)/);
  assert.doesNotMatch(bindDeletes, /focusFirstEditableInput\(\)/);
});

test('activity detail delete uses cleanup without global blur or forced focus', () => {
  const detailDelete = appJs.slice(appJs.indexOf("document.querySelector('[data-delete-detail]'"), appJs.indexOf('function bindExerciseFormIfPresent()'));

  assert.match(detailDelete, /await confirmDelete/);
  assert.match(detailDelete, /clearDeletedState\('workout_sessions'/);
  assert.match(detailDelete, /clearDeletedState\('activities'/);
  assert.doesNotMatch(detailDelete, /confirm\(/);
  assert.doesNotMatch(detailDelete, /releaseInputFocus\(\)/);
  assert.doesNotMatch(detailDelete, /focusFirstEditableInput\(\)/);
});

test('delete confirmation is app-rendered and always removes its overlay', () => {
  const confirmDelete = appJs.slice(appJs.indexOf('function confirmDelete'), appJs.indexOf('function clearDeletedState'));

  assert.match(confirmDelete, /confirm-backdrop/);
  assert.match(confirmDelete, /dialog\.remove\(\)/);
  assert.match(confirmDelete, /document\.removeEventListener\('keydown', onKeyDown, true\)/);
  assert.doesNotMatch(confirmDelete, /window\.confirm/);
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
