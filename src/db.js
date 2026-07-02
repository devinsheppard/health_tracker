const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

let db;
let dbPath;
let dataDir;
const SCHEMA_VERSION = 3;

const allowedTables = new Set([
  'glucose_readings',
  'food_log',
  'workout_sessions',
  'workout_exercises',
  'workout_templates',
  'activities',
  'weight_log',
  'sleep_log',
  'medications',
  'lab_results'
]);

const tableColumns = {
  glucose_readings: ['date', 'time', 'context', 'value', 'notes'],
  food_log: ['date', 'meal_type', 'description', 'net_carbs', 'protein', 'fat', 'calories'],
  workout_sessions: ['date', 'pre_glucose', 'post_glucose', 'duration', 'effort', 'notes'],
  workout_exercises: ['session_id', 'muscle_group', 'exercise', 'sets', 'reps', 'weight', 'seconds', 'mode', 'pounds'],
  workout_templates: ['name', 'duration', 'effort', 'notes', 'exercises'],
  activities: ['date', 'name', 'met', 'duration', 'calories', 'notes', 'kind', 'source_session_id'],
  weight_log: ['date', 'weight', 'body_fat', 'lean_body_mass', 'notes'],
  sleep_log: ['date', 'hours', 'quality', 'morning_glucose', 'notes'],
  medications: ['name', 'dose', 'frequency', 'timing', 'purpose_notes'],
  lab_results: ['date', 'test_name', 'value', 'reference_range', 'notes']
};

const sourceTablesWithDates = [
  'glucose_readings',
  'food_log',
  'workout_sessions',
  'activities',
  'weight_log',
  'sleep_log',
  'lab_results'
];

const validators = {
  glucose_readings: (row, partial = false) => {
    dateField(row, 'date', partial);
    enumField(row, 'context', ['fasting morning', 'before meal', '1hr post-meal', '2hr post-meal', 'bedtime', 'post-workout', 'random'], partial);
    numberField(row, 'value', { min: 20, max: 600, required: !partial });
    timeField(row, 'time', true);
  },
  food_log: (row, partial = false) => {
    dateField(row, 'date', partial);
    enumField(row, 'meal_type', ['breakfast', 'lunch', 'dinner', 'snack'], partial);
    numberField(row, 'net_carbs', { min: 0, max: 1000 });
    numberField(row, 'protein', { min: 0, max: 1000 });
    numberField(row, 'fat', { min: 0, max: 1000 });
    numberField(row, 'calories', { min: 0, max: 10000 });
  },
  workout_sessions: (row, partial = false) => {
    dateField(row, 'date', partial);
    numberField(row, 'pre_glucose', { min: 20, max: 600 });
    numberField(row, 'post_glucose', { min: 20, max: 600 });
    numberField(row, 'duration', { min: 0, max: 1440 });
    enumField(row, 'effort', ['light', 'moderate', 'vigorous'], partial);
  },
  workout_exercises: (row, partial = false) => {
    integerField(row, 'session_id', { min: 1, required: !partial });
    numberField(row, 'sets', { min: 0, max: 100 });
    numberField(row, 'reps', { min: 0, max: 1000 });
    numberField(row, 'weight', { min: 0, max: 2000 });
    numberField(row, 'seconds', { min: 0, max: 86400 });
    numberField(row, 'pounds', { min: 0, max: 1000000 });
    enumField(row, 'mode', ['bilateral', 'single', 'bodyweight', 'timed'], partial);
  },
  workout_templates: (row, partial = false) => {
    textField(row, 'name', { required: !partial, max: 120 });
    numberField(row, 'duration', { min: 0, max: 1440 });
    enumField(row, 'effort', ['light', 'moderate', 'vigorous'], partial);
    textField(row, 'notes', { max: 2000 });
    validateTemplateExercises(row, partial);
  },
  activities: (row, partial = false) => {
    dateField(row, 'date', partial);
    numberField(row, 'met', { min: 0, max: 25 });
    numberField(row, 'duration', { min: 0, max: 1440 });
    numberField(row, 'calories', { min: 0, max: 10000 });
    enumField(row, 'kind', ['activity', 'workout'], partial);
    integerField(row, 'source_session_id', { min: 1 });
  },
  weight_log: (row, partial = false) => {
    dateField(row, 'date', partial);
    numberField(row, 'weight', { min: 20, max: 1500, required: !partial });
    numberField(row, 'body_fat', { min: 0, max: 100 });
    numberField(row, 'lean_body_mass', { min: 0, max: 1500 });
  },
  sleep_log: (row, partial = false) => {
    dateField(row, 'date', partial);
    numberField(row, 'hours', { min: 0, max: 24, required: !partial });
    enumField(row, 'quality', ['great', 'good', 'fair', 'poor'], partial);
    numberField(row, 'morning_glucose', { min: 20, max: 600 });
  },
  medications: (row, partial = false) => {
    textField(row, 'name', { required: !partial, max: 200 });
    textField(row, 'dose', { max: 200 });
    textField(row, 'frequency', { max: 200 });
    textField(row, 'timing', { max: 200 });
  },
  lab_results: (row, partial = false) => {
    dateField(row, 'date', partial);
    textField(row, 'test_name', { required: !partial, max: 200 });
    numberField(row, 'value', { min: -100000, max: 100000, required: !partial });
  }
};

