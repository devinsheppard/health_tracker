const api = window.healthApi;
const calc = window.HealthCalculations;
const html = window.HealthHtml;
const catalog = window.HealthCatalog;
const labCatalogTools = window.HealthLabCatalog;
const trendTools = window.HealthTrends;
const weightTools = window.HealthWeight;
const ui = window.HealthUi;
const environmental = window.HealthEnvironmental;
const {
  n,
  leanBodyMass,
  katchMcardleBmr,
  foodTotals: calculateFoodTotals,
  glucoseSummary: calculateGlucoseSummary,
  glucoseClass,
  a1cFlag,
  metCalories: calculateMetCalories,
  stepCalories: calculateStepCalories,
  activityBurnTotals,
  workoutMet,
  workoutCalorieEstimate: calculateWorkoutCalories,
  exercisePounds: calculateExercisePounds,
  plankActiveSeconds,
  plankCaloriesForExercise,
  lifetimePounds: calculateLifetimePounds
} = calc;
const { applyEnvironmentalAdjustment } = environmental;
const {
  escapeHtml: esc,
  attribute: attr,
  trustedHtml: raw,
  cellHtml
} = html;
const { pages, dietProfiles, activities, exerciseGroups } = catalog;
const plankCatalog = window.HealthPlankCatalog || {};
const { categories: labCategories, searchBuiltInTests, findBuiltInTest, normalize: normalizeLabSearch } = labCatalogTools;
const { ledgerTrendSeries, trendDelta } = trendTools;
const { effectiveWeightOnOrBefore } = weightTools;
const { localDateKey, today, nowTime, fmt, age } = ui;

let state = {};
let currentPage = 'dashboard';
let charts = [];
let selectedWorkoutSessionId = null;
let editingWorkoutSessionId = null;
let editingExerciseId = null;
let workoutSessionDraft = {};
let draftWorkoutExercises = [];
let selectedActivityId = null;
let editingActivityId = null;
let editingLabResultId = null;
let editingStepLogId = null;
let activityHistoryOrder = 'newest';

boot();

async function boot() {
  renderNav();
  document.addEventListener('click', handleNumberStepClick);
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
  applyAppearance();
  document.getElementById('profileChip').textContent = state.profile?.name || 'Local profile';
  const avatar = document.getElementById('profileAvatar');
  if (avatar) {
    avatar.textContent = String(state.profile?.name || 'Health Tracker')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'HT';
  }
  renderPage(currentPage);
}

function applyAppearance() {
  document.body.classList.toggle('light', state.profile?.theme === 'light');
  document.body.dataset.uiScale = state.profile?.ui_scale || 'normal';
}

function renderNav() {
  const nav = document.getElementById('nav');
  const pageMap = new Map(pages);
  const groups = [
    ['Overview', ['dashboard']],
    ['Vitals', ['glucose', 'bloodPressure', 'weight', 'sleep']],
    ['Nutrition', ['food']],
    ['Fitness', ['workouts', 'activity']],
    ['Health', ['meds', 'labs']],
    ['System', ['settings']]
  ];
  nav.innerHTML = groups.map(([group, ids]) => `
    <section class="nav-group" aria-labelledby="nav-${attr(group.toLowerCase())}">
      <h2 id="nav-${attr(group.toLowerCase())}">${esc(group)}</h2>
      ${ids.map((id) => `
        <button class="nav-button" data-page="${attr(id)}" type="button">
          ${appIcon(id)}
          <span>${esc(pageMap.get(id))}</span>
        </button>
      `).join('')}
    </section>
  `).join('');
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
  const renderers = { dashboard, glucose, bloodPressure, food, workouts, activity, weight, sleep, meds, labs, settings };
  renderers[page]();
}

function metrics(items) {
  return `<div class="grid four">${items.map(([label, value, note]) => `
    <article class="metric ${metricTone(label, value, note)}">
      <div class="metric-heading">${metricIcon(label)}<span>${esc(label)}</span></div>
      <strong>${esc(value)}</strong>
      <small>${esc(note || '')}</small>
    </article>
  `).join('')}</div>`;
}

function panel(title, body) {
  return `<section class="panel">
    <div class="panel-heading">${metricIcon(title)}<h2>${esc(title)}</h2></div>
    ${body}
  </section>`;
}

function metricTone(label, value, note) {
  const text = `${label} ${value} ${note || ''}`.toLowerCase();
  if (/out of range|warning|danger|extreme/.test(text)) return 'tone-danger';
  if (/healthy|in range|complete|normal|saved/.test(text)) return 'tone-good';
  if (/moderate|review|remaining|surplus|need /.test(text)) return 'tone-warn';
  if (/glucose|a1c|blood|heart/.test(text)) return 'tone-purple';
  return 'tone-info';
}

function appIcon(name) {
  const paths = {
    dashboard: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    glucose: '<path d="M12 2S5.5 9.1 5.5 14.3a6.5 6.5 0 0 0 13 0C18.5 9.1 12 2 12 2Z"/><path d="M9 15.5c.8 1.4 1.9 2.1 3.5 2.1"/>',
    bloodPressure: '<path d="M3 12h4l2-5 4 10 2-5h6"/><path d="M12 21C7 18 4 15 4 10a4 4 0 0 1 7-2.6A4 4 0 0 1 18 10c0 1-.2 1.9-.5 2.7"/>',
    food: '<path d="M7 3v8M4 3v5c0 2 1 3 3 3s3-1 3-3V3M7 11v10M17 3v18M17 3c3 2 3 7 0 9"/>',
    workouts: '<path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12"/>',
    activity: '<path d="m13 5 2-2 3 3-2 2M9 21l2-6 3-3 3 2 4 1M3 12l4-2 3-4 3 2M7 10l3 3"/>',
    weight: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 9a4 4 0 0 1 8 0M12 9l2-2"/>',
    sleep: '<path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/><path d="M16 3h4l-4 4h4"/>',
    meds: '<path d="m10 5 9 9a4 4 0 0 1-6 6l-9-9a4 4 0 0 1 6-6Z"/><path d="m8 15 7-7"/>',
    labs: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M8 15h8"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19 15.5a2 2 0 0 0 .4 2.2l-1.7 1.7a2 2 0 0 0-2.2-.4 2 2 0 0 0-1.2 1.8h-2.5A2 2 0 0 0 10.5 19a2 2 0 0 0-2.2.4l-1.7-1.7a2 2 0 0 0 .4-2.2 2 2 0 0 0-1.8-1.2v-2.5A2 2 0 0 0 7 10.5a2 2 0 0 0-.4-2.2l1.7-1.7a2 2 0 0 0 2.2.4 2 2 0 0 0 1.3-1.8h2.5a2 2 0 0 0 1.2 1.8 2 2 0 0 0 2.2-.4l1.7 1.7a2 2 0 0 0-.4 2.2 2 2 0 0 0 1.8 1.3v2.5a2 2 0 0 0-1.8 1.2Z"/>'
  };
  return `<svg class="app-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.dashboard}</svg>`;
}

function metricIcon(label) {
  const text = String(label || '').toLowerCase();
  const name = text.includes('glucose') || text.includes('a1c') ? 'glucose'
    : text.includes('blood') || text.includes('heart') ? 'bloodPressure'
      : text.includes('weight') || text.includes('pound') ? 'weight'
        : text.includes('sleep') ? 'sleep'
          : text.includes('protein') || text.includes('calorie') || text.includes('intake') || text.includes('carb') || text.includes('fat') ? 'food'
            : text.includes('workout') || text.includes('exercise') || text.includes('lift') ? 'workouts'
              : text.includes('step') || text.includes('activity') || text.includes('tdee') || text.includes('bmr') ? 'activity'
                : text.includes('medication') ? 'meds'
                  : text.includes('lab') ? 'labs'
                    : 'dashboard';
  return appIcon(name);
}

function setContent(html) {
  document.getElementById('content').innerHTML = html;
}

function todayRows(table, date = today()) {
  return (state[table] || []).filter((row) => row.date === date);
}

function latestSteps(date = today()) {
  return [...todayRows('step_log', date)].sort((a, b) => n(b.id) - n(a.id))[0] || null;
}

function profileWeight(date = today()) {
  return effectiveWeightOnOrBefore(state.weight_log || [], date)?.weight ?? null;
}

function average(values) {
  const clean = values.map(Number).filter(Number.isFinite);
  return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : 0;
}

function lbm(profile = state.profile, date = today()) {
  const logged = effectiveWeightOnOrBefore(state.weight_log || [], date);
  if (!logged) return 0;
  return leanBodyMass(logged.weight, logged.body_fat) || n(logged.lean_body_mass);
}

function bmr(date = today()) {
  return katchMcardleBmr(lbm(state.profile, date));
}

function dailyBurn(date = today()) {
  const steps = latestSteps(date);
  const activityTotals = activityBurnTotals(todayRows('activities', date), {
    steps: steps?.steps || 0,
    weightPounds: profileWeight(date),
    heightFt: state.profile?.height_ft,
    heightIn: state.profile?.height_in
  });
  const stepBurn = activityTotals.stepBurn;
  const activityBurn = activityTotals.activityBurn;
  const workoutActivityBurn = todayRows('activities', date).filter((row) => row.kind === 'workout').reduce((sum, row) => sum + n(row.calories), 0);
  const unlinkedWorkoutBurn = (state.workout_sessions || [])
    .filter((session) => session.date === date && !workoutActivityForSession(session.id))
    .reduce((sum, session) => {
      const estimate = workoutCalorieEstimate(session, exercisesForSession(session.id));
      return sum + (session.final_calories === null || session.final_calories === undefined ? n(estimate.calories) : n(session.final_calories));
    }, 0);
  const workoutBurn = workoutActivityBurn + unlinkedWorkoutBurn;
  return { activityBurn, workoutBurn, stepBurn, steps: n(steps?.steps), tdee: bmr(date) + activityBurn + workoutBurn };
}

function foodTotals(date = today()) {
  return calculateFoodTotals(todayRows('food_log', date));
}

function weekToDateKeys() {
  const start = new Date();
  start.setDate(start.getDate() - start.getDay());
  const days = [];
  for (const cursor = new Date(start); localDateKey(cursor) <= today(); cursor.setDate(cursor.getDate() + 1)) {
    days.push(localDateKey(cursor));
  }
  return days;
}

function weeklyBalance() {
  return weekToDateKeys().reduce((sum, date) => {
    const calories = foodTotals(date).calories;
    const tdee = dailyBurn(date).tdee;
    return {
      calories: sum.calories + calories,
      tdee: sum.tdee + tdee,
      balance: sum.balance + calories - tdee
    };
  }, { calories: 0, tdee: 0, balance: 0 });
}

