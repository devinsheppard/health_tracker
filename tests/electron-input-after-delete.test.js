const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { pathToFileURL } = require('node:url');
let harnessStep = 'startup';

if (process.versions.electron) {
  runElectronHarness().catch((error) => {
    console.log(`HT_E2E_RESULT ${JSON.stringify({ ok: false, step: harnessStep, error: error.stack || error.message })}`);
    const { app } = require('electron');
    app.quit();
    setTimeout(() => process.exit(1), 250);
  });
} else {
  test('keyboard input works globally after deleting a saved record in the real renderer', {
    skip: process.env.HT_RUN_ELECTRON_E2E === '1' ? false : 'Set HT_RUN_ELECTRON_E2E=1 after rebuilding native modules for Electron to run this diagnostic harness.'
  }, async () => {
    const electronPath = require('electron');
    const child = spawn(electronPath, [__filename], {
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        HT_E2E_CHILD: '1'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    const exitCode = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error(`Electron input regression harness timed out.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`));
      }, 60000);
      child.on('exit', (code) => {
        clearTimeout(timeout);
        resolve(code);
      });
    });

    const resultLine = stdout.split(/\r?\n/).find((line) => line.startsWith('HT_E2E_RESULT '));
    assert.ok(resultLine, `No harness result found.\nExit: ${exitCode}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`);
    const result = JSON.parse(resultLine.slice('HT_E2E_RESULT '.length));
    assert.equal(result.ok, true, JSON.stringify(result, null, 2));
    assert.equal(result.beforeDelete.value, '101');
    assert.notEqual(result.beforeDeleteDropdown.before, result.beforeDeleteDropdown.after);
    assert.equal(result.beforeDeleteSpinner.after > result.beforeDeleteSpinner.before, true);
    assert.equal(result.afterDeleteSameTab.value, '155');
    assert.notEqual(result.afterDeleteSameTabDropdown.before, result.afterDeleteSameTabDropdown.after);
    assert.equal(result.afterDeleteSameTabSpinner.after > result.afterDeleteSameTabSpinner.before, true);
    assert.equal(result.afterFoodDelete.description.value, 'eggs and coffee');
    assert.equal(result.afterFoodDelete.calories.value, '450');
    assert.notEqual(result.afterFoodDelete.dropdown.before, result.afterFoodDelete.dropdown.after);
    assert.equal(result.afterFoodDelete.spinner.after > result.afterFoodDelete.spinner.before, true);
    assert.equal(result.afterDeleteOtherTab.value, '120');
    assert.equal(result.afterDeleteOtherTab.inputEvents > 0, true);
    assert.notEqual(result.afterDeleteOtherTabDropdown.before, result.afterDeleteOtherTabDropdown.after);
    assert.equal(result.afterSecondDelete.value, '202');
    assert.equal(result.afterWorkoutExerciseDelete.sets.value, '3');
    assert.equal(result.afterWorkoutExerciseDelete.reps.value, '10');
    assert.equal(result.afterWorkoutExerciseDelete.weight.value, '55');
    assert.equal(result.afterWorkoutExerciseDelete.weight.inputEvents > 0, true);
    assert.notEqual(result.afterWorkoutExerciseDelete.dropdown.before, result.afterWorkoutExerciseDelete.dropdown.after);
    assert.deepEqual(result.savedPostDeleteValues, {
      glucoseSaved: true,
      bloodPressureSaved: true,
      weightSaved: true,
      exerciseSaved: true
    });
  });
}