const profileEnums = {
  sex: ['male', 'female'],
  goals: ['weight loss', 'body recomposition', 'muscle gain', 'maintenance', 'manage T2D/blood sugar'],
  diet_type: ['keto', 'carnivore', 'keto-carnivore hybrid', 'low carb', 'paleo', 'Mediterranean', 'standard American', 'IIFYM/flexible dieting', 'intermittent fasting'],
  theme: ['dark', 'light']
};

function init(userDataPath) {
  fs.mkdirSync(userDataPath, { recursive: true });
  dataDir = userDataPath;
  dbPath = path.join(userDataPath, 'my-health-tracker.sqlite');
  db = openDatabase(dbPath);
  migrate();
}

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const currentVersion = Number(db.pragma('user_version', { simple: true })) || 0;
  const pending = migrations.filter((migration) => migration.version > currentVersion);
  if (!pending.length) return;

  const tx = db.transaction(() => {
    let appliedVersion = currentVersion;
    for (const migration of pending) {
      migration.up();
      db.prepare(`
        INSERT OR REPLACE INTO schema_migrations (version, name, applied_at)
        VALUES (?, ?, ?)
      `).run(migration.version, migration.name, new Date().toISOString());
      appliedVersion = migration.version;
    }
    db.pragma(`user_version = ${appliedVersion}`);
  });
  tx();
}

const migrations = [
  {
    version: 1,
    name: 'baseline_health_tracker_schema',
    up: createBaselineSchema
  },
  {
    version: 2,
    name: 'daily_ledger_summary',
    up: createDailyLedgerSchema
  },
  {
    version: 3,
    name: 'workout_templates',
    up: createWorkoutTemplateSchema
  }
];

function createBaselineSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT,
      date_of_birth TEXT,
      sex TEXT,
      height_ft REAL,
      height_in REAL,
      current_weight REAL,
      body_fat REAL,
      lean_body_mass REAL,
      goals TEXT,
      diet_type TEXT,
      medical_conditions TEXT,
      protein_target REAL DEFAULT 160,
      a1c_goal REAL DEFAULT 5.7,
      theme TEXT DEFAULT 'dark',
      eating_window TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS glucose_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      time TEXT,
      context TEXT,
      value REAL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS food_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      meal_type TEXT,
      description TEXT,
      net_carbs REAL,
      protein REAL,
      fat REAL,
      calories REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workout_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      pre_glucose REAL,
      post_glucose REAL,
      duration REAL,
      effort TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workout_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      muscle_group TEXT,
      exercise TEXT,
      sets REAL,
      reps REAL,
      weight REAL,
      seconds REAL,
      mode TEXT,
      pounds REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      name TEXT,
      met REAL,
      duration REAL,
      calories REAL,
      notes TEXT,
      kind TEXT DEFAULT 'activity',
      source_session_id REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS weight_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      weight REAL,
      body_fat REAL,
      lean_body_mass REAL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sleep_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      hours REAL,
      quality TEXT,
      morning_glucose REAL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS medications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      dose TEXT,
      frequency TEXT,
      timing TEXT,
      purpose_notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lab_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      test_name TEXT,
      value REAL,
      reference_range TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  ensureColumn('activities', 'source_session_id', 'REAL');

  db.prepare(`
    INSERT OR IGNORE INTO profile (id, goals, diet_type, protein_target, a1c_goal, theme, updated_at)
    VALUES (1, 'weight loss', 'keto', 160, 5.7, 'dark', ?)
  `).run(new Date().toISOString());
}

function createDailyLedgerSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_ledger (
      date TEXT PRIMARY KEY,
      weight REAL,
      body_fat REAL,
      lean_body_mass REAL,
      glucose_count INTEGER DEFAULT 0,
      glucose_avg REAL DEFAULT 0,
      fasting_glucose_count INTEGER DEFAULT 0,
      fasting_glucose_avg REAL DEFAULT 0,
      food_calories REAL DEFAULT 0,
      net_carbs REAL DEFAULT 0,
      protein REAL DEFAULT 0,
      fat REAL DEFAULT 0,
      activity_calories REAL DEFAULT 0,
      activity_minutes REAL DEFAULT 0,
      workout_calories REAL DEFAULT 0,
      workout_minutes REAL DEFAULT 0,
      workout_sessions INTEGER DEFAULT 0,
      workout_volume REAL DEFAULT 0,
      lifetime_lifting_total REAL DEFAULT 0,
      sleep_hours REAL,
      sleep_quality TEXT,
      morning_glucose REAL,
      lab_count INTEGER DEFAULT 0,
      notes TEXT,
      updated_at TEXT NOT NULL
    );
  `);
  rebuildDailyLedger();
}

function createWorkoutTemplateSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workout_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      duration REAL,
      effort TEXT,
      notes TEXT,
      exercises TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function getSchemaVersion() {
  return Number(db.pragma('user_version', { simple: true })) || 0;
}

function one(sql, params = []) {
  return db.prepare(sql).get(params);
}

function all(sql, params = []) {
  return db.prepare(sql).all(params);
}

function getAllData() {
  return {
    profile: one('SELECT * FROM profile WHERE id = 1'),
    daily_ledger: all('SELECT * FROM daily_ledger ORDER BY date DESC'),
    glucose_readings: all('SELECT * FROM glucose_readings ORDER BY date DESC, time DESC, id DESC'),
    food_log: all('SELECT * FROM food_log ORDER BY date DESC, id DESC'),
    workout_sessions: all('SELECT * FROM workout_sessions ORDER BY date DESC, id DESC'),
    workout_exercises: all('SELECT * FROM workout_exercises ORDER BY id DESC'),
    workout_templates: all('SELECT * FROM workout_templates ORDER BY name COLLATE NOCASE, id DESC'),
    activities: all('SELECT * FROM activities ORDER BY date DESC, id DESC'),
    weight_log: all('SELECT * FROM weight_log ORDER BY date DESC, id DESC'),
    sleep_log: all('SELECT * FROM sleep_log ORDER BY date DESC, id DESC'),
    medications: all('SELECT * FROM medications ORDER BY name COLLATE NOCASE'),
    lab_results: all('SELECT * FROM lab_results ORDER BY date DESC, test_name COLLATE NOCASE')
  };
}

function saveProfile(profile) {
  validateProfile(profile);
  const fields = [
    'name', 'date_of_birth', 'sex', 'height_ft', 'height_in', 'current_weight',
    'body_fat', 'lean_body_mass', 'goals', 'diet_type', 'medical_conditions',
    'protein_target', 'a1c_goal', 'theme', 'eating_window'
  ];
  const values = fields.map((field) => clean(profile[field]));
  db.prepare(`
    UPDATE profile SET
      name = ?, date_of_birth = ?, sex = ?, height_ft = ?, height_in = ?,
      current_weight = ?, body_fat = ?, lean_body_mass = ?, goals = ?,
      diet_type = ?, medical_conditions = ?, protein_target = ?,
      a1c_goal = ?, theme = ?, eating_window = ?, updated_at = ?
    WHERE id = 1
  `).run(...values, new Date().toISOString());
  return getAllData();
}

function saveSettings(settings) {
  const current = one('SELECT * FROM profile WHERE id = 1');
  return saveProfile({ ...current, ...settings });
}

function addRow(table, row) {
  ensureTable(table);
  validateRow(table, row);
  const columns = tableColumns[table];
  const placeholders = columns.map(() => '?').join(', ');
  const stmt = db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`);
  const info = stmt.run(...columns.map((column) => clean(row[column])));
  rebuildDailyLedger();
  return { id: info.lastInsertRowid, data: getAllData() };
}