function dashboard() {
  const totals = foodTotals();
  const burn = dailyBurn();
  const week = weeklyBalance();
  const pounds = lifetimePounds();
  const glucoseStats = glucoseSummary();
  const latestGlucose = state.glucose_readings?.[0];
  const latestBloodPressure = state.blood_pressure_readings?.[0];
  const latestSleep = state.sleep_log?.[0];
  const latestWeight = effectiveWeightOnOrBefore(state.weight_log || [], today());
  const trends = ledgerTrendSeries(state.daily_ledger || [], 30, bmr());
  const weightDelta = trendDelta(trends.weight);
  const glucoseDelta = trendDelta(trends.glucose);
  const proteinTarget = n(state.profile?.protein_target) || 160;
  const surplus = totals.calories - burn.tdee;
  const calorieProgress = burn.tdee > 0 ? Math.min(100, totals.calories / burn.tdee * 100) : 0;
  const proteinProgress = proteinTarget > 0 ? Math.min(100, totals.protein / proteinTarget * 100) : 0;
  const challengeProgress = Math.min(100, pounds.total / 1000000 * 100);
  const greetingName = String(state.profile?.name || '').trim().split(/\s+/)[0];
  const balanceClass = surplus <= 0 ? 'good' : 'warn';
  setContent(`
    <div class="dashboard-grid">
      <section class="dashboard-hero">
        <div>
          <span class="hero-kicker">TODAY'S OVERVIEW</span>
          <h2>${greetingName ? `Welcome back, ${esc(greetingName)}` : 'Your health at a glance'}</h2>
          <p>Live summaries from the records stored privately on this device.</p>
        </div>
        <span class="health-badge good"><span aria-hidden="true">✓</span> Local data ready</span>
      </section>
      ${latestGlucoseAlert()}

      <div class="dashboard-primary">
        <article class="feature-card energy-card">
          <div class="feature-heading">
            <span class="feature-icon info">${appIcon('food')}</span>
            <div><span>Daily energy</span><small>Intake versus total burn</small></div>
            <span class="health-badge ${balanceClass}">${surplus <= 0 ? 'Deficit' : 'Surplus'}</span>
          </div>
          <div class="feature-value">${fmt(totals.calories)}<span> / ${fmt(burn.tdee)} cal</span></div>
          <div class="progress labeled-progress" aria-label="${fmt(calorieProgress)} percent of TDEE consumed">
            <span style="width:${calorieProgress}%"></span>
          </div>
          <div class="feature-footer">
            <span><strong class="${surplus <= 0 ? 'reading-green' : 'reading-amber'}">${surplus >= 0 ? '+' : ''}${fmt(surplus)} cal</strong> balance</span>
            <span>BMR ${fmt(bmr())}</span>
          </div>
        </article>

        <article class="feature-card glucose-card">
          <div class="feature-heading">
            <span class="feature-icon purple">${appIcon('glucose')}</span>
            <div><span>Latest glucose</span><small>${latestGlucose ? `${esc(latestGlucose.context)} · ${esc(latestGlucose.time || latestGlucose.date)}` : 'No reading logged'}</small></div>
          </div>
          <div class="feature-value ${latestGlucose ? glucoseClass(latestGlucose.context, latestGlucose.value) : ''}">
            ${latestGlucose ? fmt(latestGlucose.value) : '--'}<span> mg/dL</span>
          </div>
          <div class="feature-footer">
            <span>Overall avg <strong>${glucoseStats.count ? fmt(glucoseStats.avg) : '--'}</strong></span>
            <span>Est. A1C <strong>${glucoseStats.count ? `${fmt(glucoseStats.a1c, 1)}%` : '--'}</strong></span>
          </div>
        </article>

        <article class="feature-card protein-card">
          <div class="goal-ring" style="--progress:${proteinProgress * 3.6}deg" role="img" aria-label="${fmt(proteinProgress)} percent of protein goal">
            <div><strong>${fmt(proteinProgress)}%</strong><span>complete</span></div>
          </div>
          <div class="goal-copy">
            <span class="feature-icon good">${appIcon('workouts')}</span>
            <div><span>Protein goal</span><strong>${fmt(totals.protein)}g <small>of ${fmt(proteinTarget)}g</small></strong></div>
            <p>${fmt(Math.max(0, proteinTarget - totals.protein))}g remaining today</p>
          </div>
        </article>
      </div>

      <div class="dashboard-stats">
        ${dashboardStat('activity', 'Steps today', burn.steps ? fmt(burn.steps) : '--', burn.steps ? `${fmt(burn.stepBurn)} calories estimated` : 'No step entry today', 'info')}
        ${dashboardStat('weight', 'Current weight', latestWeight ? `${fmt(latestWeight.weight, 1)} lbs` : '--', weightDelta === null ? 'No 30-day trend yet' : `${weightDelta >= 0 ? '+' : ''}${fmt(weightDelta, 1)} lbs over 30 days`, weightDelta !== null && weightDelta < 0 ? 'good' : 'purple')}
        ${dashboardStat('sleep', 'Latest sleep', latestSleep ? `${fmt(latestSleep.hours, 1)} hrs` : '--', latestSleep ? `${capitalize(latestSleep.quality)} quality · ${latestSleep.date}` : 'No sleep entry yet', latestSleep?.quality === 'great' || latestSleep?.quality === 'good' ? 'good' : 'warn')}
        ${dashboardStat('bloodPressure', 'Blood pressure', latestBloodPressure ? `${fmt(latestBloodPressure.systolic)}/${fmt(latestBloodPressure.diastolic)}` : '--', latestBloodPressure ? `${latestBloodPressure.heart_rate ? `${fmt(latestBloodPressure.heart_rate)} bpm · ` : ''}${latestBloodPressure.date}` : 'No reading yet', 'purple')}
        ${dashboardStat('workouts', 'Workout burn', `${fmt(burn.workoutBurn)} cal`, `${pounds.week} sessions this week`, 'warn')}
        ${dashboardStat('activity', 'General activity', `${fmt(burn.activityBurn)} cal`, `${fmt(burn.stepBurn)} from steps`, 'info')}
      </div>

      <div class="dashboard-insight">
        <span class="feature-icon good">${appIcon('dashboard')}</span>
        <div><span>Today's deterministic insight</span><strong>${esc(recommendation().text)}</strong></div>
      </div>

      <div class="grid two dashboard-charts">
        ${panel('Weight trend', '<p class="panel-subtitle">Daily weight and seven-day average</p><div class="chart-wrap"><canvas id="weightChart"></canvas></div>')}
        ${panel('Glucose + A1C trend', '<p class="panel-subtitle">Daily glucose average and estimated A1C</p><div class="chart-wrap"><canvas id="glucoseChart"></canvas></div>')}
      </div>
      <div class="dashboard-lower">
        ${panel('Deficit / surplus trend', '<p class="panel-subtitle">Thirty-day daily energy balance</p><div class="chart-wrap compact-chart"><canvas id="balanceChart"></canvas></div>')}
        ${panel('Weekly progress', `
          <div class="weekly-balance ${week.balance <= 0 ? 'good' : 'warn'}">
            <span>WEEK TO DATE</span>
            <strong>${week.balance >= 0 ? '+' : ''}${fmt(week.balance)} cal</strong>
            <small>${fmt(week.calories)} in · ${fmt(week.tdee)} total burn</small>
          </div>
          <div class="challenge-summary">
            <div class="feature-heading">
              <span class="feature-icon warn">${appIcon('workouts')}</span>
              <div><span>1 Million Pound Challenge</span><small>${fmt(pounds.total)} lbs lifetime</small></div>
              <strong>${fmt(challengeProgress, 1)}%</strong>
            </div>
            <div class="progress"><span style="width:${challengeProgress}%"></span></div>
            <p>${fmt(Math.max(0, 1000000 - pounds.total))} lbs remaining · ${pounds.sessions} sessions logged</p>
          </div>
        `)}
      </div>
    </div>
  `);
  drawWeightChart('weightChart');
  drawGlucoseChart('glucoseChart');
  drawBalanceChart('balanceChart');
}

