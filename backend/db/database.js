const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '../data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
const dbPath = path.join(dbDir, 'quiz.db');

let db;
let SQL;

async function initDB() {
  SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`PRAGMA foreign_keys = ON;`);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'participant',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organizer_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'general',
      time_per_question INTEGER DEFAULT 30,
      max_participants INTEGER DEFAULT 100,
      room_code TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'draft',
      current_question_index INTEGER DEFAULT -1,
      started_at DATETIME,
      ended_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'single',
      content TEXT NOT NULL,
      image_url TEXT,
      options TEXT NOT NULL,
      correct_answers TEXT NOT NULL,
      time_limit INTEGER DEFAULT 30,
      points INTEGER DEFAULT 100,
      order_index INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS quiz_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER NOT NULL,
      participant_id INTEGER NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      finished_at DATETIME,
      total_score INTEGER DEFAULT 0,
      rank INTEGER,
      UNIQUE(quiz_id, participant_id)
    );
    CREATE TABLE IF NOT EXISTS answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      selected_options TEXT NOT NULL,
      is_correct INTEGER DEFAULT 0,
      points_earned INTEGER DEFAULT 0,
      response_time_ms INTEGER,
      answered_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  save();
  return db;
}

function save() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

// Wrapper to mimic better-sqlite3 sync API
function prepare(sql) {
  return {
    run(...params) {
      db.run(sql, params);
      save();
      // Get last insert rowid
      const res = db.exec('SELECT last_insert_rowid() as id');
      const lastInsertRowid = res[0]?.values[0][0] ?? null;
      return { lastInsertRowid, changes: db.getRowsModified() };
    },
    get(...params) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
      }
      stmt.free();
      return undefined;
    },
    all(...params) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return rows;
    }
  };
}

function exec(sql) {
  db.run(sql);
  save();
}

module.exports = { initDB, prepare, exec, save };