function updateRow(table, id, row) {
  ensureTable(table);
  validateRow(table, row, true);
  const columns = tableColumns[table].filter((column) => Object.prototype.hasOwnProperty.call(row, column));
  if (!columns.length) return getAllData();
  const assignments = columns.map((column) => `${column} = ?`).join(', ');
  db.prepare(`UPDATE ${table} SET ${assignments} WHERE id = ?`).run(...columns.map((column) => clean(row[column])), id);
  rebuildDailyLedger();
  return getAllData();
}

function deleteRow(table, id) {
  ensureTable(table);
  if (table === 'workout_sessions') {
    db.prepare('DELETE FROM activities WHERE source_session_id = ?').run(id);
  }
  db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
  rebuildDailyLedger();
  return getAllData();
}

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name);
  if (!columns.includes(column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}

function clearAll() {
  const tx = db.transaction(() => {
    for (const table of [...allowedTables]) {
      db.prepare(`DELETE FROM ${table}`).run();
    }
    db.prepare('DELETE FROM daily_ledger').run();
    db.prepare(`
      UPDATE profile SET
        name = NULL, date_of_birth = NULL, sex = NULL, height_ft = NULL, height_in = NULL,
        current_weight = NULL, body_fat = NULL, lean_body_mass = NULL,
        medical_conditions = NULL, goals = 'weight loss', diet_type = 'keto',
        protein_target = 160, a1c_goal = 5.7, theme = 'dark', eating_window = NULL,
        updated_at = ?
      WHERE id = 1
    `).run(new Date().toISOString());
  });
  tx();
  rebuildDailyLedger();
  return getAllData();
}

function exportFullJson() {
  return {
    format: 'my-health-tracker-full-json',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      profile: one('SELECT * FROM profile WHERE id = 1'),
      tables: Object.fromEntries([...allowedTables].map((table) => [table, all(`SELECT * FROM ${table} ORDER BY id`)])),
      daily_ledger: all('SELECT * FROM daily_ledger ORDER BY date')
    }
  };
}

function importFullJson(payload) {
  validateImportPayload(payload);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safetyPath = path.join(dataDir, `my-health-tracker-before-json-import-${stamp}.sqlite`);
  db.pragma('wal_checkpoint(TRUNCATE)');
  fs.copyFileSync(dbPath, safetyPath);

  const tx = db.transaction(() => {
    for (const table of [...allowedTables].reverse()) {
      db.prepare(`DELETE FROM ${table}`).run();
    }
    db.prepare('DELETE FROM daily_ledger').run();
    db.prepare(`DELETE FROM sqlite_sequence WHERE name IN (${[...allowedTables].map(() => '?').join(',')})`).run(...allowedTables);
    importProfile(payload.data.profile || {});
    for (const table of allowedTables) {
      for (const row of payload.data.tables[table] || []) importRow(table, row);
    }
    rebuildDailyLedger();
  });
  tx();
  return { safetyBackupPath: safetyPath, data: getAllData() };
}