function dashboardStat(icon, label, value, note, tone = 'info') {
  return `
    <article class="dashboard-stat ${tone}">
      <span class="feature-icon ${tone}">${appIcon(icon)}</span>
      <div><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></div>
    </article>
  `;
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
      ${panel('Last 30 readings', table(['Date', 'Time', 'Context', 'Value', 'Notes', ''], state.glucose_readings.slice(0, 30).map((r) => [r.date, r.time, r.context, raw(`<span class="${glucoseClass(r.context, r.value)}">${fmt(r.value)}</span>`), r.notes || '', del('glucose_readings', r.id)])))}
    </div>
  `);
  bindForm('glucoseForm', 'glucose_readings');
  bindDeletes();
}

function bloodPressure() {
  const rows = state.blood_pressure_readings || [];
  const latest = rows[0];
  const todays = todayRows('blood_pressure_readings');
  const systolicAvg = average(todays.map((row) => row.systolic));
  const diastolicAvg = average(todays.map((row) => row.diastolic));
  const heartRateAvg = average(todays.map((row) => row.heart_rate));
  setContent(`
    <div class="grid">
      ${metrics([
        ['Latest BP', latest ? `${fmt(latest.systolic)}/${fmt(latest.diastolic)}` : '--', latest ? `${latest.date} ${latest.time || ''}` : 'No readings yet'],
        ['Heart rate', latest?.heart_rate ? `${fmt(latest.heart_rate)} bpm` : '--', latest?.position || 'Most recent reading'],
        ['Today average', todays.length ? `${fmt(systolicAvg)}/${fmt(diastolicAvg)}` : '--', `${todays.length} readings today`],
        ['Today HR average', heartRateAvg ? `${fmt(heartRateAvg)} bpm` : '--', 'Average heart rate today']
      ])}
      ${panel('Add blood pressure reading', bloodPressureForm())}
      ${panel('Last 30 readings', table(['Date', 'Time', 'Blood pressure', 'Heart rate', 'Position', 'Notes', ''], rows.slice(0, 30).map((r) => [
        r.date,
        r.time || '',
        `${fmt(r.systolic)}/${fmt(r.diastolic)}`,
        r.heart_rate ? `${fmt(r.heart_rate)} bpm` : '',
        r.position || '',
        r.notes || '',
        del('blood_pressure_readings', r.id)
      ])))}
    </div>
  `);
  bindForm('bloodPressureForm', 'blood_pressure_readings');
  bindDeletes();
}

function food() {
  const totals = foodTotals();
  const burn = dailyBurn();
  const balance = totals.calories - burn.tdee;
  setContent(`
    <div class="grid">
      ${metrics([
        ['Calories today', fmt(totals.calories), 'Logged intake'],
        ['Net carbs', `${fmt(totals.net_carbs)}g`, carbFlag(totals.net_carbs)],
        ['Protein', `${fmt(totals.protein)}g`, `Target ${fmt(state.profile?.protein_target || 160)}g`],
        ['Fat', `${fmt(totals.fat)}g`, dietProfiles[state.profile?.diet_type] || 'Diet profile not set'],
        ['Deficit / surplus', `${balance >= 0 ? '+' : ''}${fmt(balance)} cal`, `TDEE ${fmt(burn.tdee)} cal`]
      ])}
      ${panel('Recommendation', `<div class="alert ${recommendation().tone}">${esc(recommendation().text)}</div>`)}
      ${panel('Log meal', foodForm())}
      ${panel('Food log', table(['Date', 'Meal', 'Description', 'Net carbs', 'Protein', 'Fat', 'Calories', ''], state.food_log.map((r) => [r.date, r.meal_type, r.description, fmt(r.net_carbs), fmt(r.protein), fmt(r.fat), fmt(r.calories), del('food_log', r.id)])))}
    </div>
  `);
  bindForm('foodForm', 'food_log');
  bindDeletes();
}

function workouts() {
  const pounds = lifetimePounds();
  const sessions = state.workout_sessions || [];
  if (selectedWorkoutSessionId && !sessions.some((session) => session.id === selectedWorkoutSessionId)) {
    selectedWorkoutSessionId = null;
  }
  const selectedSession = sessions.find((session) => session.id === selectedWorkoutSessionId) || sessions[0];
  if (selectedSession) selectedWorkoutSessionId = selectedSession.id;
  const editingSession = sessions.find((session) => session.id === editingWorkoutSessionId);
  const editingExercise = (state.workout_exercises || []).find((exercise) => exercise.id === editingExerciseId);
  setContent(`
    <div class="grid">
      ${metrics([
        ['Lifetime lifted', `${fmt(pounds.total)} lbs`, `${fmt(Math.max(0, 1000000 - pounds.total))} remaining`],
        ['Progress', `${fmt(pounds.total / 1000000 * 100, 1)}%`, '1,000,000 lb challenge'],
        ['Sessions week/month', `${pounds.week} / ${pounds.month}`, `${pounds.sessions} lifetime`],
        ['Workout burn today', `${fmt(dailyBurn().workoutBurn)} cal`, 'Resistance training MET estimate']
      ])}
      ${panel('Challenge progress', `<div class="progress"><span style="width:${Math.min(100, pounds.total / 1000000 * 100)}%"></span></div>`)}
      ${panel(editingSession ? 'Edit workout session' : 'Add workout session', workoutSessionForm(editingSession))}
      ${panel('Workout templates', workoutTemplatesPanel())}
      <div class="grid workout-grid">
        ${panel('Sessions', workoutSessionsTable())}
        ${panel('Per-exercise lifetime totals', exerciseTotalsTable())}
      </div>
      ${selectedSession ? panel(`${editingExercise ? 'Edit exercise' : 'Selected session exercises'}`, workoutExercisesTable(selectedSession.id, editingExercise)) : ''}
    </div>
  `);
  bindWorkoutSessionForm();
  bindWorkoutTemplateActions();
  if (editingExercise) bindExerciseForm();
  bindWorkoutActions();
  bindDeletes();
}

function activity() {
  const burn = dailyBurn();
  const intake = foodTotals();
  const balance = intake.calories - burn.tdee;
  const rows = activityDisplayRows();
  const todaysSteps = latestSteps();
  if (selectedActivityId && !rows.some((row) => String(row.id) === String(selectedActivityId))) {
    selectedActivityId = null;
  }
  const selectedActivity = rows.find((row) => String(row.id) === String(selectedActivityId));
  const editingActivity = (state.activities || []).find((row) => row.id === editingActivityId);
  if (selectedActivity) {
    setContent(activityDetailScreen(selectedActivity));
    bindActivityDetailActions();
    if (editingActivity) bindActivityForm();
    if (editingWorkoutSessionId) bindWorkoutSessionForm();
    bindExerciseFormIfPresent();
    bindWorkoutActions();
    bindDeletes();
    return;
  }
  setContent(`
    <div class="grid">
      ${metrics([
        ['Steps today', burn.steps ? fmt(burn.steps) : '--', todaysSteps ? todaysSteps.date : 'No step entry'],
        ['Step calories', `${fmt(burn.stepBurn)} cal`, 'Estimated from profile weight'],
        ['BMR', `${fmt(bmr())} cal`, 'Katch-McArdle'],
        ['Activity calories', `${fmt(burn.activityBurn)} cal`, 'Steps plus non-workout activity'],
        ['Workout burn', `${fmt(burn.workoutBurn)} cal`, 'Estimated from saved workout sessions'],
        ['TDEE', `${fmt(burn.tdee)} cal`, 'BMR + burn'],
        ['Deficit / surplus', `${balance >= 0 ? '+' : ''}${fmt(balance)} cal`, `${fmt(intake.calories)} calories in today`]
      ])}
      <div class="grid two">
        ${panel(editingStepLogId ? 'Edit daily steps' : 'Daily steps', `${stepBurnNote()}${stepForm((state.step_log || []).find((row) => row.id === editingStepLogId) || todaysSteps)}`)}
        ${panel(editingActivity ? 'Edit activity' : 'Log activity', activityForm(editingActivity))}
      </div>
      ${activityHistorySortControl()}
      ${panel('Step history', stepHistoryTable())}
      ${panel('Activity history', activityHistoryTable(rows))}
    </div>
  `);
  bindStepForm();
  bindActivityForm();
  bindActivityHistorySort();
  bindActivityActions();
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
  const editingLabResult = (state.lab_results || []).find((row) => row.id === editingLabResultId);
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
        ${panel(editingLabResult ? 'Edit lab result' : 'Log lab result', labForm(editingLabResult))}
        ${panel('A1c progression', '<div class="chart-wrap"><canvas id="a1cChart"></canvas></div>')}
      </div>
      ${panel('Lab history', table(['Date', 'Test', 'Category', 'Value', 'Range', 'Flag', 'Notes', 'Actions'], state.lab_results.map((r) => [r.date, r.test_name, r.test_category || '', labValue(r), r.reference_range, outOfRange(r) ? raw('<span class="reading-amber">Review</span>') : 'In range', r.notes || '', labActions(r)])))}
    </div>
  `);
  bindLabForm();
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
          <p class="muted">Backup exports a checked SQLite copy. Restore validates the selected backup and creates a safety copy before replacing the local database.</p>
          <div class="actions">
            <button class="primary-button" id="backupBtn" type="button">Backup database</button>
            <button class="ghost-button" id="restoreBtn" type="button">Restore database</button>
            <button class="ghost-button" id="exportFullJsonBtn" type="button">Export JSON</button>
            <button class="ghost-button" id="importFullJsonBtn" type="button">Import JSON</button>
            <button class="danger-button" id="clearBtn" type="button">Clear all data</button>
          </div>
        </div>
      `)}
    </div>
  `);
  document.getElementById('profileForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = formData(event.target);
    body.lean_body_mass = leanBodyMass(body.current_weight, body.body_fat) || '';
    await save(() => api.saveProfile(body));
  });
  document.getElementById('backupBtn').addEventListener('click', async () => {
    const result = await api.backup();
    if (!result.canceled) notify(`Backup saved: ${result.path}`);
  });
  document.getElementById('restoreBtn').addEventListener('click', async () => {
    if (!confirm('Restore will replace the current local database. Continue?')) return;
    const result = await api.restore();
    if (!result.canceled) {
      notify(`Restore complete. Safety backup: ${result.safetyBackupPath}`);
      await refresh();
    }
  });
  document.getElementById('exportFullJsonBtn').addEventListener('click', async () => {
    const result = await api.exportFullJson();
    if (!result.canceled) notify(`JSON export saved: ${result.path}`);
  });
  document.getElementById('importFullJsonBtn').addEventListener('click', async () => {
    if (!confirm('Import will replace the current local records after creating a safety backup. Continue?')) return;
    const result = await api.importFullJson();
    if (!result.canceled) {
      notify(`JSON import complete. Safety backup: ${result.safetyBackupPath}`);
      await refresh();
    }
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

function bloodPressureForm() {
  return `<form id="bloodPressureForm">${fields([
    ['date', 'Date', 'date', today()],
    ['time', 'Time', 'time', nowTime()],
    ['systolic', 'Systolic', 'number'],
    ['diastolic', 'Diastolic', 'number'],
    ['heart_rate', 'Heart rate', 'number'],
    ['position', 'Position', 'select', 'seated', ['seated', 'standing', 'lying', 'after activity']]
  ])}<label>Notes<textarea name="notes"></textarea></label><button class="primary-button">Save reading</button></form>`;
}

function foodForm() {
  return `<form id="foodForm">${fields([
    ['date', 'Date', 'date', today()],
    ['meal_type', 'Meal type', 'select', 'breakfast', ['breakfast', 'lunch', 'dinner', 'snack', 'drink']],
    ['description', 'Description', 'text'],
    ['net_carbs', 'Net carbs (g)', 'number'],
    ['protein', 'Protein (g)', 'number'],
    ['fat', 'Fat (g)', 'number'],
    ['calories', 'Calories', 'number']
  ])}<button class="primary-button">Save meal</button></form>`;
}

function workoutSessionForm(row = null) {
  const draft = row ? row : workoutSessionDraft;
  const estimate = workoutCalorieEstimate(draft, draftWorkoutExercises);
  const baseCalories = row?.base_calories ?? estimate.calories;
  return `<form id="workoutSessionForm">
    ${row ? `<input type="hidden" name="id" value="${attr(row.id)}">` : ''}
    ${fields([
      ['date', 'Date', 'date', draft?.date || today()],
      ['workout_time', 'Workout time', 'time', draft?.workout_time || nowTime()],
      ['environment', 'Environment', 'select', draft?.environment || 'indoor', ['indoor', 'outdoor']],
      ['pre_glucose', 'Pre-workout glucose', 'number', draft?.pre_glucose || ''],
      ['post_glucose', 'Post-workout glucose', 'number', draft?.post_glucose || ''],
      ['duration', 'Duration (minutes)', 'number', draft?.duration || ''],
      ['effort', 'Effort', 'select', draft?.effort || 'moderate', ['light', 'moderate', 'vigorous']]
    ])}
    ${weatherSection(draft, baseCalories)}
    <label>Notes<textarea name="notes">${esc(draft?.notes || '')}</textarea></label>
    ${row ? '' : `
      <div class="subpanel">
        <h3>Add exercise</h3>
        ${draftExerciseFields()}
        <div class="actions">
          <button class="ghost-button" data-add-draft-exercise type="button">Add exercise</button>
          ${draftWorkoutExercises.length ? '<button class="ghost-button" data-clear-draft-exercises type="button">Clear exercises</button>' : ''}
        </div>
        ${draftExerciseTable()}
      </div>
      <div class="alert">
        Estimated workout burn: <strong id="workoutEstimate">${fmt(estimate.calories)} cal</strong>
        <span class="muted"> | ${fmt(estimate.duration)} min | ${fmt(estimate.pounds)} lbs drafted</span>
      </div>
    `}
    <div class="actions">
      <button class="primary-button">${row ? 'Update session' : 'Add session'}</button>
      ${row ? '<button class="ghost-button" data-cancel-workout-edit type="button">Cancel edit</button>' : ''}
    </div>
  </form>`;
}

function exerciseForm(sessionId, row = null) {
  const groups = Object.keys(exerciseGroups);
  const group = row?.muscle_group || groups[0];
  return `<form id="exerciseForm">
    <input type="hidden" name="session_id" value="${attr(sessionId)}" />
    ${row ? `<input type="hidden" name="id" value="${attr(row.id)}" />` : ''}
    ${fields([
      ['muscle_group', 'Muscle group', 'select', group, groups],
      ['exercise', 'Exercise', 'select', row?.exercise || exerciseGroups[group][0][0], exerciseGroups[group].map((x) => x[0])],
      ['sets', 'Sets', 'number', row?.sets || ''],
      ['reps', 'Reps', 'number', row?.reps || ''],
      ['weight', 'Weight (lbs)', 'number', row?.weight || ''],
      ['seconds', 'Seconds for timed exercises', 'number', row?.seconds || '']
    ])}
    <div id="exerciseConventionNote">${exerciseConventionNote(row?.exercise || exerciseGroups[group][0][0])}</div>
    <div class="actions">
      <button class="primary-button">${row ? 'Update exercise' : 'Save exercise'}</button>
      ${row ? '<button class="ghost-button" data-cancel-exercise-edit type="button">Cancel edit</button>' : ''}
    </div>
  </form>`;
}

function draftExerciseFields() {
  const groups = Object.keys(exerciseGroups);
  const group = workoutSessionDraft.ex_muscle_group || groups[0];
  const exercise = workoutSessionDraft.ex_exercise || exerciseGroups[group][0][0];
  return `${fields([
    ['ex_muscle_group', 'Muscle group', 'select', group, groups],
    ['ex_exercise', 'Exercise', 'select', exercise, exerciseGroups[group].map((x) => x[0])],
    ['ex_sets', 'Sets', 'number', workoutSessionDraft.ex_sets || ''],
    ['ex_reps', 'Reps', 'number', workoutSessionDraft.ex_reps || ''],
    ['ex_weight', 'Weight (lbs)', 'number', workoutSessionDraft.ex_weight || ''],
    ['ex_seconds', 'Seconds for timed exercises', 'number', workoutSessionDraft.ex_seconds || '']
  ])}<div id="draftExerciseConventionNote">${exerciseConventionNote(exercise)}</div>`;
}

function exerciseConventionNote(exercise) {
  const plankDefinition = plankCatalog.plankDefinition?.(exercise);
  if (plankDefinition) {
    const guidance = [
      'enter active seconds per set',
      plankDefinition.supportsReps ? 'reps estimate active time only when seconds are blank' : '',
      plankDefinition.supportsWeight ? 'weight is added load with a capped calorie adjustment' : '',
      plankDefinition.unilateral ? 'for left/right work, enter each side as its own set or enter one combined total set, not both' : ''
    ].filter(Boolean).join('; ');
    return `<div class="alert">${esc(exercise)}: ${esc(guidance)}. MET ${fmt(plankDefinition.met, 1)}. Timed plank entries add calorie burn while lifting-challenge pounds stay at 0.</div>`;
  }
  if (exercise !== 'Cable Kong Curl') return '';
  return '<div class="alert">Cable Kong Curl: count one rep as one curl by one arm. Enter the resistance shown on one cable stack/handle. The static extended-arm hold is not a separate rep. Volume uses the standard bilateral formula without left/right doubling.</div>';
}

function draftExerciseTable() {
  return table(['Muscle group', 'Exercise', 'Sets', 'Reps', 'Weight', 'Time', 'Pounds', ''], draftWorkoutExercises.map((exercise, index) => [
    exercise.muscle_group,
    exercise.exercise,
    fmt(exercise.sets),
    fmt(exercise.reps),
    exercise.mode === 'bodyweight' ? 'bodyweight' : fmt(exercise.weight),
    exercise.mode === 'timed' ? timedExerciseSummary(exercise) : '',
    fmt(exercise.pounds),
    raw(`<button class="mini-button" data-remove-draft-exercise="${index}" type="button">Remove</button>`)
  ]));
}

function timedExerciseSummary(exercise) {
  if (!plankCatalog.isPlankExercise?.(exercise.exercise)) return `${fmt(exercise.seconds)} sec`;
  const activeSeconds = plankActiveSeconds(exercise);
  const calories = plankCaloriesForExercise(exercise, profileWeight(), workoutSessionDraft.effort || 'moderate');
  return `${fmt(activeSeconds)} sec active, ${fmt(calories)} cal`;
}

function workoutTemplatesPanel() {
  const templates = state.workout_templates || [];
  const canSave = draftWorkoutExercises.length > 0;
  const saveForm = `<form id="workoutTemplateForm">
    ${fields([
      ['template_name', 'Template name', 'text', ''],
      ['template_effort', 'Default effort', 'select', workoutSessionDraft.effort || 'moderate', ['light', 'moderate', 'vigorous']],
      ['template_duration', 'Default duration (minutes)', 'number', workoutSessionDraft.duration || '']
    ])}
    <label>Template notes<textarea name="template_notes">${esc(workoutSessionDraft.notes || '')}</textarea></label>
    <button class="ghost-button" ${canSave ? '' : 'disabled'} type="submit">Save current draft as template</button>
  </form>`;
  const templateRows = templates.map((template) => [
    template.name,
    `${fmt(template.duration)} min`,
    template.effort || 'moderate',
    `${parseTemplateExercises(template).length} exercises`,
    raw(`<div class="actions"><button class="mini-button" data-apply-template="${attr(template.id)}" type="button">Apply</button>${del('workout_templates', template.id).html}</div>`)
  ]);
  return `${saveForm}${table(['Name', 'Duration', 'Effort', 'Exercises', 'Actions'], templateRows)}`;
}

function weatherSection(values = {}, baseCalories = 0) {
  const environment = values.environment || 'indoor';
  const result = applyEnvironmentalAdjustment(baseCalories, { ...values, environment });
  const warnings = result.safety_warnings || [];
  const source = values.weather_source || (environment === 'outdoor' ? 'Manual' : '');
  return `
    <section class="subpanel weather-section ${environment === 'outdoor' ? '' : 'weather-hidden'}" data-weather-section>
      <h3>Weather</h3>
      <p class="muted">Retrieve weather automatically or complete location, temperature, humidity, and wind speed before saving. Weather is stored with this entry so its calorie result will not change later.</p>
      ${fields([
        ['location', 'Workout location', 'text', values.location || ''],
        ['temperature_f', 'Temperature (°F)', 'number', values.temperature_f ?? ''],
        ['humidity_percent', 'Humidity (%)', 'number', values.humidity_percent ?? ''],
        ['wind_mph', 'Wind speed (mph)', 'number', values.wind_mph ?? '']
      ])}
      <input type="hidden" name="weather_source" value="${attr(source)}">
      <input type="hidden" name="weather_is_automatic" value="${attr(values.weather_is_automatic || 0)}">
      <input type="hidden" name="weather_retrieved_at" value="${attr(values.weather_retrieved_at || '')}">
      <div class="alert bad form-error weather-hidden" data-weather-error role="alert" aria-live="polite"></div>
      <div class="actions">
        <button class="ghost-button" data-fetch-weather type="button">Retrieve weather automatically</button>
        <span class="muted" data-weather-source>${esc(source ? `Source: ${source}` : 'Manual entry')}</span>
      </div>
      <div class="grid four weather-summary">
        ${weatherMetric('Heat Index', result.heat_index_f, '°F', 'heat-index')}
        ${weatherMetric('Wind Chill', result.wind_chill_f, '°F', 'wind-chill')}
        ${weatherMetric('Environmental Load', result.environmental_load || '--', '', 'environmental-load')}
        ${weatherMetric('Calorie Adjustment', result.calorie_adjustment_percent, '%', 'calorie-adjustment')}
      </div>
      <div class="alert">
        Final calories: <strong data-final-calories>${fmt(result.final_calories)} cal</strong>
        <span class="muted"> after the normal ${fmt(result.base_calories)} calorie calculation</span>
      </div>
      <div data-weather-warnings>${warnings.map((warning) => `<div class="alert warn">${esc(warning)}</div>`).join('')}</div>
    </section>
  `;
}

function weatherMetric(label, value, suffix, key) {
  const display = typeof value === 'number' ? `${fmt(value, 1)}${suffix}` : `${value}${suffix}`;
  return `<article class="metric compact-metric"><span>${esc(label)}</span><strong data-weather-${attr(key)}>${esc(display)}</strong></article>`;
}

function activityForm(row = null) {
  const names = [...new Set([row?.name, ...Object.keys(activities)].filter(Boolean))];
  const baseCalories = row?.base_calories ?? row?.calories ?? 0;
  return `<form id="activityForm">
    ${row ? `<input type="hidden" name="id" value="${attr(row.id)}">` : ''}
    <input type="hidden" name="kind" value="${attr(row?.kind || 'activity')}">
    <input type="hidden" name="source_session_id" value="${attr(row?.source_session_id || '')}">
    ${fields([
      ['date', 'Date', 'date', row?.date || today()],
      ['workout_time', 'Activity time', 'time', row?.workout_time || nowTime()],
      ['environment', 'Environment', 'select', row?.environment || 'indoor', ['indoor', 'outdoor']],
      ['name', 'Activity', 'select', row?.name || 'Slow walking', names],
      ['met', 'MET', 'number', row?.met || activities['Slow walking']],
      ['duration', 'Duration (minutes)', 'number', row?.duration || ''],
      ['calories', 'Base calories', 'number', baseCalories || '']
    ])}
    ${weatherSection(row || {}, baseCalories)}
    <label>Notes<textarea name="notes">${esc(row?.notes || '')}</textarea></label>
    <div class="alert bad form-error weather-hidden" data-activity-error role="alert" aria-live="polite"></div>
    <div class="actions">
      <button class="primary-button" type="submit">${row ? 'Update activity' : 'Save activity'}</button>
      ${row ? '<button class="ghost-button" data-cancel-activity-edit type="button">Cancel edit</button>' : ''}
    </div>
  </form>`;
}

function stepForm(row = null) {
  return `<form id="stepForm">
    ${row ? `<input type="hidden" name="id" value="${attr(row.id)}">` : ''}
    ${fields([
    ['date', 'Date', 'date', row?.date || today()],
    ['steps', 'Steps', 'number', row?.steps || '']
  ])}
    <label>Notes<textarea name="notes">${esc(row?.notes || '')}</textarea></label>
    <div class="actions">
      <button class="primary-button">${row ? 'Update steps' : 'Save steps'}</button>
      ${editingStepLogId ? '<button class="ghost-button" data-cancel-step-edit type="button">Cancel edit</button>' : ''}
    </div>
  </form>`;
}

function stepBurnNote() {
  return '<div class="alert">When steps are logged for a day, walking activities stay in history but their calories are not added again. Other activities still count.</div>';
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

function labForm(row = null) {
  const categoryOptions = ['', ...labCategories];
  const initialResults = labCatalogSearch('', '');
  const isEditing = Boolean(row);
  return `<form id="labForm">
    <div class="subpanel">
      ${fields([
        ['lab_search', 'Search catalog', 'text'],
        ['lab_category_filter', 'Category filter', 'select', '', categoryOptions]
      ])}
      <div id="labSearchResults" class="picker-results">${labSearchResults(initialResults)}</div>
      <div id="labSelectedDetails" class="alert">${labSelectedDetails()}</div>
    </div>
    <input type="hidden" name="id" value="${attr(row?.id || '')}">
    <input type="hidden" name="catalog_source" value="${attr(row?.catalog_source || '')}">
    <input type="hidden" name="catalog_id" value="${attr(row?.catalog_id || '')}">
    ${fields([
    ['date', 'Date', 'date', row?.date || today()],
    ['test_name', 'Test name', 'text', row?.test_name || ''],
    ['test_category', 'Category', 'text', row?.test_category || ''],
    ['unit', 'Unit', 'text', row?.unit || ''],
    ['value', 'Value', 'number', row?.value ?? ''],
    ['reference_range', 'Reference range', 'text', row?.reference_range || '']
  ])}<label>Notes<textarea name="notes">${esc(row?.notes || '')}</textarea></label>
    ${isEditing ? '' : '<label class="inline-check"><input type="checkbox" name="save_custom_test" value="yes"> Save this test to my personal catalog</label>'}
    <div class="actions">
      <button class="primary-button">${isEditing ? 'Save changes' : 'Save lab'}</button>
      ${isEditing ? '<button class="ghost-button" data-cancel-lab-edit type="button">Cancel</button>' : ''}
    </div></form>`;
}

function profileForm(p) {
  return `<form id="profileForm">${fields([
    ['name', 'Name', 'text', p.name || ''],
    ['date_of_birth', 'Date of birth', 'date', p.date_of_birth || ''],
    ['sex', 'Sex', 'select', p.sex || 'male', ['male', 'female']],
    ['height_ft', 'Height ft', 'number', p.height_ft || ''],
    ['height_in', 'Height in', 'number', p.height_in || ''],
    ['current_weight', 'Current weight (lbs)', 'number', p.current_weight || ''],
    ['body_fat', 'Body fat %', 'number', p.body_fat || ''],
    ['goals', 'Goal', 'select', p.goals || 'weight loss', ['weight loss', 'body recomposition', 'muscle gain', 'maintenance', 'manage T2D/blood sugar']],
    ['diet_type', 'Diet type', 'select', p.diet_type || 'keto', Object.keys(dietProfiles)],
    ['protein_target', 'Protein target (g)', 'number', p.protein_target || 160],
    ['a1c_goal', 'A1c goal (%)', 'number', p.a1c_goal || 5.7],
    ['theme', 'Theme', 'select', p.theme || 'dark', ['dark', 'light']],
    ['ui_scale', 'Text size', 'select', p.ui_scale || 'normal', ['normal', 'large', 'extra large']],
    ['eating_window', 'Eating window', 'text', p.eating_window || '']
  ])}<label>Active medical conditions<textarea name="medical_conditions">${esc(p.medical_conditions || '')}</textarea></label><p class="muted">Age: ${age(p.date_of_birth) || '--'} | Lean body mass: ${fmt(lbm(p), 1)} lbs | BMR: ${fmt(bmr())} cal</p><button class="primary-button">Save profile</button></form>`;
}

function fields(items) {
  return `<div class="form-grid">${items.map(([name, label, type, value = '', options]) => {
    if (type === 'select') {
      return `<label>${esc(label)}<select name="${attr(name)}">${options.map((option) => `<option value="${attr(option)}" ${option === value ? 'selected' : ''}>${esc(option || 'Not set')}</option>`).join('')}</select></label>`;
    }
    if (type === 'number') {
      return numberField(name, label, value);
    }
    return `<label>${esc(label)}<input name="${attr(name)}" type="${attr(type)}" value="${attr(value)}"></label>`;
  }).join('')}</div>`;
}

function numberField(name, label, value = '') {
  return `<label>${esc(label)}
    <span class="number-control">
      <input name="${attr(name)}" type="text" inputmode="decimal" data-number-input value="${attr(value)}">
      <button class="number-step" data-number-step="-1" aria-label="Decrease ${attr(label)}" type="button">-</button>
      <button class="number-step" data-number-step="1" aria-label="Increase ${attr(label)}" type="button">+</button>
    </span>
  </label>`;
}

function handleNumberStepClick(event) {
  const button = event.target.closest('[data-number-step]');
  if (!button) return;
  const input = button.closest('.number-control')?.querySelector('[data-number-input]');
  if (!input) return;
  const direction = Number(button.dataset.numberStep) || 0;
  const current = Number(input.value);
  const base = Number.isFinite(current) ? current : 0;
  const next = base + direction;
  input.value = String(next);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.focus();
  input.select();
}

function bindForm(id, tableName) {
  document.getElementById(id).addEventListener('submit', async (event) => {
    event.preventDefault();
    await save(() => api.add(tableName, formData(event.target)));
  });
}

function bindLabForm() {
  const form = document.getElementById('labForm');
  const searchInput = form.elements.lab_search;
  const categoryFilter = form.elements.lab_category_filter;
  const resultsTarget = document.getElementById('labSearchResults');
  const detailsTarget = document.getElementById('labSelectedDetails');
  const renderResults = () => {
    resultsTarget.innerHTML = labSearchResults(labCatalogSearch(searchInput.value, categoryFilter.value));
    bindLabResultButtons(form, detailsTarget);
  };
  searchInput.addEventListener('input', renderResults);
  categoryFilter.addEventListener('change', renderResults);
  bindLabResultButtons(form, detailsTarget);
  form.addEventListener('input', () => {
    detailsTarget.innerHTML = labSelectedDetails(selectedLabTestFromForm(form), form);
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = formData(form);
    const labResultId = Number(body.id);
    const shouldSaveCustomTest = body.save_custom_test === 'yes';
    delete body.id;
    delete body.lab_search;
    delete body.lab_category_filter;
    delete body.save_custom_test;
    await save(async () => {
      if (labResultId) {
        editingLabResultId = null;
        return api.update('lab_results', labResultId, body);
      }
      if (shouldSaveCustomTest) {
        const custom = await api.add('lab_test_catalog_custom', customLabPayloadFromLab(body));
        body.catalog_source = 'custom';
        body.catalog_id = String(custom.id);
      }
      return api.add('lab_results', body);
    });
  });
  document.querySelector('[data-cancel-lab-edit]')?.addEventListener('click', () => {
    editingLabResultId = null;
    renderPage('labs');
  });
  document.querySelectorAll('[data-edit-lab]').forEach((button) => {
    button.addEventListener('click', () => {
      editingLabResultId = Number(button.dataset.editLab);
      renderPage('labs');
    });
  });
}

function bindLabResultButtons(form, detailsTarget) {
  document.querySelectorAll('[data-select-lab]').forEach((button) => {
    button.addEventListener('click', () => {
      const test = labCatalogTest(button.dataset.labSource, button.dataset.selectLab);
      if (!test) return;
      form.elements.catalog_source.value = test.source;
      form.elements.catalog_id.value = test.id;
      form.elements.test_name.value = test.displayName;
      form.elements.test_category.value = test.category || '';
      form.elements.unit.value = test.defaultUnit || '';
      form.elements.reference_range.value = test.referenceRange || '';
      detailsTarget.innerHTML = labSelectedDetails(test, form);
    });
  });
  document.querySelector('[data-custom-lab]')?.addEventListener('click', () => {
    form.elements.catalog_source.value = 'custom-manual';
    form.elements.catalog_id.value = '';
    detailsTarget.innerHTML = labSelectedDetails(null, form);
    form.elements.test_name.focus();
  });
}

function bindWorkoutSessionForm() {
  const form = document.getElementById('workoutSessionForm');
  const groupSelect = form.elements.ex_muscle_group;
  const exerciseSelect = form.elements.ex_exercise;
  bindWeatherFields(form, () => {
    const sessionId = Number(form.elements.id?.value);
    const exercises = sessionId ? exercisesForSession(sessionId) : draftWorkoutExercises;
    return workoutCalorieEstimate(workoutSessionBody(formData(form)), exercises).calories;
  });
  form.addEventListener('input', () => {
    if (!form.elements.id) {
      workoutSessionDraft = formData(form);
      updateWorkoutEstimate(form);
    }
  });
  groupSelect?.addEventListener('change', () => {
    workoutSessionDraft = formData(form);
    workoutSessionDraft.ex_exercise = exerciseGroups[groupSelect.value][0][0];
    renderPage('workouts');
  });
  exerciseSelect?.addEventListener('change', () => {
    workoutSessionDraft = formData(form);
    const note = document.getElementById('draftExerciseConventionNote');
    if (note) note.innerHTML = exerciseConventionNote(workoutSessionDraft.ex_exercise);
  });
  document.querySelector('[data-add-draft-exercise]')?.addEventListener('click', () => {
    workoutSessionDraft = formData(form);
    const exercise = draftExerciseFromForm(workoutSessionDraft);
    if (!exercise.exercise) return;
    draftWorkoutExercises.push(exercise);
    workoutSessionDraft.ex_sets = '';
    workoutSessionDraft.ex_reps = '';
    workoutSessionDraft.ex_weight = '';
    workoutSessionDraft.ex_seconds = '';
    renderPage('workouts');
  });
  document.querySelector('[data-clear-draft-exercises]')?.addEventListener('click', () => {
    workoutSessionDraft = formData(form);
    draftWorkoutExercises = [];
    renderPage('workouts');
  });
  document.querySelectorAll('[data-remove-draft-exercise]').forEach((button) => {
    button.addEventListener('click', () => {
      workoutSessionDraft = formData(form);
      draftWorkoutExercises.splice(Number(button.dataset.removeDraftExercise), 1);
      renderPage('workouts');
    });
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formBody = formData(event.target);
    const body = workoutSessionBody(formBody);
    await save(async () => {
      const sessionId = Number(body.id);
      delete body.id;
      const estimate = workoutCalorieEstimate(body, draftWorkoutExercises);
      if (!n(body.duration) && estimate.duration) body.duration = estimate.duration;
      const baseCalories = sessionId
        ? workoutCalorieEstimate(body, exercisesForSession(sessionId)).calories
        : estimate.calories;
      Object.assign(body, environmentalRecord(body, baseCalories));
      const met = workoutMet(body.effort);
      const activity = {
        date: body.date,
        name: `Resistance training (${body.effort})`,
        met,
        duration: body.duration,
        calories: body.final_calories,
        notes: body.notes,
        kind: 'workout',
        ...environmentalFieldsFrom(body)
      };
      if (sessionId) {
        await api.update('workout_sessions', sessionId, body);
        const linked = linkedWorkoutActivity(sessionId) || findLegacyWorkoutActivity(sessionId);
        if (linked) await api.update('activities', linked.id, { ...activity, source_session_id: sessionId });
        editingWorkoutSessionId = null;
        return { id: sessionId };
      }
      const result = await api.add('workout_sessions', body);
      selectedWorkoutSessionId = Number(result.id);
      await api.add('activities', { ...activity, source_session_id: result.id });
      for (const exercise of draftWorkoutExercises) {
        await api.add('workout_exercises', { ...exercise, session_id: result.id });
      }
      workoutSessionDraft = {};
      draftWorkoutExercises = [];
      return result;
    });
  });
}

function bindWorkoutTemplateActions() {
  document.getElementById('workoutTemplateForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!draftWorkoutExercises.length) return;
    const body = formData(event.target);
    const template = {
      name: body.template_name,
      duration: body.template_duration || workoutSessionDraft.duration,
      effort: body.template_effort || workoutSessionDraft.effort || 'moderate',
      notes: body.template_notes,
      exercises: JSON.stringify(draftWorkoutExercises.map(templateExercise))
    };
    await save(() => api.add('workout_templates', template));
  });
  document.querySelectorAll('[data-apply-template]').forEach((button) => {
    button.addEventListener('click', () => {
      const template = (state.workout_templates || []).find((row) => String(row.id) === String(button.dataset.applyTemplate));
      if (!template) return;
      workoutSessionDraft = {
        ...workoutSessionDraft,
        duration: template.duration || workoutSessionDraft.duration || '',
        effort: template.effort || 'moderate',
        notes: template.notes || workoutSessionDraft.notes || ''
      };
      draftWorkoutExercises = parseTemplateExercises(template).map((exercise) => ({
        ...exercise,
        pounds: exercisePounds(exercise)
      }));
      renderPage('workouts');
    });
  });
}

function bindExerciseForm() {
  const form = document.getElementById('exerciseForm');
  const groupSelect = form.elements.muscle_group;
  const exerciseSelect = form.elements.exercise;
  groupSelect.addEventListener('change', () => {
    exerciseSelect.innerHTML = exerciseGroups[groupSelect.value].map(([name]) => `<option>${esc(name)}</option>`).join('');
    document.getElementById('exerciseConventionNote').innerHTML = exerciseConventionNote(exerciseSelect.value);
  });
  exerciseSelect.addEventListener('change', () => {
    document.getElementById('exerciseConventionNote').innerHTML = exerciseConventionNote(exerciseSelect.value);
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = formData(form);
    const exerciseId = Number(body.id);
    delete body.id;
    body.mode = exerciseMode(body.muscle_group, body.exercise);
    body.pounds = exercisePounds(body);
    await save(() => {
      if (exerciseId) {
        editingExerciseId = null;
        return api.update('workout_exercises', exerciseId, body);
      }
      return api.add('workout_exercises', body);
    });
  });
}

function bindWorkoutActions() {
  document.querySelectorAll('[data-select-session]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedWorkoutSessionId = Number(button.dataset.selectSession);
      editingExerciseId = null;
      renderPage('workouts');
    });
  });
  document.querySelectorAll('[data-edit-session]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedWorkoutSessionId = Number(button.dataset.editSession);
      editingWorkoutSessionId = Number(button.dataset.editSession);
      editingExerciseId = null;
      renderPage('workouts');
    });
  });
  document.querySelectorAll('[data-edit-exercise]').forEach((button) => {
    button.addEventListener('click', () => {
      editingExerciseId = Number(button.dataset.editExercise);
      const exercise = (state.workout_exercises || []).find((row) => row.id === editingExerciseId);
      if (exercise) selectedWorkoutSessionId = exercise.session_id;
      renderPage('workouts');
    });
  });
  document.querySelector('[data-cancel-workout-edit]')?.addEventListener('click', () => {
    editingWorkoutSessionId = null;
    renderPage('workouts');
  });
  document.querySelector('[data-cancel-exercise-edit]')?.addEventListener('click', () => {
    editingExerciseId = null;
    renderPage('workouts');
  });
}

