const api = window.healthApi;
const localDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const today = () => localDateKey();
const nowTime = () => new Date().toTimeString().slice(0, 5);
const lbToKg = (lb) => n(lb) * 0.45359237;
const kgFromLbm = (weight, bodyFat) => lbToKg(n(weight) * (1 - n(bodyFat) / 100));
const fmt = (value, digits = 0) => Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '--';
const n = (value) => Number(value) || 0;

const pages = [
  ['dashboard', 'Dashboard'],
  ['glucose', 'Glucose'],
  ['food', 'Food & Macros'],
  ['workouts', 'Workouts'],
  ['activity', 'Activity & Burn'],
  ['weight', 'Weight'],
  ['sleep', 'Sleep'],
  ['meds', 'Medications'],
  ['labs', 'Labs'],
  ['settings', 'Settings']
];

const dietProfiles = {
  keto: 'Keto: target under 30g net carbs, roughly 70% fat and 25% protein.',
  carnivore: 'Carnivore: zero-carb, animal-product-focused intake.',
  'keto-carnivore hybrid': 'Keto-carnivore hybrid: under 20g net carbs with animal-forward meals.',
  'low carb': 'Low carb: keep net carbs under 100g and prioritize protein.',
  paleo: 'Paleo: whole foods without grains, legumes, or dairy.',
  Mediterranean: 'Mediterranean: olive oil, fish, vegetables, and moderate whole grains.',
  'standard American': 'Standard/balanced: around 50% carbs, 25% protein, and 25% fat.',
  'IIFYM/flexible dieting': 'IIFYM: hit daily macro targets flexibly.',
  'intermittent fasting': 'Intermittent fasting: track the eating window while applying the base macro pattern.'
};

const activities = {
  'Slow walking': 2.5,
  'Moderate walking': 3.5,
  'Brisk walking': 4.3,
  'Push mowing self-propelled': 5.5,
  'Push mowing manual effort': 6.5,
  'General yard work': 4,
  Gardening: 3.5,
  Shoveling: 6,
  'Biking easy': 4,
  'Biking moderate': 6,
  Swimming: 6,
  Elliptical: 5,
  Housework: 3,
  Cooking: 2,
  Shopping: 2.3,
  'Climbing stairs': 4,
  Standing: 1.5,
  'Custom MET': 0
};

const exerciseGroups = {
  Chest: [['Bench press', 'bilateral'], ['Incline bench press', 'bilateral'], ['Decline bench press', 'bilateral'], ['Chest fly', 'bilateral'], ['Push-ups', 'bodyweight'], ['Cable chest fly', 'bilateral'], ['Dumbbell pullover', 'bilateral']],
  Back: [['Rows', 'bilateral'], ['Lat pulldown', 'bilateral'], ['Pull-ups/chin-ups', 'bodyweight'], ['Seated cable row', 'bilateral'], ['Single-arm dumbbell row', 'single'], ['Face pulls', 'bilateral'], ['Deadlift', 'bilateral'], ['Romanian deadlift', 'bilateral']],
  Shoulders: [['Lateral raises', 'single'], ['Front raises', 'single'], ['Overhead press', 'bilateral'], ['Arnold press', 'bilateral'], ['Rear delt fly', 'single'], ['Cable lateral raise', 'single'], ['Upright row', 'bilateral']],
  Biceps: [['Curls pronated', 'single'], ['Curls supinated', 'single'], ['Hammer curls', 'single'], ['Concentration curls', 'single'], ['Cable curls', 'single'], ['Preacher curls', 'single']],
  Triceps: [['Tricep cable pushdowns', 'bilateral'], ['Overhead tricep extension', 'bilateral'], ['Skull crushers', 'bilateral'], ['Tricep dips', 'bodyweight'], ['Close-grip bench press', 'bilateral'], ['Kickbacks', 'single']],
  Legs: [['Bodyweight squats', 'bodyweight'], ['Goblet squats', 'bilateral'], ['Leg press', 'bilateral'], ['Lunges', 'single'], ['Step-ups', 'single'], ['Calf raises', 'bilateral'], ['Leg curls', 'bilateral'], ['Leg extensions', 'bilateral'], ['Glute bridges', 'bilateral'], ['Hip thrusts', 'bilateral']],
  Core: [['Planks', 'timed'], ['Crunches', 'bodyweight'], ['Bicycle crunches', 'bodyweight'], ['Leg raises', 'bodyweight'], ['Russian twists', 'bilateral'], ['Dead bug', 'bodyweight']]
};

let state = {};
let currentPage = 'dashboard';
let charts = [];

boot();

async function boot() {
  renderNav();
  document.getElementById('todayText').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  document.getElementById('themeToggle').addEventListener('click', async () => {
    const theme = document.body.classList.contains('light') ? 'dark' : 'light';
    await api.saveSettings({ theme });
    await refresh();
  });
  await refresh();
}

async function refresh() {
  state = await api.getAll();
  applyTheme();
  document.getElementById('profileChip').textContent = state.profile?.name || 'Local SQLite';
  renderPage(currentPage);
}

function applyTheme() {
  document.body.classList.toggle('light', state.profile?.theme === 'light');
}

