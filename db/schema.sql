-- Base D1 "XnovaEvolution" (fase 5, parte 1: cuentas y sesiones)
-- Se ejecuta una vez en la consola de D1 de Cloudflare.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'assistant', 'admin')),
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);

-- Permisos de los ayudantes por sección del panel (fase 5, parte 2)
CREATE TABLE IF NOT EXISTS assistant_permissions (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  section TEXT NOT NULL, -- las secciones válidas se validan en el código (SECTIONS en src/api/handle.ts)
  PRIMARY KEY (user_id, section)
);

-- Partida de cada cuenta (fase 5, parte 2, etapa A). version evita que dos pestañas se pisen.
CREATE TABLE IF NOT EXISTS saves (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  version INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Saldo de TOKEN de cada cuenta y su historial (fase 5, etapa B1). Solo el servidor cambia el saldo.
CREATE TABLE IF NOT EXISTS wallets (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  token REAL NOT NULL,
  dark REAL NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS wallet_moves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta REAL NOT NULL,
  reason TEXT NOT NULL,
  balance_after REAL NOT NULL,
  created_at INTEGER NOT NULL
);

-- Pase VIP de cada cuenta, guardado en el servidor (hora de fin en milisegundos).
CREATE TABLE IF NOT EXISTS vip (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  until_ms INTEGER NOT NULL
);

-- Reservas de expedición que carga el administrador: TOKEN y materia oscura.
-- amount = cantidad disponible; min_amt y max_amt = rango de cada hallazgo.
CREATE TABLE IF NOT EXISTS reserves (
  kind TEXT PRIMARY KEY CHECK (kind IN ('token', 'dark')),
  amount REAL NOT NULL,
  min_amt REAL NOT NULL,
  max_amt REAL NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Expediciones de un solo uso: una abierta por cuenta.
CREATE TABLE IF NOT EXISTS expeditions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  rolled_at INTEGER,
  UNIQUE(id)
);
CREATE INDEX IF NOT EXISTS idx_expeditions_user ON expeditions (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_expeditions_one_open_per_user
  ON expeditions (user_id) WHERE rolled_at IS NULL;

-- Validación antitrampas de partidas (Tarea 2)
CREATE TABLE IF NOT EXISTS save_checks (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  planet_id TEXT NOT NULL,
  metal REAL NOT NULL,
  crystal REAL NOT NULL,
  deuterium REAL NOT NULL,
  max_ships TEXT NOT NULL DEFAULT '{}',
  checked_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, planet_id)
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

-- Relojes de servidor para las colas activas; no se usan simSec ni fechas del navegador.
CREATE TABLE IF NOT EXISTS save_queue_checks (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  queue_key TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, queue_key)
);