async function runElectronHarness() {
  const { app, BrowserWindow, ipcMain } = require('electron');
  const db = require('../src/db');
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'health-tracker-e2e-'));

  app.setPath('userData', userData);
  app.commandLine.appendSwitch('disable-gpu');

  await app.whenReady();
  db.init(userData);

  ipcMain.handle('data:getAll', () => db.getAllData());
  ipcMain.handle('data:saveProfile', (_event, profile) => db.saveProfile(profile));
  ipcMain.handle('data:settings', (_event, settings) => db.saveSettings(settings));
  ipcMain.handle('data:add', (_event, table, row) => db.addRow(table, row));
  ipcMain.handle('data:update', (_event, table, id, row) => db.updateRow(table, id, row));
  ipcMain.handle('data:delete', (_event, table, id) => db.deleteRow(table, id));
  ipcMain.handle('data:clearAll', () => db.clearAll());
  ipcMain.handle('db:backup', () => ({ canceled: true }));
  ipcMain.handle('db:restore', () => ({ canceled: true }));
  ipcMain.handle('app:exportJson', () => ({ canceled: true }));
  ipcMain.handle('app:exportFullJson', () => ({ canceled: true }));
  ipcMain.handle('app:importFullJson', () => ({ canceled: true }));

  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  const consoleMessages = [];
  win.webContents.on('console-message', (_event, _level, message) => {
    consoleMessages.push(message);
  });

  harnessStep = 'load renderer';
  await win.loadURL(pathToFileURL(path.join(__dirname, '..', 'src', 'renderer', 'index.html')).href);
  harnessStep = 'wait for nav';
  await waitFor(win, 'document.querySelector("[data-page=\\"glucose\\"]")');
  harnessStep = 'install diagnostics';
  await installDiagnostics(win);
  harnessStep = 'seed records';
  await seedRecords(win);
  harnessStep = 'navigate glucose';
  await navigate(win, 'glucose');

  harnessStep = 'type before delete';
  const beforeDelete = await keyboardReplace(win, '#glucoseForm input[name="value"]', '100', '101');
  harnessStep = 'dropdown before delete';
  const beforeDeleteDropdown = await selectNextOption(win, '#glucoseForm select[name="context"]');
  harnessStep = 'spinner before delete';
  const beforeDeleteSpinner = await incrementNumberInput(win, '#glucoseForm input[name="value"]', '101');
  harnessStep = 'delete glucose';
  const glucoseDelete = await clickDelete(win, 'glucose_readings');
  harnessStep = 'type glucose after delete';
  const afterDeleteSameTab = await keyboardReplace(win, '#glucoseForm input[name="value"]', '100', '155');
  harnessStep = 'dropdown same tab after delete';
  const afterDeleteSameTabDropdown = await selectNextOption(win, '#glucoseForm select[name="context"]');
  harnessStep = 'spinner same tab after delete';
  const afterDeleteSameTabSpinner = await incrementNumberInput(win, '#glucoseForm input[name="value"]', '155');
  harnessStep = 'navigate food';
  await navigate(win, 'food');
  harnessStep = 'delete food';
  const foodDelete = await clickDelete(win, 'food_log');
  harnessStep = 'text and calories after food delete';
  const afterFoodDelete = {
    description: await keyboardReplace(win, '#foodForm input[name="description"]', 'old text', 'eggs and coffee'),
    dropdown: await selectNextOption(win, '#foodForm select[name="meal_type"]'),
    calories: await keyboardReplace(win, '#foodForm input[name="calories"]', '20', '450'),
    spinner: await incrementNumberInput(win, '#foodForm input[name="calories"]', '450')
  };

  harnessStep = 'navigate blood pressure';
  await navigate(win, 'bloodPressure');
  harnessStep = 'type blood pressure after delete';
  const afterDeleteOtherTab = await keyboardReplace(win, '#bloodPressureForm input[name="systolic"]', '118', '120');
  harnessStep = 'dropdown other tab after delete';
  const afterDeleteOtherTabDropdown = await selectNextOption(win, '#bloodPressureForm select[name="position"]');

  harnessStep = 'delete blood pressure';
  const bloodPressureDelete = await clickDelete(win, 'blood_pressure_readings');
  harnessStep = 'navigate weight';
  await navigate(win, 'weight');
  harnessStep = 'type weight after second delete';
  const afterSecondDelete = await keyboardReplace(win, '#weightForm input[name="weight"]', '240', '202');
  harnessStep = 'navigate workouts';
  await navigate(win, 'workouts');
  harnessStep = 'delete workout exercise';
  const workoutExerciseDelete = await clickDelete(win, 'workout_exercises');
  harnessStep = 'type workout exercise after delete';
  const afterWorkoutExerciseDelete = {
    sets: await keyboardReplace(win, '#workoutSessionForm input[name="ex_sets"]', '1', '3'),
    reps: await keyboardReplace(win, '#workoutSessionForm input[name="ex_reps"]', '1', '10'),
    weight: await keyboardReplace(win, '#workoutSessionForm input[name="ex_weight"]', '50', '55'),
    dropdown: await selectNextOption(win, '#workoutSessionForm select[name="ex_muscle_group"]')
  };
  harnessStep = 'save post-delete values';
  const savedPostDeleteValues = await savePostDeleteValues(win);

  console.log(`HT_E2E_RESULT ${JSON.stringify({
    ok: true,
    beforeDelete,
    beforeDeleteDropdown,
    beforeDeleteSpinner,
    afterDeleteSameTab,
    afterDeleteSameTabDropdown,
    afterDeleteSameTabSpinner,
    afterFoodDelete,
    afterDeleteOtherTab,
    afterDeleteOtherTabDropdown,
    afterSecondDelete,
    afterWorkoutExerciseDelete,
    savedPostDeleteValues,
    deletes: {
      glucoseDelete,
      foodDelete,
      bloodPressureDelete,
      workoutExerciseDelete
    },
    consoleMessages
  })}`);

  db.close();
  await win.close();
  await app.quit();
}