function renderNav() {
  const nav = document.getElementById('nav');
  nav.innerHTML = pages.map(([id, label]) => `<button class="nav-button" data-page="${id}" type="button">${label}</button>`).join('');
  nav.addEventListener('click', (event) => {
    const button = event.target.closest('[data-page]');
    if (!button) return;
    currentPage = button.dataset.page;
    renderPage(currentPage);
  });
}

function renderPage(page) {
  charts.forEach((chart) => chart.destroy());
  charts = [];
  document.querySelectorAll('.nav-button').forEach((button) => button.classList.toggle('active', button.dataset.page === page));
  document.getElementById('pageTitle').textContent = pages.find(([id]) => id === page)?.[1] || 'Dashboard';
  const renderers = { dashboard, glucose, food, workouts, activity, weight, sleep, meds, labs, settings };
  renderers[page]();
}

function metrics(items) {
  return `<div class="grid four">${items.map(([label, value, note]) => `
    <article class="metric"><span>${label}</span><strong>${value}</strong><small>${note || ''}</small></article>
  `).join('')}</div>`;
}

function panel(title, body) {
  return `<section class="panel"><h2>${title}</h2>${body}</section>`;
}

function setContent(html) {
  document.getElementById('content').innerHTML = html;
}

function todayRows(table, date = today()) {
  return (state[table] || []).filter((row) => row.date === date);
}

function profileWeight() {
  return latestWeight()?.weight || state.profile?.current_weight || 0;
}

function latestWeight() {
  return [...(state.weight_log || [])].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)[0];
}

function lbm(profile = state.profile) {
  const logged = latestWeight();
  const weight = logged?.weight || profile?.current_weight;
  const bodyFat = logged?.body_fat || profile?.body_fat;
  return n(weight) && n(bodyFat) ? n(weight) * (1 - n(bodyFat) / 100) : n(profile?.lean_body_mass);
}

function bmr() {
  const leanKg = lbToKg(lbm());
  return leanKg ? 370 + 21.6 * leanKg : 0;
}

function dailyBurn(date = today()) {
  const activityBurn = todayRows('activities', date).filter((row) => row.kind !== 'workout').reduce((sum, row) => sum + n(row.calories), 0);
  const workoutBurn = todayRows('activities', date).filter((row) => row.kind === 'workout').reduce((sum, row) => sum + n(row.calories), 0);
  return { activityBurn, workoutBurn, tdee: bmr() + activityBurn + workoutBurn };
}

function foodTotals(date = today()) {
  return todayRows('food_log', date).reduce((sum, row) => ({
    net_carbs: sum.net_carbs + n(row.net_carbs),
    protein: sum.protein + n(row.protein),
    fat: sum.fat + n(row.fat),
    calories: sum.calories + n(row.calories)
  }), { net_carbs: 0, protein: 0, fat: 0, calories: 0 });
}

function dashboard() {
  const totals = foodTotals();
  const burn = dailyBurn();
  const pounds = lifetimePounds();
  const glucoseStats = glucoseSummary();
  const proteinTarget = n(state.profile?.protein_target) || 160;
  const surplus = totals.calories - burn.tdee;
  setContent(`
    <div class="grid">
      ${latestGlucoseAlert()}
      ${metrics([
        ['TDEE', `${fmt(burn.tdee)} cal`, `BMR ${fmt(bmr())} + activity ${fmt(burn.activityBurn)} + workout ${fmt(burn.workoutBurn)}`],
        ['Deficit / surplus', `${surplus >= 0 ? '+' : ''}${fmt(surplus)} cal`, `${fmt(totals.calories)} calories in today`],
        ['Glucose status', glucoseStats.count ? `${fmt(glucoseStats.avg)} mg/dL` : '--', glucoseStats.count ? `Est. A1c ${fmt(glucoseStats.a1c, 1)}%` : 'No readings yet'],
        ['Protein', `${fmt(totals.protein)}g`, `Target ${fmt(proteinTarget)}g`]
      ])}
      ${panel('1 Million Pound Challenge', `
        <div class="progress"><span style="width:${Math.min(100, pounds.total / 1000000 * 100)}%"></span></div>
        <p class="muted">${fmt(pounds.total)} lbs lifted, ${fmt(Math.max(0, 1000000 - pounds.total))} remaining. ${pounds.week} sessions this week, ${pounds.month} this month, ${pounds.sessions} lifetime.</p>
      `)}
      ${panel('Intake recommendation', `<div class="alert ${recommendation().tone}">${recommendation().text}</div>`)}
      <div class="grid two">
        ${panel('Weight trend', '<div class="chart-wrap"><canvas id="weightChart"></canvas></div>')}
        ${panel('Glucose trend', '<div class="chart-wrap"><canvas id="glucoseChart"></canvas></div>')}
      </div>
    </div>
  `);
  drawWeightChart('weightChart');
  drawGlucoseChart('glucoseChart');
}