function rebuildDailyLedger() {
  const dates = ledgerDates();
  const insert = db.prepare(`
    INSERT INTO daily_ledger (
      date, weight, body_fat, lean_body_mass, glucose_count, glucose_avg,
      fasting_glucose_count, fasting_glucose_avg, food_calories, net_carbs,
      protein, fat, activity_calories, activity_minutes, workout_calories,
      workout_minutes, workout_sessions, workout_volume, lifetime_lifting_total,
      sleep_hours, sleep_quality, morning_glucose, lab_count, notes, updated_at
    ) VALUES (
      @date, @weight, @body_fat, @lean_body_mass, @glucose_count, @glucose_avg,
      @fasting_glucose_count, @fasting_glucose_avg, @food_calories, @net_carbs,
      @protein, @fat, @activity_calories, @activity_minutes, @workout_calories,
      @workout_minutes, @workout_sessions, @workout_volume, @lifetime_lifting_total,
      @sleep_hours, @sleep_quality, @morning_glucose, @lab_count, @notes, @updated_at
    )
  `);
  const run = () => {
    db.prepare('DELETE FROM daily_ledger').run();
    for (const date of dates) insert.run(dailyLedgerRow(date));
  };
  if (db.inTransaction) run();
  else db.transaction(run)();
}

function ledgerDates() {
  const dates = new Set();
  for (const table of sourceTablesWithDates) {
    for (const row of all(`SELECT DISTINCT date FROM ${table} WHERE date IS NOT NULL AND date != ''`)) {
      dates.add(row.date);
    }
  }
  return [...dates].sort();
}

function dailyLedgerRow(date) {
  const weight = one(`
    SELECT weight, body_fat, lean_body_mass
    FROM weight_log
    WHERE date = ?
    ORDER BY id DESC
    LIMIT 1
  `, [date]) || {};
  const glucose = one(`
    SELECT COUNT(value) AS count, AVG(value) AS avg
    FROM glucose_readings
    WHERE date = ? AND value IS NOT NULL
  `, [date]) || {};
  const fasting = one(`
    SELECT COUNT(value) AS count, AVG(value) AS avg
    FROM glucose_readings
    WHERE date = ? AND value IS NOT NULL AND context = 'fasting morning'
  `, [date]) || {};
  const food = one(`
    SELECT SUM(calories) AS calories, SUM(net_carbs) AS net_carbs, SUM(protein) AS protein, SUM(fat) AS fat
    FROM food_log
    WHERE date = ?
  `, [date]) || {};
  const activity = one(`
    SELECT
      SUM(CASE WHEN kind = 'workout' THEN 0 ELSE calories END) AS activity_calories,
      SUM(CASE WHEN kind = 'workout' THEN 0 ELSE duration END) AS activity_minutes,
      SUM(CASE WHEN kind = 'workout' THEN calories ELSE 0 END) AS workout_calories
    FROM activities
    WHERE date = ?
  `, [date]) || {};
  const workout = one(`
    SELECT COUNT(*) AS sessions, SUM(duration) AS minutes
    FROM workout_sessions
    WHERE date = ?
  `, [date]) || {};
  const volume = one(`
    SELECT SUM(e.pounds) AS pounds
    FROM workout_exercises e
    JOIN workout_sessions s ON s.id = e.session_id
    WHERE s.date = ?
  `, [date]) || {};
  const lifetime = one(`
    SELECT SUM(e.pounds) AS pounds
    FROM workout_exercises e
    JOIN workout_sessions s ON s.id = e.session_id
    WHERE s.date <= ?
  `, [date]) || {};
  const sleep = one(`
    SELECT hours, quality, morning_glucose
    FROM sleep_log
    WHERE date = ?
    ORDER BY id DESC
    LIMIT 1
  `, [date]) || {};
  const labs = one('SELECT COUNT(*) AS count FROM lab_results WHERE date = ?', [date]) || {};

  return {
    date,
    weight: clean(weight.weight),
    body_fat: clean(weight.body_fat),
    lean_body_mass: clean(weight.lean_body_mass),
    glucose_count: n(glucose.count),
    glucose_avg: n(glucose.avg),
    fasting_glucose_count: n(fasting.count),
    fasting_glucose_avg: n(fasting.avg),
    food_calories: n(food.calories),
    net_carbs: n(food.net_carbs),
    protein: n(food.protein),
    fat: n(food.fat),
    activity_calories: n(activity.activity_calories),
    activity_minutes: n(activity.activity_minutes),
    workout_calories: n(activity.workout_calories),
    workout_minutes: n(workout.minutes),
    workout_sessions: n(workout.sessions),
    workout_volume: n(volume.pounds),
    lifetime_lifting_total: n(lifetime.pounds),
    sleep_hours: clean(sleep.hours),
    sleep_quality: clean(sleep.quality),
    morning_glucose: clean(sleep.morning_glucose),
    lab_count: n(labs.count),
    notes: ledgerNotes(date),
    updated_at: new Date().toISOString()
  };
}

