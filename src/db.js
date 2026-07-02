const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

let db;
let dbPath;

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

function one(sql, params = []) {
  return db.prepare(sql).get(params);
}

function all(sql, params = []) {
  return db.prepare(sql).all(params);
}

function getAllData() {
  return {
    profile: one('SELECT * FROM profile WHERE id = 1'),
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
  return { id: info.lastInsertRowid, data: getAllData() };
}

function updateRow(table, id, row) {
  ensureTable(table);
  const columns = tableColumns[table].filter((column) => Object.prototype.hasOwnProperty.call(row, column));
  if (!columns.length) return getAllData();
  const assignments = columns.map((column) => `${column} = ?`).join(', ');
  db.prepare(`UPDATE ${table} SET ${assignments} WHERE id = ?`).run(...columns.map((column) => clean(row[column])), id);
  return getAllData();
}

function deleteRow(table, id) {
  ensureTable(table);
  if (table === 'workout_sessions') {
    db.prepare('DELETE FROM activities WHERE source_session_id = ?').run(id);
  }
  db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
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
  return getAllData();
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

module.exports = {
  init,
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
