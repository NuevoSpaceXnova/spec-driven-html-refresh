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