function ledgerNotes(date) {
  const notes = [];
  collectNotes(notes, 'Glucose', "SELECT notes FROM glucose_readings WHERE date = ? AND notes IS NOT NULL AND notes != '' ORDER BY time, id", date);
  collectNotes(notes, 'Workout', "SELECT notes FROM workout_sessions WHERE date = ? AND notes IS NOT NULL AND notes != '' ORDER BY id", date);
  collectNotes(notes, 'Activity', "SELECT notes FROM activities WHERE date = ? AND notes IS NOT NULL AND notes != '' ORDER BY id", date);
  collectNotes(notes, 'Weight', "SELECT notes FROM weight_log WHERE date = ? AND notes IS NOT NULL AND notes != '' ORDER BY id", date);
  collectNotes(notes, 'Sleep', "SELECT notes FROM sleep_log WHERE date = ? AND notes IS NOT NULL AND notes != '' ORDER BY id", date);
  collectNotes(notes, 'Lab', "SELECT notes FROM lab_results WHERE date = ? AND notes IS NOT NULL AND notes != '' ORDER BY id", date);
  return notes.join('\n') || null;
}

function collectNotes(target, label, sql, date) {
  for (const row of all(sql, [date])) {
    target.push(`${label}: ${row.notes}`);
  }
}

async function backup(targetPath) {
  assertWritableBackupTarget(targetPath);
  db.pragma('wal_checkpoint(TRUNCATE)');
  await db.backup(targetPath);
  validateDatabaseFile(targetPath);
  return { path: targetPath };
}

function restore(sourcePath) {
  validateDatabaseFile(sourcePath);
  db.pragma('wal_checkpoint(TRUNCATE)');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safetyPath = path.join(dataDir, `my-health-tracker-before-restore-${stamp}.sqlite`);
  const tempPath = path.join(dataDir, `my-health-tracker-restore-${stamp}.tmp`);

  fs.copyFileSync(dbPath, safetyPath);
  fs.copyFileSync(sourcePath, tempPath);
  validateDatabaseFile(tempPath);

  close();
  try {
    removeSqliteSidecars(dbPath);
    fs.renameSync(tempPath, dbPath);
    db = openDatabase(dbPath);
    migrate();
    rebuildDailyLedger();
    return { safetyBackupPath: safetyPath };
  } catch (error) {
    removeSqliteSidecars(dbPath);
    fs.copyFileSync(safetyPath, dbPath);
    db = openDatabase(dbPath);
    migrate();
    throw error;
  } finally {
    if (fs.existsSync(tempPath)) fs.rmSync(tempPath, { force: true });
  }
}