function glucose() {
  const summary = glucoseSummary();
  setContent(`
    <div class="grid">
      ${latestGlucoseAlert()}
      ${metrics([
        ['Overall average', summary.count ? `${fmt(summary.avg)} mg/dL` : '--', `${summary.count} readings`],
        ['Estimated A1c', summary.count ? `${fmt(summary.a1c, 1)}%` : '--', a1cFlag(summary.a1c).label],
        ['Fasting average', summary.fastingCount ? `${fmt(summary.fastingAvg)} mg/dL` : '--', 'Morning fasting readings'],
        ['Highest / lowest', summary.count ? `${fmt(summary.highest)} / ${fmt(summary.lowest)}` : '--', 'mg/dL']
      ])}
      ${panel('Add glucose reading', glucoseForm())}
      ${panel('Last 30 readings', table(['Date', 'Time', 'Context', 'Value', 'Notes', ''], state.glucose_readings.slice(0, 30).map((r) => [r.date, r.time, r.context, `<span class="${glucoseClass(r.context, r.value)}">${fmt(r.value)}</span>`, r.notes || '', del('glucose_readings', r.id)])))}
    </div>
  `);
  bindForm('glucoseForm', 'glucose_readings');
  bindDeletes();
}

function food() {
  const totals = foodTotals();
  setContent(`
    <div class="grid">
      ${metrics([
        ['Calories today', fmt(totals.calories), 'Logged intake'],
        ['Net carbs', `${fmt(totals.net_carbs)}g`, carbFlag(totals.net_carbs)],
        ['Protein', `${fmt(totals.protein)}g`, `Target ${fmt(state.profile?.protein_target || 160)}g`],
        ['Fat', `${fmt(totals.fat)}g`, dietProfiles[state.profile?.diet_type] || 'Diet profile not set']
      ])}
      ${panel('Recommendation', `<div class="alert ${recommendation().tone}">${recommendation().text}</div>`)}
      ${panel('Log meal', foodForm())}
      ${panel('Food log', table(['Date', 'Meal', 'Description', 'Net carbs', 'Protein', 'Fat', 'Calories', ''], state.food_log.map((r) => [r.date, r.meal_type, r.description, fmt(r.net_carbs), fmt(r.protein), fmt(r.fat), fmt(r.calories), del('food_log', r.id)])))}
    </div>
  `);
  bindForm('foodForm', 'food_log');
  bindDeletes();
}

function workouts() {
  const pounds = lifetimePounds();
  const latestSession = state.workout_sessions[0];
  setContent(`
    <div class="grid">
      ${metrics([
        ['Lifetime lifted', `${fmt(pounds.total)} lbs`, `${fmt(Math.max(0, 1000000 - pounds.total))} remaining`],
        ['Progress', `${fmt(pounds.total / 1000000 * 100, 1)}%`, '1,000,000 lb challenge'],
        ['Sessions week/month', `${pounds.week} / ${pounds.month}`, `${pounds.sessions} lifetime`],
        ['Workout burn today', `${fmt(dailyBurn().workoutBurn)} cal`, 'Resistance training MET estimate']
      ])}
      ${panel('Challenge progress', `<div class="progress"><span style="width:${Math.min(100, pounds.total / 1000000 * 100)}%"></span></div>`)}
      ${panel('Add workout session', workoutSessionForm())}
      ${latestSession ? panel('Add exercise to latest session', exerciseForm(latestSession.id)) : panel('Add exercise', '<p class="muted">Create a workout session first.</p>')}
      <div class="grid two">
        ${panel('Sessions', workoutSessionsTable())}
        ${panel('Per-exercise lifetime totals', exerciseTotalsTable())}
      </div>
    </div>
  `);
  bindWorkoutSessionForm();
  if (latestSession) bindExerciseForm();
  bindDeletes();
}

function activity() {
  const burn = dailyBurn();
  setContent(`
    <div class="grid">
      ${metrics([
        ['BMR', `${fmt(bmr())} cal`, 'Katch-McArdle'],
        ['Activity burn', `${fmt(burn.activityBurn)} cal`, 'MET activity today'],
        ['Workout burn', `${fmt(burn.workoutBurn)} cal`, 'Resistance training today'],
        ['TDEE', `${fmt(burn.tdee)} cal`, 'BMR + burn']
      ])}
      ${panel('Log activity', activityForm())}
      ${panel('Activity history', table(['Date', 'Activity', 'MET', 'Minutes', 'Calories', 'Notes', ''], state.activities.map((r) => [r.date, r.name, fmt(r.met, 1), fmt(r.duration), fmt(r.calories), r.notes || '', del('activities', r.id)])))}
    </div>
  `);
  bindActivityForm();
  bindDeletes();
}