function bindActivityForm() {
  const form = document.getElementById('activityForm');
  bindWeatherFields(form, () => n(form.elements.calories.value));
  form.addEventListener('invalid', () => {
    const activityError = activityValidationError(formData(form));
    if (activityError) showActivityError(form, activityError.message);
  }, true);
  form.elements.name.addEventListener('change', () => {
    if (activities[form.elements.name.value]) form.elements.met.value = activities[form.elements.name.value];
    form.elements.calories.value = fmt(metCalories(form.elements.met.value, form.elements.duration.value, form.elements.date.value));
    updateWeatherPreview(form, n(form.elements.calories.value));
  });
  form.elements.met.addEventListener('input', () => {
    form.elements.calories.value = fmt(metCalories(form.elements.met.value, form.elements.duration.value, form.elements.date.value));
    updateWeatherPreview(form, n(form.elements.calories.value));
  });
  form.elements.calories.addEventListener('input', () => updateWeatherPreview(form, n(form.elements.calories.value)));
  form.elements.duration.addEventListener('input', () => {
    form.elements.calories.value = fmt(metCalories(form.elements.met.value, form.elements.duration.value, form.elements.date.value));
    updateWeatherPreview(form, n(form.elements.calories.value));
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = formData(form);
    const activityError = activityValidationError(body);
    if (activityError) {
      showActivityError(form, activityError.message);
      form.elements[activityError.field]?.focus();
      return;
    }
    const activityId = Number(body.id);
    delete body.id;
    const baseCalories = n(body.calories) || metCalories(body.met, body.duration, body.date);
    Object.assign(body, environmentalRecord(body, baseCalories));
    body.calories = body.final_calories;
    body.kind = body.kind || 'activity';
    await save(() => {
      if (activityId) {
        editingActivityId = null;
        selectedActivityId = activityId;
        return api.update('activities', activityId, body);
      }
      body.kind = 'activity';
      return api.add('activities', body);
    }, form.querySelector('[data-activity-error]'));
  });
}

