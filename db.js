const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const fs = require('fs');

let db = null;
const DB_FILE = './pollmind.db';

async function initDatabase() {
  const SQL = await initSqlJs();
  
  // Charger la base existante ou créer une nouvelle
  if (fs.existsSync(DB_FILE)) {
    const buffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(buffer);
    console.log('✓ Base de données chargée');
  } else {
    db = new SQL.Database();
    console.log('✓ Nouvelle base de données créée');
  }

  // Initialisation des tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      points REAL DEFAULT 100,
      last_bonus_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      created_by INTEGER NOT NULL,
      status TEXT DEFAULT 'open',
      resolution TEXT,
      resolved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      is_correct INTEGER DEFAULT 0,
      FOREIGN KEY (question_id) REFERENCES questions(id)
    );

    CREATE TABLE IF NOT EXISTS bets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      option_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      price REAL NOT NULL,
      shares REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (question_id) REFERENCES questions(id),
      FOREIGN KEY (option_id) REFERENCES options(id)
    );
  `);

  // Créer un admin par défaut
  const result = db.exec('SELECT * FROM users WHERE username = "admin"');
  if (result.length === 0 || result[0].values.length === 0) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.run('INSERT INTO users (username, password, is_admin, points) VALUES (?, ?, 1, 1000)', 
      ['admin', hashedPassword]);
    saveDatabase();
    console.log('✓ Utilisateur admin créé (username: admin, password: admin123)');
  }

  return db;
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    fs.writeFileSync(DB_FILE, data);
  }
}

function getDatabase() {
  return db;
}

// Helper pour exécuter une requête SELECT et retourner un tableau d'objets
function query(sql, params = []) {
  const results = db.exec(sql, params);
  if (results.length === 0) return [];
  
  const columns = results[0].columns;
  const values = results[0].values;
  
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

// Helper pour exécuter une requête SELECT et retourner un seul objet
function queryOne(sql, params = []) {
  const results = query(sql, params);
  return results.length > 0 ? results[0] : null;
}

// Helper pour exécuter INSERT/UPDATE/DELETE
function run(sql, params = []) {
  db.run(sql, params);
  saveDatabase();
}

module.exports = {
  initDatabase,
  saveDatabase,
  getDatabase,
  query,
  queryOne,
  run
};