function weight() {
  const stats = weightStats();
  setContent(`
    <div class="grid">
      ${metrics([
        ['Current weight', stats.current ? `${fmt(stats.current, 1)} lbs` : '--', `Starting ${stats.starting ? fmt(stats.starting, 1) : '--'}`],
        ['Total change', stats.change === null ? '--' : `${fmt(stats.change, 1)} lbs`, 'Current minus starting'],
        ['Body fat change', stats.bodyFatChange === null ? '--' : `${fmt(stats.bodyFatChange, 1)}%`, 'Percentage points'],
        ['LBM change', stats.lbmChange === null ? '--' : `${fmt(stats.lbmChange, 1)} lbs`, `Current BMR ${fmt(bmr())}`]
      ])}
      <div class="grid two">
        ${panel('Log weight and body composition', weightForm())}
        ${panel('Weight trend', '<div class="chart-wrap"><canvas id="weightOnlyChart"></canvas></div>')}
      </div>
      ${panel('History', table(['Date', 'Weight', 'Body fat %', 'LBM', 'Notes', ''], state.weight_log.map((r) => [r.date, fmt(r.weight, 1), fmt(r.body_fat, 1), fmt(r.lean_body_mass, 1), r.notes || '', del('weight_log', r.id)])))}
    </div>
  `);
  bindWeightForm();
  bindDeletes();
  drawWeightChart('weightOnlyChart');
}

function sleep() {
  const rows = state.sleep_log || [];
  const avg = rows.length ? rows.reduce((sum, r) => sum + n(r.hours), 0) / rows.length : 0;
  const qualities = ['great', 'good', 'fair', 'poor'].map((q) => `${q}: ${rows.filter((r) => r.quality === q).length}`).join(', ');
  const morningRows = rows.filter((r) => n(r.morning_glucose));
  const morning = morningRows.length ? morningRows.reduce((sum, r) => sum + n(r.morning_glucose), 0) / morningRows.length : 0;
  setContent(`
    <div class="grid">
      ${metrics([
        ['Average sleep', rows.length ? `${fmt(avg, 1)} hrs` : '--', `${rows.length} nights logged`],
        ['Quality breakdown', qualities, 'All-time'],
        ['Morning glucose avg', morningRows.length ? `${fmt(morning)} mg/dL` : '--', 'Sleep correlation marker'],
        ['Last night', rows[0] ? `${fmt(rows[0].hours, 1)} hrs` : '--', rows[0]?.quality || 'No entry']
      ])}
      ${panel('Log sleep', sleepForm())}
      ${panel('Sleep history', table(['Date', 'Hours', 'Quality', 'Morning glucose', 'Notes', ''], rows.map((r) => [r.date, fmt(r.hours, 1), r.quality, fmt(r.morning_glucose), r.notes || '', del('sleep_log', r.id)])))}
    </div>
  `);
  bindForm('sleepForm', 'sleep_log');
  bindDeletes();
}

function meds() {
  setContent(`
    <div class="grid">
      ${metrics([['Medication count', state.medications.length, 'Active entries'], ['Full details', 'Name / dose / timing', 'Stored locally'], ['Auto-save', 'On submit', 'SQLite'], ['Backup ready', 'Settings', 'Export database file']])}
      ${panel('Add medication', medsForm())}
      ${panel('Medication list', table(['Name', 'Dose', 'Frequency', 'Timing', 'Purpose / notes', ''], state.medications.map((r) => [r.name, r.dose, r.frequency, r.timing, r.purpose_notes, del('medications', r.id)])))}
    </div>
  `);
  bindForm('medsForm', 'medications');
  bindDeletes();
}

function labs() {
  const a1c = state.lab_results.filter((r) => /a1c|hba1c/i.test(r.test_name || '')).sort((a, b) => a.date.localeCompare(b.date));
  setContent(`
    <div class="grid">
      ${metrics([
        ['Lab entries', state.lab_results.length, 'Total history'],
        ['A1c latest', a1c.length ? `${fmt(a1c[a1c.length - 1].value, 1)}%` : '--', `Goal ${fmt(state.profile?.a1c_goal || 5.7, 1)}%`],
        ['A1c trend', a1cTrend(a1c), 'Detected from test name'],
        ['Out of range', state.lab_results.filter((r) => outOfRange(r)).length, 'Based on reference text']
      ])}
      <div class="grid two">
        ${panel('Log lab result', labForm())}
        ${panel('A1c progression', '<div class="chart-wrap"><canvas id="a1cChart"></canvas></div>')}
      </div>
      ${panel('Lab history', table(['Date', 'Test', 'Value', 'Range', 'Flag', 'Notes', ''], state.lab_results.map((r) => [r.date, r.test_name, fmt(r.value, 2), r.reference_range, outOfRange(r) ? '<span class="reading-amber">Review</span>' : 'In range', r.notes || '', del('lab_results', r.id)])))}
    </div>
  `);
  bindForm('labForm', 'lab_results');
  bindDeletes();
  drawA1cChart('a1cChart', a1c);
}

function settings() {
  const p = state.profile || {};
  setContent(`
    <div class="grid two">
      ${panel('Profile and goals', profileForm(p))}
      ${panel('Database', `
        <div class="grid">
          <p class="muted">Backup exports the full SQLite database. Restore replaces the local database with the selected backup.</p>
          <div class="actions">
            <button class="primary-button" id="backupBtn" type="button">Backup database</button>
            <button class="ghost-button" id="restoreBtn" type="button">Restore database</button>
            <button class="danger-button" id="clearBtn" type="button">Clear all data</button>
          </div>
        </div>
      `)}
    </div>
  `);
  document.getElementById('profileForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = formData(event.target);
    body.lean_body_mass = n(body.current_weight) && n(body.body_fat) ? n(body.current_weight) * (1 - n(body.body_fat) / 100) : '';
    await save(() => api.saveProfile(body));
  });
  document.getElementById('backupBtn').addEventListener('click', async () => {
    const result = await api.backup();
    if (!result.canceled) notify(`Backup saved: ${result.path}`);
  });
  document.getElementById('restoreBtn').addEventListener('click', async () => {
    if (!confirm('Restore will replace the current local database. Continue?')) return;
    const result = await api.restore();
    if (!result.canceled) await refresh();
  });
  document.getElementById('clearBtn').addEventListener('click', async () => {
    if (!confirm('Clear all health tracker data? This cannot be undone unless you have a backup.')) return;
    await save(() => api.clearAll());
  });
}