function bindStepForm() {
  const form = document.getElementById('stepForm');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = formData(form);
    const stepLogId = Number(body.id) || n(latestSteps(body.date)?.id);
    delete body.id;
    await save(() => {
      editingStepLogId = null;
      if (stepLogId) return api.update('step_log', stepLogId, body);
      return api.add('step_log', body);
    });
  });
  document.querySelector('[data-cancel-step-edit]')?.addEventListener('click', () => {
    editingStepLogId = null;
    renderPage('activity');
  });
  document.querySelectorAll('[data-edit-steps]').forEach((button) => {
    button.addEventListener('click', () => {
      editingStepLogId = Number(button.dataset.editSteps);
      renderPage('activity');
    });
  });
}

function bindActivityHistorySort() {
  document.getElementById('activityHistoryOrder')?.addEventListener('change', (event) => {
    activityHistoryOrder = event.target.value === 'oldest' ? 'oldest' : 'newest';
    renderPage('activity');
  });
}

function bindActivityActions() {
  document.querySelectorAll('[data-select-activity]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedActivityId = button.dataset.selectActivity;
      editingActivityId = null;
      renderPage('activity');
    });
  });
  document.querySelectorAll('[data-edit-activity]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedActivityId = Number(button.dataset.editActivity);
      editingActivityId = Number(button.dataset.editActivity);
      renderPage('activity');
    });
  });
  document.querySelector('[data-cancel-activity-edit]')?.addEventListener('click', () => {
    editingActivityId = null;
    renderPage('activity');
  });
}

