-- Tarea 3: límites persistentes de intentos.
-- Ejecutar manualmente en D1. No ejecutar desde el Worker.

CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  ok INTEGER NOT NULL CHECK (ok IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time
  ON login_attempts (ip, created_at, ok);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time
  ON login_attempts (email, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS register_attempts (
  id TEXT PRIMARY KEY,
  ip TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_register_attempts_ip_time
  ON register_attempts (ip, created_at);

CREATE TABLE IF NOT EXISTS panel_unlock_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  ok INTEGER NOT NULL CHECK (ok IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_panel_unlock_attempts_user_time
  ON panel_unlock_attempts (user_id, created_at);

-- Elimina relojes de investigación de la implementación temporal ya retirada.
DELETE FROM save_queue_checks WHERE queue_key LIKE 'r:%';