function glucoseForm() {
  return `<form id="glucoseForm">${fields([
    ['date', 'Date', 'date', today()],
    ['time', 'Time', 'time', nowTime()],
    ['context', 'Context', 'select', 'fasting morning', ['fasting morning', 'before meal', '1hr post-meal', '2hr post-meal', 'bedtime', 'post-workout', 'random']],
    ['value', 'mg/dL', 'number']
  ])}<label>Notes<textarea name="notes"></textarea></label><button class="primary-button">Save reading</button></form>`;
}

function foodForm() {
  return `<form id="foodForm">${fields([
    ['date', 'Date', 'date', today()],
    ['meal_type', 'Meal type', 'select', 'breakfast', ['breakfast', 'lunch', 'dinner', 'snack']],
    ['description', 'Description', 'text'],
    ['net_carbs', 'Net carbs (g)', 'number'],
    ['protein', 'Protein (g)', 'number'],
    ['fat', 'Fat (g)', 'number'],
    ['calories', 'Calories', 'number']
  ])}<button class="primary-button">Save meal</button></form>`;
}

function workoutSessionForm() {
  return `<form id="workoutSessionForm">${fields([
    ['date', 'Date', 'date', today()],
    ['pre_glucose', 'Pre-workout glucose', 'number'],
    ['post_glucose', 'Post-workout glucose', 'number'],
    ['duration', 'Duration (minutes)', 'number'],
    ['effort', 'Effort', 'select', 'moderate', ['light', 'moderate', 'vigorous']]
  ])}<label>Notes<textarea name="notes"></textarea></label><button class="primary-button">Save session</button></form>`;
}

function exerciseForm(sessionId) {
  const groups = Object.keys(exerciseGroups);
  return `<form id="exerciseForm"><input type="hidden" name="session_id" value="${sessionId}" />${fields([
    ['muscle_group', 'Muscle group', 'select', groups[0], groups],
    ['exercise', 'Exercise', 'select', exerciseGroups[groups[0]][0][0], exerciseGroups[groups[0]].map((x) => x[0])],
    ['sets', 'Sets', 'number'],
    ['reps', 'Reps', 'number'],
    ['weight', 'Weight (lbs)', 'number'],
    ['seconds', 'Seconds for timed exercises', 'number']
  ])}<button class="primary-button">Save exercise</button></form>`;
}

function activityForm() {
  return `<form id="activityForm">${fields([
    ['date', 'Date', 'date', today()],
    ['name', 'Activity', 'select', 'Slow walking', Object.keys(activities)],
    ['met', 'MET', 'number', activities['Slow walking']],
    ['duration', 'Duration (minutes)', 'number']
  ])}<label>Notes<textarea name="notes"></textarea></label><button class="primary-button">Save activity</button></form>`;
}

function weightForm() {
  return `<form id="weightForm">${fields([
    ['date', 'Date', 'date', today()],
    ['weight', 'Weight (lbs)', 'number', profileWeight() || ''],
    ['body_fat', 'Body fat %', 'number', state.profile?.body_fat || '']
  ])}<label>Notes<textarea name="notes"></textarea></label><button class="primary-button">Save weight</button></form>`;
}

function sleepForm() {
  return `<form id="sleepForm">${fields([
    ['date', 'Date', 'date', today()],
    ['hours', 'Hours', 'number'],
    ['quality', 'Quality', 'select', 'good', ['great', 'good', 'fair', 'poor']],
    ['morning_glucose', 'Morning glucose', 'number']
  ])}<label>Notes<textarea name="notes"></textarea></label><button class="primary-button">Save sleep</button></form>`;
}

function medsForm() {
  return `<form id="medsForm">${fields([
    ['name', 'Name', 'text'],
    ['dose', 'Dose', 'text'],
    ['frequency', 'Frequency', 'text'],
    ['timing', 'Timing', 'text']
  ])}<label>Purpose / notes<textarea name="purpose_notes"></textarea></label><button class="primary-button">Save medication</button></form>`;
}

function labForm() {
  return `<form id="labForm">${fields([
    ['date', 'Date', 'date', today()],
    ['test_name', 'Test name', 'text'],
    ['value', 'Value', 'number'],
    ['reference_range', 'Reference range', 'text']
  ])}<label>Notes<textarea name="notes"></textarea></label><button class="primary-button">Save lab</button></form>`;
}