function close() {
  if (db) {
    db.close();
    db = null;
  }
}

function openDatabase(filePath) {
  const database = new Database(filePath);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  return database;
}

function validateDatabaseFile(filePath) {
  if (!fs.existsSync(filePath)) throw new Error('Backup file does not exist.');
  const candidate = new Database(filePath, { readonly: true, fileMustExist: true });
  try {
    const integrity = candidate.pragma('quick_check', { simple: true });
    if (integrity !== 'ok') throw new Error(`Backup integrity check failed: ${integrity}`);
    const tables = candidate.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name);
    if (!tables.includes('profile')) throw new Error('Backup is not a My Health Tracker database.');
  } finally {
    candidate.close();
  }
}

function assertWritableBackupTarget(targetPath) {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedDb = path.resolve(dbPath);
  if (resolvedTarget === resolvedDb) throw new Error('Backup target cannot replace the active database.');
  fs.mkdirSync(path.dirname(resolvedTarget), { recursive: true });
}

function removeSqliteSidecars(filePath) {
  for (const suffix of ['', '-wal', '-shm']) {
    const target = `${filePath}${suffix}`;
    if (fs.existsSync(target)) fs.rmSync(target, { force: true });
  }
}

function ensureTable(table) {
  if (!allowedTables.has(table)) {
    throw new Error(`Unsupported table: ${table}`);
  }
}

function clean(value) {
  return value === undefined || value === '' ? null : value;
}

function n(value) {
  return Number(value) || 0;
}

function validateProfile(profile) {
  dateField(profile, 'date_of_birth', true);
  numberField(profile, 'height_ft', { min: 0, max: 9 });
  numberField(profile, 'height_in', { min: 0, max: 11.99 });
  numberField(profile, 'current_weight', { min: 20, max: 1500 });
  numberField(profile, 'body_fat', { min: 0, max: 100 });
  numberField(profile, 'lean_body_mass', { min: 0, max: 1500 });
  numberField(profile, 'protein_target', { min: 0, max: 1000 });
  numberField(profile, 'a1c_goal', { min: 3, max: 20 });
  for (const [field, options] of Object.entries(profileEnums)) enumField(profile, field, options, true);
}

function validateImportPayload(payload) {
  if (!payload || payload.format !== 'my-health-tracker-full-json') {
    throw new Error('Import file is not a My Health Tracker full JSON export.');
  }
  if (!payload.data || typeof payload.data !== 'object') throw new Error('Import file is missing data.');
  if (!payload.data.tables || typeof payload.data.tables !== 'object') throw new Error('Import file is missing tables.');
  validateProfile(payload.data.profile || {});
  for (const table of allowedTables) {
    const rows = payload.data.tables[table];
    if (rows === undefined && table === 'workout_templates') continue;
    if (!Array.isArray(rows)) throw new Error(`Import file is missing table: ${table}`);
    for (const row of rows) {
      integerField(row, 'id', { min: 1 });
      validateRow(table, row);
    }
  }
}

function importProfile(profile) {
  const fields = [
    'name', 'date_of_birth', 'sex', 'height_ft', 'height_in', 'current_weight',
    'body_fat', 'lean_body_mass', 'goals', 'diet_type', 'medical_conditions',
    'protein_target', 'a1c_goal', 'theme', 'eating_window'
  ];
  db.prepare(`
    UPDATE profile SET
      name = ?, date_of_birth = ?, sex = ?, height_ft = ?, height_in = ?,
      current_weight = ?, body_fat = ?, lean_body_mass = ?, goals = ?,
      diet_type = ?, medical_conditions = ?, protein_target = ?,
      a1c_goal = ?, theme = ?, eating_window = ?, updated_at = ?
    WHERE id = 1
  `).run(...fields.map((field) => clean(profile[field])), new Date().toISOString());
}