async function seedRecords(win) {
  await win.webContents.executeJavaScript(`
    (async () => {
      await window.healthApi.saveSettings({ current_weight: 240, theme: 'dark' });
      await window.healthApi.add('glucose_readings', { date: '2026-07-20', time: '08:00', context: 'fasting morning', value: 100, notes: 'seed' });
      await window.healthApi.add('blood_pressure_readings', { date: '2026-07-20', time: '08:10', systolic: 118, diastolic: 78, heart_rate: 70, position: 'seated', notes: 'seed' });
      await window.healthApi.add('weight_log', { date: '2026-07-20', weight: 240, body_fat: 25, lean_body_mass: 180, notes: 'seed' });
      await window.healthApi.add('food_log', { date: '2026-07-20', meal_type: 'breakfast', description: 'seed', net_carbs: 1, protein: 1, fat: 1, calories: 20 });
      const session = await window.healthApi.add('workout_sessions', { date: '2026-07-20', pre_glucose: null, post_glucose: null, duration: 10, effort: 'moderate', notes: 'seed' });
      await window.healthApi.add('activities', { date: '2026-07-20', name: 'Resistance training (moderate)', met: 5, duration: 10, calories: 50, notes: 'seed', kind: 'workout', source_session_id: session.id });
      await window.healthApi.add('workout_exercises', { session_id: session.id, muscle_group: 'Chest', exercise: 'Bench press', sets: 1, reps: 1, weight: 50, seconds: null, mode: 'bilateral', pounds: 50 });
      await refresh();
    })();
  `);
  await navigate(win, 'glucose');
  await waitFor(win, 'document.querySelector("[data-table=\\"glucose_readings\\"][data-delete]")');
}

async function installDiagnostics(win) {
  await win.webContents.executeJavaScript(`
    window.__inputProbe = [];
    window.__selectProbe = [];
    window.__deleteProbe = [];
    for (const eventName of ['keydown', 'beforeinput', 'input', 'keyup']) {
      document.addEventListener(eventName, (event) => {
        const target = event.target;
        window.__inputProbe.push({
          eventName,
          tag: target?.tagName,
          name: target?.name || '',
          value: target?.value || '',
          key: event.key || '',
          inputType: event.inputType || ''
        });
      }, true);
    }
    for (const eventName of ['pointerdown', 'mousedown', 'click', 'input', 'change']) {
      document.addEventListener(eventName, (event) => {
        const target = event.target;
        if (target?.tagName === 'SELECT') {
          window.__selectProbe.push({
            eventName,
            name: target.name || '',
            value: target.value || ''
          });
        }
      }, true);
    }
  `);
}

async function navigate(win, page) {
  await win.webContents.executeJavaScript(`document.querySelector('[data-page="${page}"]').click();`);
  await waitFor(win, `document.querySelector('.nav-button.active')?.dataset.page === '${page}'`);
}

