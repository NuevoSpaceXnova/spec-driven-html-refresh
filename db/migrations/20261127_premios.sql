-- Premios del panel (ejecutar una vez en la consola de D1, antes de usar la sección "Asignar premios").

-- Registro de cada premio o cambio de almacén entregado desde el panel.
CREATE TABLE IF NOT EXISTS prizes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  amount REAL NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  given_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_prizes_created ON prizes (created_at);

-- Interruptores generales. prizes_enabled = 1 deja usar los premios.
CREATE TABLE IF NOT EXISTS app_flags (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT OR IGNORE INTO app_flags (key, value) VALUES ('prizes_enabled', '1');

-- Permisos de ayudantes sin restricción de sección (quita cualquier CHECK viejo que no incluya "premios").
CREATE TABLE IF NOT EXISTS assistant_permissions_new (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  PRIMARY KEY (user_id, section)
);
INSERT OR IGNORE INTO assistant_permissions_new (user_id, section)
  SELECT user_id, section FROM assistant_permissions;
DROP TABLE assistant_permissions;
ALTER TABLE assistant_permissions_new RENAME TO assistant_permissions;