function importRow(table, row) {
  const columns = ['id', ...tableColumns[table]];
  const placeholders = columns.map(() => '?').join(', ');
  db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`)
    .run(...columns.map((column) => clean(row[column])));
}

function validateRow(table, row, partial = false) {
  validators[table]?.(row, partial);
}

function dateField(row, field, optional = false) {
  if (!hasValue(row, field)) {
    if (!optional) fail(field, 'is required');
    return;
  }
  const value = String(row[field]);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(field, 'must be a date in YYYY-MM-DD format');
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) fail(field, 'must be a valid calendar date');
}

function timeField(row, field, optional = false) {
  if (!hasValue(row, field)) {
    if (!optional) fail(field, 'is required');
    return;
  }
  const value = String(row[field]);
  if (!/^\d{2}:\d{2}$/.test(value)) fail(field, 'must be a time in HH:MM format');
  const [hour, minute] = value.split(':').map(Number);
  if (hour > 23 || minute > 59) fail(field, 'must be a valid time');
}

function enumField(row, field, options, optional = false) {
  if (!hasValue(row, field)) {
    if (!optional) fail(field, 'is required');
    return;
  }
  if (!options.includes(row[field])) fail(field, `must be one of: ${options.join(', ')}`);
}

function numberField(row, field, options = {}) {
  if (!hasValue(row, field)) {
    if (options.required) fail(field, 'is required');
    return;
  }
  const value = Number(row[field]);
  if (!Number.isFinite(value)) fail(field, 'must be a number');
  if (options.min !== undefined && value < options.min) fail(field, `must be at least ${options.min}`);
  if (options.max !== undefined && value > options.max) fail(field, `must be at most ${options.max}`);
}

function integerField(row, field, options = {}) {
  if (!hasValue(row, field)) {
    if (options.required) fail(field, 'is required');
    return;
  }
  numberField(row, field, options);
  if (!Number.isInteger(Number(row[field]))) fail(field, 'must be a whole number');
}

function textField(row, field, options = {}) {
  if (!hasValue(row, field)) {
    if (options.required) fail(field, 'is required');
    return;
  }
  if (String(row[field]).length > options.max) fail(field, `must be ${options.max} characters or fewer`);
}

function validateTemplateExercises(row, partial = false) {
  if (!hasValue(row, 'exercises')) {
    if (!partial) fail('exercises', 'is required');
    return;
  }
  let exercises;
  try {
    exercises = JSON.parse(row.exercises);
  } catch {
    fail('exercises', 'must be valid JSON');
  }
  if (!Array.isArray(exercises)) fail('exercises', 'must be a JSON array');
  if (exercises.length > 100) fail('exercises', 'must include 100 entries or fewer');
  for (const exercise of exercises) {
    textField(exercise, 'muscle_group', { required: true, max: 120 });
    textField(exercise, 'exercise', { required: true, max: 200 });
    numberField(exercise, 'sets', { min: 0, max: 100 });
    numberField(exercise, 'reps', { min: 0, max: 1000 });
    numberField(exercise, 'weight', { min: 0, max: 2000 });
    numberField(exercise, 'seconds', { min: 0, max: 86400 });
    enumField(exercise, 'mode', ['bilateral', 'single', 'bodyweight', 'timed'], false);
  }
}

function hasValue(row, field) {
  return row && row[field] !== undefined && row[field] !== null && row[field] !== '';
}

function fail(field, message) {
  throw new Error(`Validation failed: ${field} ${message}`);
}

module.exports = {
  SCHEMA_VERSION,
  init,
  getSchemaVersion,
  getAllData,
  saveProfile,
  saveSettings,
  addRow,
  updateRow,
  deleteRow,
  clearAll,
  backup,
  restore,
  exportFullJson,
  importFullJson,
  close
};