async function clickDelete(win, tableName) {
  await win.webContents.executeJavaScript(`
    (() => {
      window.__inputProbe = [];
      window.__deleteProbe.push({ tableName: ${JSON.stringify(tableName)}, phase: 'before-click', activeElement: document.activeElement?.outerHTML || '' });
      const button = document.querySelector('[data-table="${tableName}"][data-delete]');
      if (!button) {
        throw new Error('No delete button for ${tableName}. Active page: ' + document.querySelector('.nav-button.active')?.dataset.page + '. Delete buttons: ' + [...document.querySelectorAll('[data-delete]')].map((node) => node.dataset.table).join(','));
      }
      button.click();
    })();
  `);
  await waitFor(win, `document.querySelector('.confirm-backdrop [data-confirm-ok]')`);
  await win.webContents.executeJavaScript(`document.querySelector('.confirm-backdrop [data-confirm-ok]').click();`);
  await waitFor(win, `!document.querySelector('.confirm-backdrop')`);
  await waitFor(win, `!document.querySelector('[data-table="${tableName}"][data-delete]')`);
  await delay(100);
  return win.webContents.executeJavaScript(`
    (() => {
      window.__deleteProbe.push({
        tableName: ${JSON.stringify(tableName)},
        phase: 'after-delete',
        hasFocus: document.hasFocus(),
        activeElement: document.activeElement?.outerHTML || '',
        deleteButtons: [...document.querySelectorAll('[data-delete]')].map((node) => node.dataset.table)
      });
      return window.__deleteProbe.filter((entry) => entry.tableName === ${JSON.stringify(tableName)});
    })();
  `);
}

async function selectNextOption(win, selector) {
  win.focus();
  win.webContents.focus();
  await waitFor(win, `document.querySelector(${JSON.stringify(selector)})`);
  return win.webContents.executeJavaScript(`
    (() => {
      window.__selectProbe = [];
      const select = document.querySelector(${JSON.stringify(selector)});
      if (!select) throw new Error('Missing select ${selector}. Active page: ' + document.querySelector('.nav-button.active')?.dataset.page);
      const before = select.value;
      select.focus();
      select.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      select.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      select.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      select.selectedIndex = Math.min(select.options.length - 1, select.selectedIndex + 1);
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return {
        before,
        after: select.value,
        active: document.activeElement === select,
        events: window.__selectProbe
      };
    })();
  `);
}

async function incrementNumberInput(win, selector, value) {
  win.focus();
  win.webContents.focus();
  await waitFor(win, `document.querySelector(${JSON.stringify(selector)})`);
  return win.webContents.executeJavaScript(`
    (() => {
      const input = document.querySelector(${JSON.stringify(selector)});
      if (!input) throw new Error('Missing number input ${selector}. Active page: ' + document.querySelector('.nav-button.active')?.dataset.page);
      const button = input.closest('.number-control')?.querySelector('[data-number-step="1"]');
      if (!button) throw new Error('Missing number step button ${selector}. Active page: ' + document.querySelector('.nav-button.active')?.dataset.page);
      input.focus();
      input.value = ${JSON.stringify(value)};
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const before = Number(input.value);
      button.click();
      return {
        before,
        after: Number(input.value),
        active: document.activeElement === input
      };
    })();
  `);
}

async function keyboardReplace(win, selector, initialText, replacementText) {
  win.focus();
  win.webContents.focus();
  await waitFor(win, `document.querySelector(${JSON.stringify(selector)})`);
  await win.webContents.executeJavaScript(`
    (() => {
      window.__inputProbe = [];
      const input = document.querySelector(${JSON.stringify(selector)});
      if (!input) throw new Error('Missing input ${selector}. Active page: ' + document.querySelector('.nav-button.active')?.dataset.page);
      if (input.disabled || input.readOnly) throw new Error('Input is disabled/readOnly: ${selector}');
      input.focus();
      input.value = ${JSON.stringify(initialText)};
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.select();
    })();
  `);
  win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Backspace' });
  win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Backspace' });
  await delay(40);
  for (const char of replacementText) {
    win.webContents.sendInputEvent({ type: 'keyDown', keyCode: char });
    win.webContents.sendInputEvent({ type: 'char', keyCode: char });
    win.webContents.sendInputEvent({ type: 'keyUp', keyCode: char });
    await delay(20);
  }
  await delay(100);
  return win.webContents.executeJavaScript(`
    (() => {
      const input = document.querySelector(${JSON.stringify(selector)});
      return {
        value: input?.value || '',
        active: document.activeElement === input,
        keyEvents: window.__inputProbe.filter((event) => event.eventName === 'keydown').length,
        beforeInputEvents: window.__inputProbe.filter((event) => event.eventName === 'beforeinput').length,
        inputEvents: window.__inputProbe.filter((event) => event.eventName === 'input').length,
        events: window.__inputProbe
      };
    })();
  `);
}