function profileForm(p) {
  return `<form id="profileForm">${fields([
    ['name', 'Name', 'text', p.name || ''],
    ['date_of_birth', 'Date of birth', 'date', p.date_of_birth || ''],
    ['sex', 'Sex', 'select', p.sex || '', ['', 'female', 'male', 'intersex', 'prefer not to say']],
    ['height_ft', 'Height ft', 'number', p.height_ft || ''],
    ['height_in', 'Height in', 'number', p.height_in || ''],
    ['current_weight', 'Current weight (lbs)', 'number', p.current_weight || ''],
    ['body_fat', 'Body fat %', 'number', p.body_fat || ''],
    ['goals', 'Goal', 'select', p.goals || 'weight loss', ['weight loss', 'body recomposition', 'muscle gain', 'maintenance', 'manage T2D/blood sugar']],
    ['diet_type', 'Diet type', 'select', p.diet_type || 'keto', Object.keys(dietProfiles)],
    ['protein_target', 'Protein target (g)', 'number', p.protein_target || 160],
    ['a1c_goal', 'A1c goal (%)', 'number', p.a1c_goal || 5.7],
    ['theme', 'Theme', 'select', p.theme || 'dark', ['dark', 'light']],
    ['eating_window', 'Eating window', 'text', p.eating_window || '']
  ])}<label>Active medical conditions<textarea name="medical_conditions">${p.medical_conditions || ''}</textarea></label><p class="muted">Age: ${age(p.date_of_birth) || '--'} | Lean body mass: ${fmt(lbm(p), 1)} lbs | BMR: ${fmt(bmr())} cal</p><button class="primary-button">Save profile</button></form>`;
}

function fields(items) {
  return `<div class="form-grid">${items.map(([name, label, type, value = '', options]) => {
    if (type === 'select') {
      return `<label>${label}<select name="${name}">${options.map((option) => `<option value="${option}" ${option === value ? 'selected' : ''}>${option || 'Not set'}</option>`).join('')}</select></label>`;
    }
    return `<label>${label}<input name="${name}" type="${type}" value="${value}" ${type === 'number' ? 'step="any"' : ''}></label>`;
  }).join('')}</div>`;
}

function bindForm(id, tableName) {
  document.getElementById(id).addEventListener('submit', async (event) => {
    event.preventDefault();
    await save(() => api.add(tableName, formData(event.target)));
  });
}

function bindWorkoutSessionForm() {
  document.getElementById('workoutSessionForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = formData(event.target);
    await save(async () => {
      const result = await api.add('workout_sessions', body);
      const met = { light: 3.5, moderate: 5, vigorous: 6 }[body.effort] || 5;
      await api.add('activities', {
        date: body.date,
        name: `Resistance training (${body.effort})`,
        met,
        duration: body.duration,
        calories: metCalories(met, body.duration),
        notes: body.notes,
        kind: 'workout'
      });
      return result;
    });
  });
}

function bindExerciseForm() {
  const form = document.getElementById('exerciseForm');
  const groupSelect = form.elements.muscle_group;
  const exerciseSelect = form.elements.exercise;
  groupSelect.addEventListener('change', () => {
    exerciseSelect.innerHTML = exerciseGroups[groupSelect.value].map(([name]) => `<option>${name}</option>`).join('');
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = formData(form);
    body.mode = exerciseMode(body.muscle_group, body.exercise);
    body.pounds = exercisePounds(body);
    await save(() => api.add('workout_exercises', body));
  });
}

function bindActivityForm() {
  const form = document.getElementById('activityForm');
  form.elements.name.addEventListener('change', () => {
    if (activities[form.elements.name.value]) form.elements.met.value = activities[form.elements.name.value];
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = formData(form);
    body.calories = metCalories(body.met, body.duration);
    body.kind = 'activity';
    await save(() => api.add('activities', body));
  });
}

function bindWeightForm() {
  document.getElementById('weightForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = formData(event.target);
    body.lean_body_mass = n(body.weight) && n(body.body_fat) ? n(body.weight) * (1 - n(body.body_fat) / 100) : '';
    await save(async () => {
      await api.add('weight_log', body);
      return api.saveSettings({ current_weight: body.weight, body_fat: body.body_fat, lean_body_mass: body.lean_body_mass });
    });
  });
}

function bindDeletes() {
  document.querySelectorAll('[data-delete]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!confirm('Delete this entry?')) return;
      await save(() => api.delete(button.dataset.table, Number(button.dataset.delete)));
    });
  });
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

async function save(fn) {
  document.getElementById('saveStatus').textContent = 'Saving...';
  await fn();
  document.getElementById('saveStatus').textContent = 'Saved';
  await refresh();
}

function notify(message) {
  document.getElementById('saveStatus').textContent = message;
}

function del(tableName, id) {
  return `<button class="mini-button" data-table="${tableName}" data-delete="${id}" type="button">Delete</button>`;
}

