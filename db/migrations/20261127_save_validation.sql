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

-- Registro autoritativo de materia oscura: gastos, créditos y reembolsos únicos.
CREATE TABLE IF NOT EXISTS dark_moves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta REAL NOT NULL,
  reason TEXT NOT NULL,
  balance_after REAL NOT NULL,
  created_at INTEGER NOT NULL,
  refund_of INTEGER UNIQUE REFERENCES dark_moves(id)
);
CREATE INDEX IF NOT EXISTS idx_dark_moves_user_created ON dark_moves (user_id, created_at);

-- Desbloqueos de naves comprados con materia oscura, gestionados por el servidor.
CREATE TABLE IF NOT EXISTS dm_ship_unlocks (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ship_id TEXT NOT NULL,
  unlocked_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, ship_id)
);