function bindActivityDetailActions() {
  document.querySelector('[data-back-activity]')?.addEventListener('click', () => {
    selectedActivityId = null;
    editingActivityId = null;
    editingWorkoutSessionId = null;
    editingExerciseId = null;
    renderPage('activity');
  });
  document.querySelector('[data-edit-detail]')?.addEventListener('click', () => {
    const row = activityDisplayRows().find((activity) => String(activity.id) === String(selectedActivityId));
    if (!row) return;
    if (row.kind === 'workout') {
      editingWorkoutSessionId = n(row.source_session_id);
      editingActivityId = null;
    } else {
      editingActivityId = n(row.id);
      editingWorkoutSessionId = null;
    }
    renderPage('activity');
  });
  document.querySelector('[data-delete-detail]')?.addEventListener('click', async () => {
    const row = activityDisplayRows().find((activity) => String(activity.id) === String(selectedActivityId));
    if (!row) return;
    if (!await confirmDelete(`Delete this ${row.kind === 'workout' ? 'workout' : 'activity'}?`)) return;
    await save(async () => {
      if (row.kind === 'workout' && row.source_session_id) {
        clearDeletedState('workout_sessions', n(row.source_session_id));
        await api.delete('workout_sessions', n(row.source_session_id));
      } else if (!row.synthetic) {
        clearDeletedState('activities', n(row.id));
        await api.delete('activities', n(row.id));
      }
      selectedActivityId = null;
      editingActivityId = null;
      editingWorkoutSessionId = null;
      editingExerciseId = null;
    });
  });
}

function bindExerciseFormIfPresent() {
  if (document.getElementById('exerciseForm')) bindExerciseForm();
}

function bindWeightForm() {
  document.getElementById('weightForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = formData(event.target);
    body.lean_body_mass = leanBodyMass(body.weight, body.body_fat) || '';
    await save(async () => {
      await api.add('weight_log', body);
      return api.saveSettings({ current_weight: body.weight, body_fat: body.body_fat, lean_body_mass: body.lean_body_mass });
    });
  });
}

function bindDeletes() {
  document.querySelectorAll('[data-delete]').forEach((button) => {
    button.addEventListener('click', async () => {
      const tableName = button.dataset.table;
      const id = Number(button.dataset.delete);
      if (!await confirmDelete('Delete this entry?')) return;
      await save(async () => {
        clearDeletedState(tableName, id);
        return api.delete(tableName, id);
      });
    });
  });
}

function confirmDelete(message) {
  const previousFocus = document.activeElement;
  const dialog = document.createElement('div');
  dialog.className = 'confirm-backdrop';
  dialog.innerHTML = `
    <div class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirmTitle">
      <h2 id="confirmTitle">Confirm delete</h2>
      <p>${esc(message)}</p>
      <div class="actions">
        <button class="ghost-button" data-confirm-cancel type="button">Cancel</button>
        <button class="danger-button" data-confirm-ok type="button">Delete</button>
      </div>
    </div>
  `;
  document.body.appendChild(dialog);

  return new Promise((resolve) => {
    let settled = false;
    const okButton = dialog.querySelector('[data-confirm-ok]');
    const cancelButton = dialog.querySelector('[data-confirm-cancel]');
    const finish = (confirmed) => {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', onKeyDown, true);
      dialog.remove();
      if (previousFocus?.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus();
      resolve(confirmed);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        finish(true);
      }
    };

    okButton.addEventListener('click', () => finish(true));
    cancelButton.addEventListener('click', () => finish(false));
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) finish(false);
    });
    document.addEventListener('keydown', onKeyDown, true);
    cancelButton.focus();
  });
}