function table(headers, rows) {
  if (!rows.length) return '<p class="muted">No entries yet.</p>';
  return `<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function glucoseSummary() {
  const rows = state.glucose_readings || [];
  const values = rows.map((r) => n(r.value)).filter(Boolean);
  const fasting = rows.filter((r) => r.context === 'fasting morning').map((r) => n(r.value)).filter(Boolean);
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  return {
    count: values.length,
    avg,
    a1c: values.length ? (avg + 46.7) / 28.7 : 0,
    fastingCount: fasting.length,
    fastingAvg: fasting.length ? fasting.reduce((a, b) => a + b, 0) / fasting.length : 0,
    highest: values.length ? Math.max(...values) : 0,
    lowest: values.length ? Math.min(...values) : 0
  };
}

function glucoseClass(context, value) {
  const v = n(value);
  if ((context === 'fasting morning' && v < 70) || (context === 'post-workout' && v < 65)) return 'reading-low';
  if (context === '1hr post-meal') return v > 200 ? 'reading-red' : v >= 160 ? 'reading-amber' : 'reading-green';
  if (context === '2hr post-meal') return v > 180 ? 'reading-red' : v >= 140 ? 'reading-amber' : 'reading-green';
  if (context === 'bedtime') return v > 150 ? 'reading-red' : v >= 120 ? 'reading-amber' : 'reading-green';
  if (context === 'post-workout') return v > 160 ? 'reading-red' : v >= 130 ? 'reading-amber' : 'reading-green';
  return v > 150 ? 'reading-red' : v >= 130 ? 'reading-amber' : 'reading-green';
}

function latestGlucoseAlert() {
  const reading = state.glucose_readings?.[0];
  if (!reading) return '<div class="alert">No glucose readings yet.</div>';
  const cls = glucoseClass(reading.context, reading.value);
  if (cls === 'reading-red') return `<div class="alert bad">Most recent glucose reading is high: ${fmt(reading.value)} mg/dL (${reading.context}).</div>`;
  if (cls === 'reading-low') return `<div class="alert bad">Most recent glucose reading is low: ${fmt(reading.value)} mg/dL (${reading.context}).</div>`;
  if (cls === 'reading-amber') return `<div class="alert warn">Most recent glucose reading is elevated: ${fmt(reading.value)} mg/dL (${reading.context}).</div>`;
  return `<div class="alert good">Most recent glucose reading is in range: ${fmt(reading.value)} mg/dL (${reading.context}).</div>`;
}

function a1cFlag(value) {
  if (!value) return { tone: '', label: 'No estimate' };
  if (value > 6.5) return { tone: 'bad', label: 'Above diabetes threshold' };
  if (value >= 5.7) return { tone: 'warn', label: 'Prediabetes range' };
  return { tone: 'good', label: 'Below 5.7%' };
}

function recommendation() {
  const goal = state.profile?.goals || 'weight loss';
  const diet = state.profile?.diet_type || 'keto';
  const totals = recentAverages('food_log', 5, foodTotalsForDate);
  const burn = recentAverages('activities', 5, (date) => ({ calories: dailyBurn(date).tdee }));
  const proteinTarget = n(state.profile?.protein_target) || 160;
  const proteinMet = totals.protein >= proteinTarget * 0.9;
  let target = 'maintenance';
  let tone = 'good';
  if (goal.includes('weight loss')) target = `${fmt(burn.calories - 400)} calories, about 300-500 below TDEE`;
  else if (goal.includes('muscle gain')) target = `${fmt(burn.calories + 250)} calories, about 200-300 above TDEE`;
  else if (goal.includes('recomposition')) target = `${fmt(burn.calories - 150)} to ${fmt(burn.calories + 100)} calories with high protein`;
  else target = `${fmt(burn.calories)} calories for maintenance`;
  if (!proteinMet) tone = 'warn';
  if ((diet === 'keto' && totals.net_carbs > 50) || (diet === 'carnivore' && totals.net_carbs > 0)) tone = 'bad';
  return {
    tone,
    text: `${dietProfiles[diet] || 'Diet profile not set'} Based on your ${goal} goal and recent activity, aim for ${target}. Recent protein averages ${fmt(totals.protein)}g/day, ${proteinMet ? 'meeting' : 'below'} your ${fmt(proteinTarget)}g target.`
  };
}

function recentAverages(_tableName, days, calculator) {
  const dates = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return localDateKey(d);
  });
  const sums = dates.map(calculator).reduce((acc, row) => {
    for (const [key, value] of Object.entries(row)) acc[key] = (acc[key] || 0) + n(value);
    return acc;
  }, {});
  for (const key of Object.keys(sums)) sums[key] /= days;
  return sums;
}

function foodTotalsForDate(date) {
  const rows = (state.food_log || []).filter((r) => r.date === date);
  return rows.reduce((sum, row) => ({
    net_carbs: sum.net_carbs + n(row.net_carbs),
    protein: sum.protein + n(row.protein),
    fat: sum.fat + n(row.fat),
    calories: sum.calories + n(row.calories)
  }), { net_carbs: 0, protein: 0, fat: 0, calories: 0 });
}

function carbFlag(carbs) {
  const diet = state.profile?.diet_type;
  if (['keto', 'carnivore', 'keto-carnivore hybrid'].includes(diet)) {
    if (carbs > 50) return 'Alert: over 50g';
    if (carbs > 30) return 'Warning: over 30g';
  }
  return dietProfiles[diet] || 'No diet selected';
}

function metCalories(met, minutes) {
  return n(met) * lbToKg(profileWeight()) * (n(minutes) / 60);
}

function exerciseMode(group, exercise) {
  return (exerciseGroups[group] || []).find(([name]) => name === exercise)?.[1] || 'bilateral';
}

function exercisePounds(row) {
  if (row.mode === 'timed') return 0;
  if (row.mode === 'bodyweight') return n(row.sets) * n(row.reps) * profileWeight();
  return n(row.sets) * n(row.reps) * n(row.weight) * (row.mode === 'single' ? 2 : 1);
}

function lifetimePounds() {
  const total = (state.workout_exercises || []).reduce((sum, row) => sum + n(row.pounds), 0);
  const sessions = state.workout_sessions || [];
  const startWeek = new Date();
  startWeek.setDate(startWeek.getDate() - startWeek.getDay());
  const weekIso = localDateKey(startWeek);
  const monthIso = today().slice(0, 7);
  return {
    total,
    sessions: sessions.length,
    week: sessions.filter((s) => s.date >= weekIso).length,
    month: sessions.filter((s) => s.date?.startsWith(monthIso)).length
  };
}

function workoutSessionsTable() {
  const exercises = state.workout_exercises || [];
  return table(['Date', 'Duration', 'Effort', 'Pounds', 'Glucose', 'Notes', ''], (state.workout_sessions || []).map((s) => [
    s.date,
    `${fmt(s.duration)} min`,
    s.effort,
    fmt(exercises.filter((e) => e.session_id === s.id).reduce((sum, e) => sum + n(e.pounds), 0)),
    `${fmt(s.pre_glucose)} / ${fmt(s.post_glucose)}`,
    s.notes || '',
    del('workout_sessions', s.id)
  ]));
}

function exerciseTotalsTable() {
  const totals = {};
  for (const row of state.workout_exercises || []) totals[row.exercise] = (totals[row.exercise] || 0) + n(row.pounds);
  return table(['Exercise', 'Lifetime pounds'], Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([name, pounds]) => [name, fmt(pounds)]));
}

function weightStats() {
  const rows = [...(state.weight_log || [])].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  if (!rows.length) return { current: n(state.profile?.current_weight), starting: null, change: null, bodyFatChange: null, lbmChange: null };
  const first = rows[0];
  const last = rows[rows.length - 1];
  return {
    current: n(last.weight),
    starting: n(first.weight),
    change: n(last.weight) - n(first.weight),
    bodyFatChange: n(last.body_fat) - n(first.body_fat),
    lbmChange: n(last.lean_body_mass) - n(first.lean_body_mass)
  };
}

function age(dob) {
  if (!dob) return '';
  const birth = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) years--;
  return years;
}

function outOfRange(row) {
  const range = String(row.reference_range || '');
  const value = n(row.value);
  const match = range.match(/([0-9.]+)\s*-\s*([0-9.]+)/);
  if (match) return value < Number(match[1]) || value > Number(match[2]);
  const less = range.match(/<\s*([0-9.]+)/);
  if (less) return value >= Number(less[1]);
  const greater = range.match(/>\s*([0-9.]+)/);
  if (greater) return value <= Number(greater[1]);
  return false;
}

function a1cTrend(rows) {
  if (rows.length < 2) return 'Need 2+ values';
  const diff = n(rows[rows.length - 1].value) - n(rows[0].value);
  return diff > 0 ? `Up ${fmt(diff, 1)}%` : `Down ${fmt(Math.abs(diff), 1)}%`;
}

function drawWeightChart(id) {
  const ctx = document.getElementById(id);
  if (!ctx) return;
  const rows = [...(state.weight_log || [])].sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
  charts.push(new Chart(ctx, {
    type: 'line',
    data: { labels: rows.map((r) => r.date), datasets: [{ label: 'Weight', data: rows.map((r) => n(r.weight)), borderColor: '#22c59a', tension: .25 }] },
    options: chartOptions()
  }));
}

function drawGlucoseChart(id) {
  const ctx = document.getElementById(id);
  if (!ctx) return;
  const rows = [...(state.glucose_readings || [])].sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
  charts.push(new Chart(ctx, {
    type: 'line',
    data: { labels: rows.map((r) => r.date), datasets: [{ label: 'Glucose', data: rows.map((r) => n(r.value)), borderColor: '#69a8ff', tension: .25 }] },
    options: chartOptions()
  }));
}

function drawA1cChart(id, rows) {
  const ctx = document.getElementById(id);
  if (!ctx) return;
  charts.push(new Chart(ctx, {
    type: 'line',
    data: { labels: rows.map((r) => r.date), datasets: [{ label: 'A1c', data: rows.map((r) => n(r.value)), borderColor: '#f2b84b', tension: .25 }] },
    options: chartOptions()
  }));
}

function chartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: getComputedStyle(document.body).getPropertyValue('--text') } } },
    scales: {
      x: { ticks: { color: getComputedStyle(document.body).getPropertyValue('--muted') }, grid: { color: 'rgba(128,128,128,.16)' } },
      y: { ticks: { color: getComputedStyle(document.body).getPropertyValue('--muted') }, grid: { color: 'rgba(128,128,128,.16)' } }
    }
  };
}
