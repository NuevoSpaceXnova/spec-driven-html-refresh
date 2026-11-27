-- Validación antitrampas de partidas (Tarea 2)
CREATE TABLE IF NOT EXISTS save_checks (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  metal REAL NOT NULL,
  crystal REAL NOT NULL,
  deuterium REAL NOT NULL,
  checked_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS save_rejects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_save_rejects_user_created ON save_rejects (user_id, created_at);