async function savePostDeleteValues(win) {
  await navigate(win, 'glucose');
  await keyboardReplace(win, '#glucoseForm input[name="value"]', '100', '155');
  await win.webContents.executeJavaScript(`document.querySelector('#glucoseForm').requestSubmit();`);
  await waitFor(win, `(state.glucose_readings || []).some((row) => Number(row.value) === 155)`);

  await navigate(win, 'bloodPressure');
  await keyboardReplace(win, '#bloodPressureForm input[name="systolic"]', '118', '120');
  await keyboardReplace(win, '#bloodPressureForm input[name="diastolic"]', '78', '80');
  await win.webContents.executeJavaScript(`document.querySelector('#bloodPressureForm').requestSubmit();`);
  await waitFor(win, `(state.blood_pressure_readings || []).some((row) => Number(row.systolic) === 120 && Number(row.diastolic) === 80)`);

  await navigate(win, 'weight');
  await keyboardReplace(win, '#weightForm input[name="weight"]', '240', '202');
  await win.webContents.executeJavaScript(`document.querySelector('#weightForm').requestSubmit();`);
  await waitFor(win, `(state.weight_log || []).some((row) => Number(row.weight) === 202)`);

  await navigate(win, 'workouts');
  await keyboardReplace(win, '#workoutSessionForm input[name="duration"]', '10', '30');
  await keyboardReplace(win, '#workoutSessionForm input[name="ex_sets"]', '1', '3');
  await keyboardReplace(win, '#workoutSessionForm input[name="ex_reps"]', '1', '10');
  await keyboardReplace(win, '#workoutSessionForm input[name="ex_weight"]', '50', '55');
  await win.webContents.executeJavaScript(`document.querySelector('[data-add-draft-exercise]').click();`);
  await waitFor(win, `document.querySelector('#workoutSessionForm .table-wrap')`);
  await win.webContents.executeJavaScript(`document.querySelector('#workoutSessionForm').requestSubmit();`);
  await waitFor(win, `(state.workout_exercises || []).some((row) => Number(row.sets) === 3 && Number(row.reps) === 10 && Number(row.weight) === 55)`);

  return win.webContents.executeJavaScript(`
    (() => ({
      glucoseSaved: (state.glucose_readings || []).some((row) => Number(row.value) === 155),
      bloodPressureSaved: (state.blood_pressure_readings || []).some((row) => Number(row.systolic) === 120 && Number(row.diastolic) === 80),
      weightSaved: (state.weight_log || []).some((row) => Number(row.weight) === 202),
      exerciseSaved: (state.workout_exercises || []).some((row) => Number(row.sets) === 3 && Number(row.reps) === 10 && Number(row.weight) === 55)
    }))();
  `);
}

async function keyboardType(win, selector, text) {
  win.focus();
  win.webContents.focus();
  await waitFor(win, `document.querySelector(${JSON.stringify(selector)})`);
  await win.webContents.executeJavaScript(`
    (() => {
      window.__inputProbe = [];
      const input = document.querySelector(${JSON.stringify(selector)});
      if (!input) throw new Error('Missing input ${selector}. Active page: ' + document.querySelector('.nav-button.active')?.dataset.page);
      if (input.disabled || input.readOnly) throw new Error('Input is disabled/readOnly: ${selector}');
      input.focus();
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })();
  `);
  for (const char of text) {
    win.webContents.sendInputEvent({ type: 'keyDown', keyCode: char });
    win.webContents.sendInputEvent({ type: 'char', keyCode: char });
    win.webContents.sendInputEvent({ type: 'keyUp', keyCode: char });
    await delay(20);
  }
  await delay(100);
  return win.webContents.executeJavaScript(`
    (() => {
      const input = document.querySelector(${JSON.stringify(selector)});
      return {
        value: input?.value || '',
        active: document.activeElement === input,
        keyEvents: window.__inputProbe.filter((event) => event.eventName === 'keydown').length,
        beforeInputEvents: window.__inputProbe.filter((event) => event.eventName === 'beforeinput').length,
        inputEvents: window.__inputProbe.filter((event) => event.eventName === 'input').length,
        events: window.__inputProbe
      };
    })();
  `);
}

async function waitFor(win, expression) {
  const started = Date.now();
  while (Date.now() - started < 10000) {
    const ready = await win.webContents.executeJavaScript(`Boolean(${expression})`);
    if (ready) return;
    await delay(50);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
