const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

let db;
let dbPath;
const SCHEMA_VERSION = 2;

const allowedTables = new Set([
  'glucose_readings',
  'food_log',
  'workout_sessions',
  'workout_exercises',
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

function init(userDataPath) {
  fs.mkdirSync(userDataPath, { recursive: true });
  dbPath = path.join(userDataPath, 'my-health-tracker.sqlite');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
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
    activities: all('SELECT * FROM activities ORDER BY date DESC, id DESC'),
    weight_log: all('SELECT * FROM weight_log ORDER BY date DESC, id DESC'),
    sleep_log: all('SELECT * FROM sleep_log ORDER BY date DESC, id DESC'),
    medications: all('SELECT * FROM medications ORDER BY name COLLATE NOCASE'),
    lab_results: all('SELECT * FROM lab_results ORDER BY date DESC, test_name COLLATE NOCASE')
  };
}

function saveProfile(profile) {
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
  const columns = tableColumns[table];
  const placeholders = columns.map(() => '?').join(', ');
  const stmt = db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`);
  const info = stmt.run(...columns.map((column) => clean(row[column])));
  rebuildDailyLedger();
  return { id: info.lastInsertRowid, data: getAllData() };
}

function updateRow(table, id, row) {
  ensureTable(table);
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

function backup(targetPath) {
  db.pragma('wal_checkpoint(RESTART)');
  fs.copyFileSync(dbPath, targetPath);
}

function restore(sourcePath) {
  close();
  fs.copyFileSync(sourcePath, dbPath);
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate();
}

function close() {
  if (db) {
    db.close();
    db = null;
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
  close
};
