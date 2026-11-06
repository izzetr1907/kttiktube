
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'youtube.db');

let db = null;
let inTx = 0;
let dirty = false;

function persist() {
  if (inTx > 0) { dirty = true; return; }
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  dirty = false;
}

function wrap() {
  return {
    exec(sql) { db.run(sql); persist(); },
    prepare(sql) {
      return {
        run(...params) {
          const stmt = db.prepare(sql);
          if (params.length) stmt.bind(params);
          stmt.step();
          stmt.free();
          persist();
          return { changes: db.getRowsModified() };
        },
        get(...params) {
          const stmt = db.prepare(sql);
          if (params.length) stmt.bind(params);
          const has = stmt.step();
          const row = has ? stmt.getAsObject() : undefined;
          stmt.free();
          return row;
        },
        all(...params) {
          const stmt = db.prepare(sql);
          if (params.length) stmt.bind(params);
          const rows = [];
          while (stmt.step()) rows.push(stmt.getAsObject());
          stmt.free();
          return rows;
        }
      };
    },
    transaction(fn) {
      return (...args) => {
        inTx += 1;
        db.run('BEGIN');
        try {
          const result = fn(...args);
          db.run('COMMIT');
          inTx -= 1;
          if (dirty || true) persist();
          return result;
        } catch (e) {
          try { db.run('ROLLBACK'); } catch (_) {}
          inTx -= 1;
          throw e;
        }
      };
    },
    persist
  };
}

async function initDb() {
  if (db) return wrap();
  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    db = new SQL.Database(fs.readFileSync(dbPath));
  } else {
    db = new SQL.Database();
  }
  db.run(`CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT DEFAULT '',
    channel_name TEXT NOT NULL DEFAULT 'İzzet', filename TEXT, video_url TEXT,
    thumbnail TEXT, views INTEGER DEFAULT 0, likes INTEGER DEFAULT 0,
    dislikes INTEGER DEFAULT 0, created_at TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY, video_id TEXT NOT NULL, author TEXT NOT NULL DEFAULT 'Misafir',
    text TEXT NOT NULL, created_at TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, video_id TEXT NOT NULL,
    visitor_id TEXT NOT NULL, type TEXT NOT NULL, UNIQUE(video_id, visitor_id))`);
  persist();
  return wrap();
}

module.exports = { initDb };