function clearDeletedState(tableName, id) {
  const rowId = Number(id);
  if (tableName === 'workout_sessions') {
    if (selectedWorkoutSessionId === rowId) selectedWorkoutSessionId = null;
    if (editingWorkoutSessionId === rowId) editingWorkoutSessionId = null;
    if (draftWorkoutExercises.some((exercise) => n(exercise.session_id) === rowId)) draftWorkoutExercises = [];
    const editedExercise = (state.workout_exercises || []).find((exercise) => exercise.id === editingExerciseId);
    if (editedExercise && n(editedExercise.session_id) === rowId) editingExerciseId = null;
  }
  if (tableName === 'workout_exercises' && editingExerciseId === rowId) editingExerciseId = null;
  if (tableName === 'activities' && String(selectedActivityId) === String(rowId)) {
    selectedActivityId = null;
    editingActivityId = null;
  }
  if (tableName === 'activities' && editingActivityId === rowId) editingActivityId = null;
  if (tableName === 'step_log' && editingStepLogId === rowId) editingStepLogId = null;
  if (tableName === 'lab_results' && editingLabResultId === rowId) editingLabResultId = null;
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function environmentalRecord(body, baseCalories) {
  const environment = body.environment || 'indoor';
  if (environment !== 'outdoor') {
    return {
      environment: 'indoor',
      location: null,
      temperature_f: null,
      humidity_percent: null,
      wind_mph: null,
      heat_index_f: null,
      wind_chill_f: null,
      effective_temperature_f: null,
      weather_source: null,
      weather_is_automatic: 0,
      weather_retrieved_at: null,
      environmental_load: null,
      calorie_adjustment_percent: 0,
      base_calories: baseCalories,
      final_calories: baseCalories,
      safety_warnings: '[]',
      environmental_data: JSON.stringify({ schemaVersion: 1 })
    };
  }
  const result = applyEnvironmentalAdjustment(baseCalories, { ...body, environment });
  return {
    environment,
    workout_time: body.workout_time,
    location: body.location,
    temperature_f: body.temperature_f,
    humidity_percent: body.humidity_percent,
    wind_mph: body.wind_mph,
    heat_index_f: result.heat_index_f,
    wind_chill_f: result.wind_chill_f,
    effective_temperature_f: result.effective_temperature_f,
    weather_source: body.weather_source || 'Manual',
    weather_is_automatic: n(body.weather_is_automatic) ? 1 : 0,
    weather_retrieved_at: body.weather_retrieved_at || null,
    environmental_load: result.environmental_load,
    calorie_adjustment_percent: result.calorie_adjustment_percent,
    base_calories: result.base_calories,
    final_calories: result.final_calories,
    safety_warnings: JSON.stringify(result.safety_warnings),
    environmental_data: JSON.stringify({ schemaVersion: 1 })
  };
}

function environmentalFieldsFrom(row) {
  const fields = [
    'environment', 'workout_time', 'location', 'temperature_f', 'humidity_percent',
    'wind_mph', 'heat_index_f', 'wind_chill_f', 'effective_temperature_f',
    'weather_source', 'weather_is_automatic', 'weather_retrieved_at',
    'environmental_load', 'calorie_adjustment_percent', 'base_calories',
    'final_calories', 'safety_warnings', 'environmental_data'
  ];
  return Object.fromEntries(fields.map((field) => [field, row[field]]));
}

function bindWeatherFields(form, getBaseCalories) {
  if (!form) return;
  const environmentSelect = form.elements.environment;
  if (!environmentSelect) return;
  const weatherSectionElement = form.querySelector('[data-weather-section]');
  const weatherError = form.querySelector('[data-weather-error]');
  const fetchButton = form.querySelector('[data-fetch-weather]');
  const clearWeatherError = () => {
    if (!weatherError) return;
    weatherError.textContent = '';
    weatherError.classList.add('weather-hidden');
  };
  const showWeatherError = (message) => {
    if (!weatherError) return;
    weatherError.textContent = message;
    weatherError.classList.remove('weather-hidden');
  };
  const setVisibility = () => {
    const isOutdoor = environmentSelect.value === 'outdoor';
    weatherSectionElement?.classList.toggle('weather-hidden', !isOutdoor);
    for (const field of ['location', 'temperature_f', 'humidity_percent', 'wind_mph']) {
      if (form.elements[field]) form.elements[field].required = isOutdoor;
    }
  };
  environmentSelect.addEventListener('change', () => {
    setVisibility();
    updateWeatherPreview(form, getBaseCalories());
  });
  setVisibility();

  for (const field of ['date', 'workout_time', 'location', 'temperature_f', 'humidity_percent', 'wind_mph']) {
    form.elements[field]?.addEventListener('input', () => {
      clearWeatherError();
      form.elements.weather_is_automatic.value = '0';
      form.elements.weather_source.value = 'Manual';
      form.elements.weather_retrieved_at.value = '';
      const source = form.querySelector('[data-weather-source]');
      if (source) source.textContent = 'Source: Manual';
      updateWeatherPreview(form, getBaseCalories());
    });
  }

  fetchButton?.addEventListener('click', async () => {
    clearWeatherError();
    const missing = [
      ['date', 'Choose a date before retrieving weather.'],
      ['workout_time', 'Choose an activity time before retrieving weather.'],
      ['location', 'Enter a city, postal code, or location before retrieving weather.']
    ].find(([field]) => !String(form.elements[field]?.value || '').trim());
    if (missing) {
      showWeatherError(missing[1]);
      form.elements[missing[0]]?.focus();
      notify('Weather retrieval needs more information');
      return;
    }

    const originalButtonText = fetchButton.textContent;
    fetchButton.disabled = true;
    fetchButton.textContent = 'Retrieving weather...';
    weatherSectionElement?.setAttribute('aria-busy', 'true');
    notify('Retrieving weather...');
    try {
      const result = await api.getWeatherForWorkout({
        date: form.elements.date.value,
        time: form.elements.workout_time.value,
        location: form.elements.location.value
      });
      for (const field of ['location', 'temperature_f', 'humidity_percent', 'wind_mph', 'weather_source', 'weather_is_automatic', 'weather_retrieved_at']) {
        form.elements[field].value = result[field] ?? '';
      }
      const source = form.querySelector('[data-weather-source]');
      if (source) source.textContent = `Source: ${result.weather_source}`;
      updateWeatherPreview(form, getBaseCalories());
      notify('Weather retrieved');
    } catch (error) {
      const message = weatherErrorMessage(error);
      showWeatherError(message);
      notify('Weather retrieval failed');
    } finally {
      fetchButton.disabled = false;
      fetchButton.textContent = originalButtonText;
      weatherSectionElement?.removeAttribute('aria-busy');
    }
  });
  updateWeatherPreview(form, getBaseCalories());
}

function weatherErrorMessage(error) {
  const fallback = 'Weather is unavailable. Check your internet connection or enter the conditions manually.';
  const message = String(error?.message || '').trim();
  if (!message) return fallback;
  const remoteMessage = message.match(/Error invoking remote method ['"][^'"]+['"]:\s*Error:\s*(.+)$/s)?.[1];
  const clean = (remoteMessage || message).trim();
  if (/fetch failed|network|timed?\s*out|abort/i.test(clean)) return fallback;
  return clean;
}

function updateWeatherPreview(form, baseCalories) {
  const values = formData(form);
  const result = applyEnvironmentalAdjustment(baseCalories, values);
  setWeatherPreviewValue(form, 'heat-index', result.heat_index_f, '°F');
  setWeatherPreviewValue(form, 'wind-chill', result.wind_chill_f, '°F');
  setWeatherPreviewValue(form, 'environmental-load', result.environmental_load || '--');
  setWeatherPreviewValue(form, 'calorie-adjustment', result.calorie_adjustment_percent, '%');
  const final = form.querySelector('[data-final-calories]');
  if (final) final.textContent = `${fmt(result.final_calories)} cal`;
  const warnings = form.querySelector('[data-weather-warnings]');
  if (warnings) warnings.innerHTML = result.safety_warnings.map((warning) => `<div class="alert warn">${esc(warning)}</div>`).join('');
}

function setWeatherPreviewValue(form, key, value, suffix = '') {
  const target = form.querySelector(`[data-weather-${key}]`);
  if (!target) return;
  target.textContent = typeof value === 'number' ? `${fmt(value, 1)}${suffix}` : `${value}${suffix}`;
}

function activityValidationError(body) {
  if (body.environment !== 'outdoor') return null;
  const required = [
    ['location', 'Enter the outdoor activity location or retrieve weather automatically.'],
    ['temperature_f', 'Enter the outdoor temperature or retrieve weather automatically.'],
    ['humidity_percent', 'Enter the outdoor humidity or retrieve weather automatically.'],
    ['wind_mph', 'Enter the outdoor wind speed or retrieve weather automatically.']
  ];
  const missing = required.find(([field]) => body[field] === undefined || String(body[field]).trim() === '');
  return missing ? { field: missing[0], message: missing[1] } : null;
}

function showActivityError(form, message) {
  const target = form.querySelector('[data-activity-error]');
  if (!target) return;
  target.textContent = message;
  target.classList.remove('weather-hidden');
}

function workoutSessionBody(body) {
  const cleanBody = { ...body };
  for (const key of Object.keys(cleanBody)) {
    if (key.startsWith('ex_')) delete cleanBody[key];
  }
  return cleanBody;
}

function draftExerciseFromForm(body) {
  const exercise = {
    muscle_group: body.ex_muscle_group,
    exercise: body.ex_exercise,
    sets: body.ex_sets,
    reps: body.ex_reps,
    weight: body.ex_weight,
    seconds: body.ex_seconds,
    date: body.date
  };
  exercise.mode = exerciseMode(exercise.muscle_group, exercise.exercise);
  exercise.pounds = exercisePounds(exercise);
  return exercise;
}

function templateExercise(exercise) {
  return {
    muscle_group: exercise.muscle_group,
    exercise: exercise.exercise,
    sets: exercise.sets,
    reps: exercise.reps,
    weight: exercise.weight,
    seconds: exercise.seconds,
    mode: exercise.mode
  };
}

function parseTemplateExercises(template) {
  try {
    const rows = JSON.parse(template.exercises || '[]');
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function updateWorkoutEstimate(form) {
  const estimate = workoutCalorieEstimate(workoutSessionBody(formData(form)), draftWorkoutExercises);
  const target = document.getElementById('workoutEstimate');
  if (target) target.textContent = `${fmt(estimate.calories)} cal`;
  updateWeatherPreview(form, estimate.calories);
}

async function save(fn, errorTarget = null) {
  document.getElementById('saveStatus').textContent = 'Saving...';
  try {
    await fn();
    document.getElementById('saveStatus').textContent = 'Saved';
    await refresh();
  } catch (error) {
    const message = error.message || 'Save failed';
    document.getElementById('saveStatus').textContent = message;
    if (errorTarget) {
      errorTarget.textContent = message;
      errorTarget.classList.remove('weather-hidden');
    }
  }
}

function notify(message) {
  document.getElementById('saveStatus').textContent = message;
}

function del(tableName, id) {
  return raw(`<button class="mini-button" data-table="${attr(tableName)}" data-delete="${attr(id)}" type="button">Delete</button>`);
}

function table(headers, rows) {
  if (!rows.length) return '<p class="muted">No entries yet.</p>';
  return `<div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cellHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function glucoseSummary() {
  return calculateGlucoseSummary(state.glucose_readings || []);
}

function latestGlucoseAlert() {
  const reading = state.glucose_readings?.[0];
  if (!reading) return '<div class="alert">No glucose readings yet.</div>';
  const cls = glucoseClass(reading.context, reading.value);
  if (cls === 'reading-red') return `<div class="alert bad">Most recent glucose reading is high: ${fmt(reading.value)} mg/dL (${esc(reading.context)}).</div>`;
  if (cls === 'reading-low') return `<div class="alert bad">Most recent glucose reading is low: ${fmt(reading.value)} mg/dL (${esc(reading.context)}).</div>`;
  if (cls === 'reading-amber') return `<div class="alert warn">Most recent glucose reading is elevated: ${fmt(reading.value)} mg/dL (${esc(reading.context)}).</div>`;
  return `<div class="alert good">Most recent glucose reading is in range: ${fmt(reading.value)} mg/dL (${esc(reading.context)}).</div>`;
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
  return calculateFoodTotals((state.food_log || []).filter((r) => r.date === date));
}

function carbFlag(carbs) {
  const diet = state.profile?.diet_type;
  if (['keto', 'carnivore', 'keto-carnivore hybrid'].includes(diet)) {
    if (carbs > 50) return 'Alert: over 50g';
    if (carbs > 30) return 'Warning: over 30g';
  }
  return dietProfiles[diet] || 'No diet selected';
}

function metCalories(met, minutes, date = today()) {
  return calculateMetCalories(met, minutes, profileWeight(date));
}

function stepCalories(steps, date = today()) {
  return calculateStepCalories(steps, profileWeight(date), state.profile?.height_ft, state.profile?.height_in);
}

function exercisesForSession(sessionId) {
  return (state.workout_exercises || []).filter((exercise) => n(exercise.session_id) === n(sessionId));
}

function workoutCalorieEstimate(session, exercises = []) {
  const date = session?.date || today();
  const effectiveExercises = exercises.map((exercise) => ({
    ...exercise,
    pounds: effectiveExercisePounds(exercise, date)
  }));
  return calculateWorkoutCalories(session, effectiveExercises, profileWeight(date), bmr(date));
}

function exerciseMode(group, exercise) {
  return (exerciseGroups[group] || []).find(([name]) => name === exercise)?.[1] || 'bilateral';
}

function exercisePounds(row) {
  return calculateExercisePounds(row, profileWeight(row?.date || workoutSessionDraft.date || today()));
}

function effectiveExercisePounds(exercise, date = '') {
  if (exercise?.mode !== 'bodyweight') return n(exercise?.pounds);
  const session = (state.workout_sessions || []).find((row) => n(row.id) === n(exercise.session_id));
  return calculateExercisePounds(exercise, profileWeight(date || session?.date || today()));
}

function lifetimePounds() {
  const exercises = (state.workout_exercises || []).map((exercise) => ({
    ...exercise,
    pounds: effectiveExercisePounds(exercise)
  }));
  return calculateLifetimePounds(exercises, state.workout_sessions || [], today());
}

function workoutSessionsTable() {
  const exercises = state.workout_exercises || [];
  return table(['Date', 'Environment', 'Duration', 'Effort', 'Pounds', 'Glucose', 'Notes', 'Actions'], (state.workout_sessions || []).map((s) => [
    s.date,
    s.environment ? `${capitalize(s.environment)}${s.environmental_load ? ` / ${s.environmental_load}` : ''}` : 'Legacy',
    `${fmt(s.duration)} min`,
    s.effort,
    fmt(exercises.filter((e) => e.session_id === s.id).reduce((sum, e) => sum + effectiveExercisePounds(e, s.date), 0)),
    `${fmt(s.pre_glucose)} / ${fmt(s.post_glucose)}`,
    s.notes || '',
    raw(`<div class="actions"><button class="mini-button" data-select-session="${attr(s.id)}" type="button">Select</button><button class="mini-button" data-edit-session="${attr(s.id)}" type="button">Edit</button>${del('workout_sessions', s.id).html}</div>`)
  ]));
}

function exerciseTotalsTable() {
  const totals = {};
  for (const row of state.workout_exercises || []) totals[row.exercise] = (totals[row.exercise] || 0) + effectiveExercisePounds(row);
  return table(['Exercise', 'Lifetime pounds'], Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([name, pounds]) => [name, fmt(pounds)]));
}

function activityHistoryTable(rows) {
  return table(['Date', 'Type', 'Activity', 'MET', 'Minutes', 'Calories', 'Actions'], rows.map((row) => [
    row.date,
    row.kind === 'workout' ? 'Workout' : 'Activity',
    row.name,
    fmt(row.met, 1),
    fmt(row.duration),
    fmt(row.calories),
    activityActions(row)
  ]));
}

function stepHistoryTable() {
  return table(['Date', 'Steps', 'Estimated calories', 'Actions'], sortActivityHistoryRows(state.step_log || []).map((row) => [
    row.date,
    fmt(row.steps),
    fmt(stepCalories(row.steps, row.date)),
    raw(`<div class="actions"><button class="mini-button" data-edit-steps="${attr(row.id)}" type="button">Edit</button>${del('step_log', row.id).html}</div>`)
  ]));
}

function activityHistorySortControl() {
  return `
    <div class="subpanel">
      <label>Date order
        <select id="activityHistoryOrder">
          <option value="newest" ${activityHistoryOrder === 'newest' ? 'selected' : ''}>Newest first</option>
          <option value="oldest" ${activityHistoryOrder === 'oldest' ? 'selected' : ''}>Oldest first</option>
        </select>
      </label>
    </div>
  `;
}

function sortActivityHistoryRows(rows) {
  return [...rows].sort((a, b) => {
    const dateCompare = String(a.date || '').localeCompare(String(b.date || ''));
    const idCompare = String(a.id || '').localeCompare(String(b.id || ''), undefined, { numeric: true });
    const result = dateCompare || idCompare;
    return activityHistoryOrder === 'oldest' ? result : -result;
  });
}

function activityDisplayRows() {
  const realRows = state.activities || [];
  const syntheticWorkoutRows = (state.workout_sessions || [])
    .filter((session) => !workoutActivityForSession(session.id))
    .map((session) => {
      const estimate = workoutCalorieEstimate(session, exercisesForSession(session.id));
      return {
        id: `session-${session.id}`,
        date: session.date,
        kind: 'workout',
        name: `Resistance training (${session.effort || 'moderate'})`,
        met: workoutMet(session.effort),
        duration: session.duration || estimate.duration,
        calories: session.final_calories === null || session.final_calories === undefined ? estimate.calories : session.final_calories,
        notes: session.notes,
        source_session_id: session.id,
        synthetic: true
      };
    });
  return sortActivityHistoryRows([...realRows, ...syntheticWorkoutRows]);
}

function activityActions(row) {
  const select = `<button class="mini-button" data-select-activity="${attr(row.id)}" type="button">Select</button>`;
  if (row.synthetic) {
    return raw(`<div class="actions">${select}</div>`);
  }
  return raw(`<div class="actions">${select}<button class="mini-button" data-edit-activity="${attr(row.id)}" type="button">Edit</button>${del('activities', row.id).html}</div>`);
}

function activityDetailScreen(row) {
  const isWorkout = row.kind === 'workout';
  const session = isWorkout ? workoutSessionForActivity(row) : null;
  const linked = row.source_session_id ? `Linked workout session #${row.source_session_id}` : 'Manual activity entry';
  const title = isWorkout ? row.name : row.name || 'Activity';
  const editPanel = editingActivityId && !isWorkout
    ? panel('Edit activity', activityForm((state.activities || []).find((activity) => activity.id === editingActivityId)))
    : '';
  const workoutEditPanel = editingWorkoutSessionId && session
    ? panel('Edit workout session', workoutSessionForm(session))
    : '';
  const workoutExercises = session ? panel('Workout exercises', workoutExercisesTable(session.id, (state.workout_exercises || []).find((exercise) => exercise.id === editingExerciseId))) : '';
  return `
    <div class="grid">
      <button class="back-button" data-back-activity type="button">&larr; Activity & Burn</button>
      <div>
        <p class="muted">${esc(row.date || '')}</p>
        <h2>${esc(title)}</h2>
      </div>
      ${metrics([
        ['Calories', fmt(row.calories), row.calorie_adjustment_percent ? `Includes +${fmt(row.calorie_adjustment_percent)}% environmental adjustment` : row.kind === 'workout' ? 'Estimated workout burn' : 'MET activity burn'],
        ['Duration', `${fmt(row.duration)} min`, `MET ${fmt(row.met, 1)}`],
        ['Date', row.date || '--', row.name || '--'],
        ['Source', row.kind === 'workout' ? 'Workout' : 'Activity', linked]
      ])}
      ${environmentDetails(session || row)}
      ${panel('Notes', `<div class="alert">${esc(row.notes || 'No notes saved.')}</div>`)}
      <div class="actions">
        <button class="primary-button" data-edit-detail="${attr(row.id)}" type="button">EDIT</button>
        <button class="danger-button" data-delete-detail="${attr(row.id)}" type="button">DELETE</button>
      </div>
      ${editPanel}
      ${workoutEditPanel}
      ${workoutExercises}
    </div>
  `;
}

function environmentDetails(row) {
  if (!row?.environment) {
    return panel('Environment', '<div class="alert">Legacy entry — original calories are preserved with no environmental adjustment.</div>');
  }
  if (row.environment !== 'outdoor') {
    return panel('Environment', '<div class="alert">Indoor exercise — no environmental calorie adjustment.</div>');
  }
  const warnings = parseSafetyWarnings(row.safety_warnings);
  return panel('Weather', `
    ${metrics([
      ['Temperature', `${fmt(row.temperature_f, 1)}°F`, row.location || 'Saved workout location'],
      ['Humidity', `${fmt(row.humidity_percent, 1)}%`, `Wind ${fmt(row.wind_mph, 1)} mph`],
      ['Heat Index', row.heat_index_f == null ? '--' : `${fmt(row.heat_index_f, 1)}°F`, 'Used when applicable'],
      ['Wind Chill', row.wind_chill_f == null ? '--' : `${fmt(row.wind_chill_f, 1)}°F`, 'Used when applicable'],
      ['Environmental Load', row.environmental_load || '--', `Effective temperature ${fmt(row.effective_temperature_f, 1)}°F`],
      ['Calorie Adjustment', `+${fmt(row.calorie_adjustment_percent, 1)}%`, `${fmt(row.base_calories)} base → ${fmt(row.final_calories)} final`],
      ['Weather Source', row.weather_source || 'Manual', n(row.weather_is_automatic) ? 'Automatically retrieved' : 'Manually entered'],
      ['Workout Time', row.workout_time || '--', row.weather_retrieved_at ? `Retrieved ${new Date(row.weather_retrieved_at).toLocaleString()}` : 'Saved conditions']
    ])}
    ${warnings.map((warning) => `<div class="alert warn">${esc(warning)}</div>`).join('')}
  `);
}

function parseSafetyWarnings(value) {
  try {
    const warnings = JSON.parse(value || '[]');
    return Array.isArray(warnings) ? warnings : [];
  } catch {
    return [];
  }
}

function capitalize(value) {
  const text = String(value || '');
  return text ? `${text[0].toUpperCase()}${text.slice(1)}` : '';
}

function workoutSessionForActivity(row) {
  if (!row?.source_session_id) return null;
  return (state.workout_sessions || []).find((session) => n(session.id) === n(row.source_session_id));
}

function workoutExercisesTable(sessionId, editingExercise = null) {
  const rows = (state.workout_exercises || []).filter((exercise) => exercise.session_id === sessionId);
  const editForm = editingExercise ? `<div class="subpanel">${exerciseForm(sessionId, editingExercise)}</div>` : '';
  return `${editForm}${table(['Muscle group', 'Exercise', 'Sets', 'Reps', 'Weight', 'Time', 'Pounds', 'Actions'], rows.map((exercise) => [
    exercise.muscle_group,
    exercise.exercise,
    fmt(exercise.sets),
    fmt(exercise.reps),
    exercise.mode === 'bodyweight' ? `${fmt(bodyweightBasisForExercise(exercise))} lb bodyweight` : fmt(exercise.weight),
    exercise.mode === 'timed' ? timedExerciseSummary(exercise) : '',
    fmt(effectiveExercisePounds(exercise)),
    raw(`<div class="actions"><button class="mini-button" data-edit-exercise="${attr(exercise.id)}" type="button">Edit</button>${del('workout_exercises', exercise.id).html}</div>`)
  ]))}`;
}

function bodyweightBasisForExercise(exercise) {
  const reps = n(exercise.sets) * n(exercise.reps);
  const session = (state.workout_sessions || []).find((row) => n(row.id) === n(exercise.session_id));
  return reps ? effectiveExercisePounds(exercise, session?.date) / reps : profileWeight(session?.date || today());
}

function linkedWorkoutActivity(sessionId) {
  return (state.activities || []).find((activity) => n(activity.source_session_id) === n(sessionId));
}

function workoutActivityForSession(sessionId) {
  return linkedWorkoutActivity(sessionId) || findLegacyWorkoutActivity(sessionId);
}

function findLegacyWorkoutActivity(sessionId) {
  const session = (state.workout_sessions || []).find((row) => row.id === sessionId);
  if (!session) return null;
  return (state.activities || []).find((activity) =>
    activity.kind === 'workout' &&
    !activity.source_session_id &&
    activity.date === session.date &&
    n(activity.duration) === n(session.duration) &&
    String(activity.name || '').includes(session.effort || '')
  );
}

function weightStats() {
  const rows = [...(state.weight_log || [])].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  if (!rows.length) return { current: null, starting: null, change: null, bodyFatChange: null, lbmChange: null };
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

function labValue(row) {
  return `${fmt(row.value, 2)}${row.unit ? ` ${row.unit}` : ''}`;
}

function labActions(row) {
  return raw(`<div class="actions"><button class="mini-button" data-edit-lab="${attr(row.id)}" type="button">Edit</button>${del('lab_results', row.id).html}</div>`);
}

function labCatalogSearch(query = '', category = '') {
  const builtIn = searchBuiltInTests(query, { category, limit: 10 });
  const normalizedQuery = normalizeLabSearch(query);
  const custom = (state.lab_test_catalog_custom || [])
    .map(customLabTest)
    .filter((test) => !category || test.category === category)
    .filter((test) => !normalizedQuery || labSearchText(test).includes(normalizedQuery))
    .slice(0, 10);
  return [...custom, ...builtIn].slice(0, 12);
}

function labSearchResults(results) {
  const rows = [
    ...results.map((test) => `
      <button class="picker-option" data-select-lab="${attr(test.id)}" data-lab-source="${attr(test.source)}" type="button">
        <strong>${esc(test.displayName)}</strong>
        <span>${esc([test.abbreviation, test.category, test.defaultUnit].filter(Boolean).join(' | '))}</span>
      </button>
    `),
    '<button class="picker-option" data-custom-lab type="button"><strong>Custom Test</strong><span>Enter a lab manually</span></button>'
  ];
  return rows.join('');
}

function labSelectedDetails(test = null, form = null) {
  const selected = test || selectedLabTestFromForm(form);
  if (!selected) {
    return 'Custom test mode. Enter the test name, category, unit, and reference range manually.';
  }
  const range = form?.elements.reference_range.value || selected.referenceRange || 'No default range';
  const unit = form?.elements.unit.value || selected.defaultUnit || 'No default unit';
  return `
    <strong>${esc(selected.displayName)}</strong>
    <div class="muted">${esc(selected.category || 'Uncategorized')} | ${esc(unit)} | ${esc(range)}</div>
    <small>${esc(selected.notes || 'Catalog defaults are editable before saving.')}</small>
  `;
}

function selectedLabTestFromForm(form) {
  if (!form?.elements.catalog_source.value) return null;
  return labCatalogTest(form.elements.catalog_source.value, form.elements.catalog_id.value);
}

function labCatalogTest(source, id) {
  if (source === 'built-in') return findBuiltInTest(id);
  if (source === 'custom') return (state.lab_test_catalog_custom || []).map(customLabTest).find((test) => String(test.id) === String(id)) || null;
  return null;
}

function customLabTest(row) {
  return {
    id: row.id,
    source: 'custom',
    displayName: row.display_name,
    abbreviation: row.abbreviation,
    aliases: String(row.aliases || '').split(',').map((alias) => alias.trim()).filter(Boolean),
    category: row.category || 'Other',
    defaultUnit: row.default_unit || '',
    referenceRange: row.reference_range || '',
    notes: row.notes || ''
  };
}

function customLabPayloadFromLab(row) {
  return {
    display_name: row.test_name,
    abbreviation: '',
    aliases: '',
    category: row.test_category || 'Other',
    default_unit: row.unit || '',
    reference_range: row.reference_range || '',
    notes: row.notes || ''
  };
}

function labSearchText(test) {
  return normalizeLabSearch([
    test.displayName,
    test.abbreviation,
    test.category,
    ...(test.aliases || [])
  ].join(' '));
}

function a1cTrend(rows) {
  if (rows.length < 2) return 'Need 2+ values';
  const diff = n(rows[rows.length - 1].value) - n(rows[0].value);
  return diff > 0 ? `Up ${fmt(diff, 1)}%` : `Down ${fmt(Math.abs(diff), 1)}%`;
}

function drawWeightChart(id) {
  const ctx = document.getElementById(id);
  if (!ctx) return;
  const trends = ledgerTrendSeries(state.daily_ledger || [], 30, bmr());
  charts.push(new Chart(ctx, {
    type: 'line',
    data: {
      labels: trends.labels,
      datasets: [
        { label: 'Weight', data: trends.weight, borderColor: '#48c78e', backgroundColor: 'rgba(72,199,142,.08)', fill: true, tension: .3, spanGaps: true, pointRadius: 1.5 },
        { label: '7-day average', data: trends.weightAverage, borderColor: '#f0ad4e', borderDash: [6, 4], tension: .3, spanGaps: true, pointRadius: 0 }
      ]
    },
    options: chartOptions()
  }));
}

function drawGlucoseChart(id) {
  const ctx = document.getElementById(id);
  if (!ctx) return;
  const trends = ledgerTrendSeries(state.daily_ledger || [], 30, bmr());
  charts.push(new Chart(ctx, {
    type: 'line',
    data: {
      labels: trends.labels,
      datasets: [
        { label: 'Daily avg glucose', data: trends.glucose, borderColor: '#9b7cf7', backgroundColor: 'rgba(155,124,247,.08)', fill: true, tension: .3, spanGaps: true, yAxisID: 'y', pointRadius: 1.5 },
        { label: 'Estimated A1C', data: trends.a1c, borderColor: '#f0ad4e', tension: .3, spanGaps: true, yAxisID: 'a1c', pointRadius: 0 }
      ]
    },
    options: chartOptions({
      scales: {
        a1c: {
          position: 'right',
          ticks: { color: getComputedStyle(document.body).getPropertyValue('--muted') },
          grid: { drawOnChartArea: false }
        }
      }
    })
  }));
}

function drawBalanceChart(id) {
  const ctx = document.getElementById(id);
  if (!ctx) return;
  const trends = ledgerTrendSeries(state.daily_ledger || [], 30, bmr());
  charts.push(new Chart(ctx, {
    type: 'bar',
    data: {
      labels: trends.labels,
      datasets: [{
        label: 'Deficit / surplus',
        data: trends.balance,
        backgroundColor: trends.balance.map((value) => value > 0 ? 'rgba(240,173,78,.72)' : 'rgba(72,199,142,.72)'),
        borderRadius: 4
      }]
    },
    options: chartOptions()
  }));
}

function drawA1cChart(id, rows) {
  const ctx = document.getElementById(id);
  if (!ctx) return;
  charts.push(new Chart(ctx, {
    type: 'line',
    data: { labels: rows.map((r) => r.date), datasets: [{ label: 'A1c', data: rows.map((r) => n(r.value)), borderColor: '#f0ad4e', tension: .3, pointRadius: 2 }] },
    options: chartOptions()
  }));
}

function chartOptions(overrides = {}) {
  const baseScales = {
    x: { ticks: { color: getComputedStyle(document.body).getPropertyValue('--muted') }, grid: { color: 'rgba(128,128,128,.16)' } },
    y: { ticks: { color: getComputedStyle(document.body).getPropertyValue('--muted') }, grid: { color: 'rgba(128,128,128,.16)' } }
  };
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        labels: {
          color: getComputedStyle(document.body).getPropertyValue('--text'),
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: getComputedStyle(document.body).getPropertyValue('--panel-3'),
        titleColor: getComputedStyle(document.body).getPropertyValue('--text'),
        bodyColor: getComputedStyle(document.body).getPropertyValue('--text'),
        borderColor: getComputedStyle(document.body).getPropertyValue('--line-strong'),
        borderWidth: 1
      }
    },
    scales: { ...baseScales, ...(overrides.scales || {}) }
  };
}
