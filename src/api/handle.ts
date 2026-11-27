// Rutas /api de cuentas y sesiones (fase 5, parte 1). Usa la base D1 con el nombre "DB".

const ITER = 100000; // máximo permitido por Cloudflare para PBKDF2
const SESSION_DAYS = 30;
const COOKIE = "xn_session";
const PANEL_COOKIE = "xn_panel";
const PANEL_HOURS = 8;
const enc = new TextEncoder();

type Stmt = {
  bind(...args: unknown[]): {
    first<T = Record<string, unknown>>(): Promise<T | null>;
    all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
    run(): Promise<{ meta?: { changes?: number } }>;
  };
};
export type ApiEnv = { DB?: { prepare(sql: string): Stmt }; PANEL_PASSWORD?: string };
type DB = NonNullable<ApiEnv["DB"]>;
type User = { id: string; email: string; role: string };
type Route = (request: Request, db: DB, env: ApiEnv) => Promise<Response>;

const now = () => Math.floor(Date.now() / 1000);

// Secciones del panel. El administrador las tiene todas; el ayudante solo las que se le den.
export const SECTIONS = ["retiros", "trazabilidad", "saldos", "precio", "temporadas", "jugadores", "premios", "movimientos", "mercado", "limites", "multicuentas", "materia", "registro", "pruebas"];

function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function normEmail(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254 ? s : "";
}

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const a = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s);
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}

function toHex(buf: ArrayBuffer | Uint8Array): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, 256);
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITER);
  return `pbkdf2$${ITER}$${toB64(salt)}$${toB64(hash)}`;
}

async function checkPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const hash = toB64(await derive(password, fromB64(parts[2]), parseInt(parts[1], 10)));
  const expected = parts[3];
  if (hash.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

async function sha256Hex(text: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", enc.encode(text)));
}

async function createSession(db: DB, userId: string): Promise<string> {
  const token = toHex(crypto.getRandomValues(new Uint8Array(32)));
  await db
    .prepare("INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .bind(await sha256Hex(token), userId, now() + SESSION_DAYS * 86400, now())
    .run();
  return token;
}

function sessionCookie(token: string): string {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`;
}

function clearCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function panelCookie(value: string): string {
  return `${PANEL_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${PANEL_HOURS * 3600}`;
}

function clearPanelCookie(): string {
  return `${PANEL_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

// El acceso al panel se liga a la sesión actual y a la contraseña: si cambia cualquiera, deja de valer.
async function panelToken(request: Request, secret: string): Promise<string> {
  return sha256Hex(`panel:${readCookie(request, COOKIE)}:${secret}`);
}

async function panelUnlocked(request: Request, env: ApiEnv): Promise<boolean> {
  if (!env.PANEL_PASSWORD) return false;
  return readCookie(request, PANEL_COOKIE) === (await panelToken(request, env.PANEL_PASSWORD));
}

function readCookie(request: Request, name: string): string {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return "";
}

async function currentUser(request: Request, db: DB): Promise<User | null> {
  const token = readCookie(request, COOKIE);
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  return db
    .prepare(
      "SELECT u.id, u.email, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?",
    )
    .bind(await sha256Hex(token), now())
    .first<User>();
}

async function sectionsFor(db: DB, user: User): Promise<string[]> {
  if (user.role === "admin") return SECTIONS;
  const rows = await db
    .prepare("SELECT section FROM assistant_permissions WHERE user_id = ?")
    .bind(user.id)
    .all<{ section: string }>();
  return rows.results.map((r) => r.section).filter((x) => SECTIONS.includes(x));
}

// Solo el administrador con el panel desbloqueado puede usar estas rutas.
async function adminGate(request: Request, db: DB, env: ApiEnv): Promise<{ user: User } | { res: Response }> {
  const user = await currentUser(request, db);
  if (!user || user.role !== "admin") return { res: json({ error: "No autorizado" }, 403) };
  if (!(await panelUnlocked(request, env))) return { res: json({ error: "Panel bloqueado" }, 403) };
  return { user };
}

const register: Route = async (request, db) => {
  const body = await readJson(request);
  if (!body) return json({ error: "Datos no válidos" }, 400);
  const email = normEmail(body.email);
  const password = String(body.password ?? "");
  if (!email) return json({ error: "Correo no válido" }, 400);
  if (password.length < 8) return json({ error: "La contraseña debe tener al menos 8 caracteres" }, 400);

  if (await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first()) {
    return json({ error: "Ese correo ya está registrado" }, 409);
  }
  const id = crypto.randomUUID();
  try {
    await db
      .prepare("INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(id, email, await hashPassword(password), "player", now())
      .run();
  } catch {
    return json({ error: "Ese correo ya está registrado" }, 409);
  }
  const token = await createSession(db, id);
  return json({ user: { email, role: "player" } }, 201, { "Set-Cookie": sessionCookie(token) });
};

const login: Route = async (request, db) => {
  const body = await readJson(request);
  if (!body) return json({ error: "Datos no válidos" }, 400);
  const email = normEmail(body.email);
  const password = String(body.password ?? "");
  const user = email
    ? await db
        .prepare("SELECT id, email, password_hash, role FROM users WHERE email = ?")
        .bind(email)
        .first<{ id: string; email: string; password_hash: string; role: string }>()
    : null;
  if (!user || !(await checkPassword(password, user.password_hash))) {
    return json({ error: "Correo o contraseña incorrectos" }, 401);
  }
  const token = await createSession(db, user.id);
  return json({ user: { email: user.email, role: user.role } }, 200, { "Set-Cookie": sessionCookie(token) });
};

const logout: Route = async (request, db) => {
  const token = readCookie(request, COOKIE);
  if (/^[0-9a-f]{64}$/.test(token)) {
    await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256Hex(token)).run();
  }
  const res = json({ ok: true }, 200, { "Set-Cookie": clearCookie() });
  res.headers.append("Set-Cookie", clearPanelCookie());
  return res;
};

const panelStatus: Route = async (request, db, env) => {
  const user = await currentUser(request, db);
  if (!user || (user.role !== "admin" && user.role !== "assistant")) return json({ error: "No autorizado" }, 403);
  return json({
    unlocked: await panelUnlocked(request, env),
    role: user.role,
    sections: await sectionsFor(db, user),
  });
};

const panelUnlock: Route = async (request, db, env) => {
  const user = await currentUser(request, db);
  if (!user || (user.role !== "admin" && user.role !== "assistant")) return json({ error: "No autorizado" }, 403);
  if (!env.PANEL_PASSWORD) return json({ error: "El panel todavía no tiene contraseña configurada" }, 503);
  const body = await readJson(request);
  const given = await sha256Hex(String(body?.password ?? ""));
  const expected = await sha256Hex(env.PANEL_PASSWORD);
  if (given !== expected) return json({ error: "Contraseña incorrecta" }, 401);
  return json({ ok: true }, 200, { "Set-Cookie": panelCookie(await panelToken(request, env.PANEL_PASSWORD)) });
};

const panelLock: Route = async () => json({ ok: true }, 200, { "Set-Cookie": clearPanelCookie() });

const me: Route = async (request, db) => {
  const user = await currentUser(request, db);
  return json({ user: user ? { email: user.email, role: user.role } : null });
};

// Solo el administrador asigna el rol de ayudante (o lo quita). Al quitarlo, se borran sus permisos.
const setRole: Route = async (request, db, env) => {
  const gate = await adminGate(request, db, env);
  if ("res" in gate) return gate.res;
  const body = await readJson(request);
  const email = normEmail(body?.email);
  const role = body?.role;
  if (!email) return json({ error: "Correo no válido" }, 400);
  if (role !== "assistant" && role !== "player") return json({ error: "Rol no válido" }, 400);
  const target = await db.prepare("SELECT id, role FROM users WHERE email = ?").bind(email).first<{ id: string; role: string }>();
  if (!target) return json({ error: "Cuenta no encontrada" }, 404);
  if (target.role === "admin") return json({ error: "La cuenta de administración no cambia de rol aquí" }, 400);
  await db.prepare("UPDATE users SET role = ? WHERE id = ?").bind(role, target.id).run();
  if (role !== "assistant") {
    await db.prepare("DELETE FROM assistant_permissions WHERE user_id = ?").bind(target.id).run();
  }
  return json({ ok: true, email, role });
};

// Lista de ayudantes con sus secciones.
const assistantsList: Route = async (request, db, env) => {
  const gate = await adminGate(request, db, env);
  if ("res" in gate) return gate.res;
  const rows = await db
    .prepare(`SELECT u.email AS email, p.section AS section FROM users u
      LEFT JOIN assistant_permissions p ON p.user_id = u.id
      WHERE u.role = 'assistant' ORDER BY u.email, p.section`)
    .bind()
    .all<{ email: string; section: string | null }>();
  const map = new Map<string, string[]>();
  for (const r of rows.results) {
    if (!map.has(r.email)) map.set(r.email, []);
    if (r.section) map.get(r.email)!.push(r.section);
  }
  return json({ assistants: [...map.entries()].map(([email, sections]) => ({ email, sections })) });
};

// Da o quita un permiso de sección a un ayudante.
const permissionSet: Route = async (request, db, env) => {
  const gate = await adminGate(request, db, env);
  if ("res" in gate) return gate.res;
  const body = await readJson(request);
  const email = normEmail(body?.email);
  const section = String(body?.section ?? "");
  const granted = body?.granted === true;
  if (!email) return json({ error: "Correo no válido" }, 400);
  if (!SECTIONS.includes(section)) return json({ error: "Sección no válida" }, 400);
  const target = await db.prepare("SELECT id, role FROM users WHERE email = ?").bind(email).first<{ id: string; role: string }>();
  if (!target || target.role !== "assistant") return json({ error: "La cuenta no es ayudante" }, 404);
  if (granted) {
    await db.prepare("INSERT OR IGNORE INTO assistant_permissions (user_id, section) VALUES (?, ?)").bind(target.id, section).run();
  } else {
    await db.prepare("DELETE FROM assistant_permissions WHERE user_id = ? AND section = ?").bind(target.id, section).run();
  }
  return json({ ok: true, email, section, granted });
};

// Partida de la cuenta. Control de versión: si otra pestaña guardó antes, responde 409 con la copia actual.
const MAX_SAVE_CHARS = 1_500_000;

const saveGet: Route = async (request, db) => {
  const user = await currentUser(request, db);
  if (!user) return json({ error: "No autorizado" }, 401);
  const row = await db
    .prepare("SELECT data, version FROM saves WHERE user_id = ?")
    .bind(user.id)
    .first<{ data: string; version: number }>();
  return json({ data: row ? row.data : null, version: row ? row.version : 0 });
};

const savePut: Route = async (request, db) => {
  const user = await currentUser(request, db);
  if (!user) return json({ error: "No autorizado" }, 401);
  const body = await readJson(request);
  const data = typeof body?.data === "string" ? body.data : "";
  const version = Number(body?.version);
  if (!data || data.length > MAX_SAVE_CHARS) return json({ error: "Partida no válida o demasiado grande" }, 400);
  if (!Number.isInteger(version) || version < 0) return json({ error: "Versión no válida" }, 400);
  let parsed: unknown;
  try { parsed = JSON.parse(data); } catch { return json({ error: "Partida no válida" }, 400); }
  if (!parsed || typeof parsed !== "object") return json({ error: "Partida no válida" }, 400);

  const current = await db
    .prepare("SELECT data, version FROM saves WHERE user_id = ?")
    .bind(user.id)
    .first<{ data: string; version: number }>();
  if (!current) {
    if (version !== 0) return json({ error: "Conflicto", data: null, version: 0 }, 409);
    try {
      await db.prepare("INSERT INTO saves (user_id, data, version, updated_at) VALUES (?, ?, 1, ?)")
        .bind(user.id, data, now()).run();
    } catch {
      return json({ error: "Conflicto" }, 409);
    }
    return json({ ok: true, version: 1 });
  }
  if (current.version !== version) return json({ error: "Conflicto", data: current.data, version: current.version }, 409);
  const result = await db
    .prepare("UPDATE saves SET data = ?, version = version + 1, updated_at = ? WHERE user_id = ? AND version = ?")
    .bind(data, now(), user.id, version)
    .run();
  if (!result.meta || !result.meta.changes) {
    const latest = await db.prepare("SELECT data, version FROM saves WHERE user_id = ?").bind(user.id)
      .first<{ data: string; version: number }>();
    return json({ error: "Conflicto", data: latest?.data ?? null, version: latest?.version ?? 0 }, 409);
  }
  return json({ ok: true, version: version + 1 });
};

// Saldo de TOKEN de cada cuenta (etapa B1). Solo el servidor lo cambia.
// WALLET_START es el saldo inicial de una cuenta nueva: 0 (decisión aprobada).
const WALLET_START = 0;
const MAX_REASON = 80;

async function ensureWallet(db: DB, userId: string): Promise<number> {
  await db.prepare("INSERT OR IGNORE INTO wallets (user_id, token, updated_at) VALUES (?, ?, ?)")
    .bind(userId, WALLET_START, now()).run();
  const row = await db.prepare("SELECT token FROM wallets WHERE user_id = ?").bind(userId).first<{ token: number }>();
  return row ? row.token : 0;
}

// Gasta TOKEN de la cuenta. Devuelve el saldo nuevo, o null si no alcanza.
async function spendToken(db: DB, userId: string, amount: number, reason: string): Promise<number | null> {
  await ensureWallet(db, userId);
  const upd = await db
    .prepare("UPDATE wallets SET token = ROUND(token - ?, 6), updated_at = ? WHERE user_id = ? AND token >= ?")
    .bind(amount, now(), userId, amount)
    .run();
  if (!upd.meta || !upd.meta.changes) return null;
  const balance = await ensureWallet(db, userId);
  await db.prepare("INSERT INTO wallet_moves (user_id, delta, reason, balance_after, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(userId, -amount, reason, balance, now()).run();
  return balance;
}

// Suma TOKEN a la cuenta (hallazgos de expedición).
async function creditToken(db: DB, userId: string, amount: number, reason: string): Promise<number> {
  await ensureWallet(db, userId);
  await db.prepare("UPDATE wallets SET token = ROUND(token + ?, 6), updated_at = ? WHERE user_id = ?")
    .bind(amount, now(), userId).run();
  const balance = await ensureWallet(db, userId);
  await db.prepare("INSERT INTO wallet_moves (user_id, delta, reason, balance_after, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(userId, amount, reason, balance, now()).run();
  return balance;
}

const walletGet: Route = async (request, db) => {
  const user = await currentUser(request, db);
  if (!user) return json({ error: "No autorizado" }, 401);
  const token = await ensureWallet(db, user.id);
  const darkRow = await db.prepare("SELECT dark FROM wallets WHERE user_id = ?").bind(user.id)
    .first<{ dark: number }>();
  return json({ token, dark: darkRow?.dark ?? 0, vipUntil: await vipUntilFor(db, user.id) });
};

const walletSpend: Route = async (request, db) => {
  const user = await currentUser(request, db);
  if (!user) return json({ error: "No autorizado" }, 401);
  const body = await readJson(request);
  const amount = Math.round(Number(body?.amount) * 1000000) / 1000000;
  const reason = String(body?.reason ?? "").slice(0, MAX_REASON);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e12) return json({ error: "Cantidad no válida" }, 400);
  if (!reason) return json({ error: "Motivo no válido" }, 400);
  const balance = await spendToken(db, user.id, amount, reason);
  if (balance === null) {
    return json({ error: "Saldo de TOKEN insuficiente", token: await ensureWallet(db, user.id) }, 409);
  }
  return json({ ok: true, token: balance });
};

// Pase VIP en el servidor. Mismo precio y duración que el juego: 98.684 TOKEN por 30 días.
const VIP_COST = 98684;
const VIP_MS = 30 * 86400000;

async function vipUntilFor(db: DB, userId: string): Promise<number> {
  const row = await db.prepare("SELECT until_ms FROM vip WHERE user_id = ?").bind(userId).first<{ until_ms: number }>();
  return row ? row.until_ms : 0;
}

const vipBuy: Route = async (request, db) => {
  const user = await currentUser(request, db);
  if (!user) return json({ error: "No autorizado" }, 401);
  if ((await vipUntilFor(db, user.id)) > Date.now()) return json({ error: "El VIP ya está activo" }, 409);
  const balance = await spendToken(db, user.id, VIP_COST, "Pase VIP");
  if (balance === null) {
    return json({ error: "Saldo de TOKEN insuficiente", token: await ensureWallet(db, user.id) }, 409);
  }
  const until = Date.now() + VIP_MS;
  await db.prepare("INSERT INTO vip (user_id, until_ms) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET until_ms = excluded.until_ms")
    .bind(user.id, until).run();
  return json({ ok: true, token: balance, vipUntil: until });
};

// Hallazgos de TOKEN y materia oscura en expediciones. Salen de reservas que carga el administrador.
const EXP_CHANCE = { token: 0.03, dark: 0.01 }; // probabilidad base por expedición
const VIP_CHANCE_MUL = 1.5;                      // VIP: +50 %
const EXPEDITION_DURATION_SECONDS = 30;
const EXPEDITION_EXPIRY_SECONDS = 10 * 60;
const EXPEDITION_CLAIM_COOLDOWN_SECONDS = 30;

async function takeFromReserve(db: DB, kind: "token" | "dark"): Promise<number> {
  const row = await db.prepare("SELECT amount, min_amt, max_amt FROM reserves WHERE kind = ?")
    .bind(kind).first<{ amount: number; min_amt: number; max_amt: number }>();
  if (!row || row.amount <= 0 || row.max_amt <= 0) return 0;
  const lo = Math.min(row.min_amt, row.max_amt);
  const want = lo + Math.random() * (row.max_amt - lo);
  const amount = Math.round(Math.min(want, row.amount) * 1000000) / 1000000;
  if (amount <= 0) return 0;
  const upd = await db.prepare("UPDATE reserves SET amount = ROUND(amount - ?, 6), updated_at = ? WHERE kind = ? AND amount >= ?")
    .bind(amount, now(), kind, amount).run();
  return upd.meta && upd.meta.changes ? amount : 0;
}

async function creditDark(db: DB, userId: string, amount: number): Promise<number> {
  await ensureWallet(db, userId);
  await db.prepare("UPDATE wallets SET dark = ROUND(dark + ?, 6), updated_at = ? WHERE user_id = ?")
    .bind(amount, now(), userId).run();
  const row = await db.prepare("SELECT dark FROM wallets WHERE user_id = ?").bind(userId)
    .first<{ dark: number }>();
  return row?.dark ?? 0;
}

const expeditionRoll: Route = async (request, db) => {
  const user = await currentUser(request, db);
  if (!user) return json({ error: "No autorizado" }, 401);
  const body = await readJson(request);
  const action = String(body?.action ?? "");
  const current = now();

  if (action === "start") {
    await db.prepare("DELETE FROM expeditions WHERE rolled_at IS NOT NULL AND rolled_at < ?")
      .bind(current - 7 * 24 * 60 * 60).run();
    await db.prepare("DELETE FROM expeditions WHERE user_id = ? AND rolled_at IS NULL AND started_at <= ?")
      .bind(user.id, current - EXPEDITION_EXPIRY_SECONDS).run();
    const open = await db.prepare("SELECT id FROM expeditions WHERE user_id = ? AND rolled_at IS NULL")
      .bind(user.id).first<{ id: string }>();
    if (open) return json({ error: "Ya tienes una expedición sin reclamar." }, 429);
    const id = crypto.randomUUID();
    const endsAt = current + EXPEDITION_DURATION_SECONDS;
    try {
      await db.prepare("INSERT INTO expeditions (id, user_id, started_at, ends_at, rolled_at) VALUES (?, ?, ?, ?, NULL)")
        .bind(id, user.id, current, endsAt).run();
    } catch {
      return json({ error: "Ya tienes una expedición sin reclamar." }, 429);
    }
    return json({ ok: true, expeditionId: id, endsAt: endsAt * 1000 }, 201);
  }

  if (action !== "claim") return json({ error: "Acción no válida" }, 400);
  const expeditionId = String(body?.expeditionId ?? "");
  if (!expeditionId || expeditionId.length > 64) return json({ error: "Expedición no válida" }, 400);
  const expedition = await db.prepare("SELECT id, started_at, ends_at, rolled_at FROM expeditions WHERE id = ? AND user_id = ?")
    .bind(expeditionId, user.id)
    .first<{ id: string; started_at: number; ends_at: number; rolled_at: number | null }>();
  if (!expedition) return json({ error: "Expedición no encontrada" }, 404);
  if (expedition.rolled_at !== null) return json({ error: "La expedición ya fue reclamada." }, 409);
  if (expedition.ends_at > current) return json({ error: "La expedición todavía está en curso." }, 425);
  if (expedition.started_at <= current - EXPEDITION_EXPIRY_SECONDS) return json({ error: "La expedición caducó." }, 410);

  const lastClaim = await db.prepare("SELECT MAX(rolled_at) AS rolled_at FROM expeditions WHERE user_id = ?")
    .bind(user.id).first<{ rolled_at: number | null }>();
  if (lastClaim?.rolled_at != null && current - lastClaim.rolled_at < EXPEDITION_CLAIM_COOLDOWN_SECONDS) {
    return json({ error: "Debes esperar 30 segundos entre reclamaciones." }, 429);
  }

  const consumed = await db.prepare("UPDATE expeditions SET rolled_at = ? WHERE id = ? AND user_id = ? AND rolled_at IS NULL AND ends_at <= ? AND started_at > ?")
    .bind(current, expeditionId, user.id, current, current - EXPEDITION_EXPIRY_SECONDS).run();
  if (!consumed.meta || !consumed.meta.changes) return json({ error: "La expedición ya fue reclamada o caducó." }, 409);

  const mul = (await vipUntilFor(db, user.id)) > Date.now() ? VIP_CHANCE_MUL : 1;
  let token = 0;
  let dark = 0;
  if (Math.random() < EXP_CHANCE.token * mul) token = await takeFromReserve(db, "token");
  if (Math.random() < EXP_CHANCE.dark * mul) dark = await takeFromReserve(db, "dark");
  const balance = token > 0 ? await creditToken(db, user.id, token, "Hallazgo de expedición") : await ensureWallet(db, user.id);
  const darkBalance = dark > 0 ? await creditDark(db, user.id, dark) :
    (await db.prepare("SELECT dark FROM wallets WHERE user_id = ?").bind(user.id).first<{ dark: number }>())?.dark ?? 0;
  return json({ token, dark, balance, darkBalance });
};

// Reservas de expedición (solo administración). Cantidad disponible y rango de cada hallazgo.
const RESERVE_KINDS = ["token", "dark"];

const reservesGet: Route = async (request, db, env) => {
  const gate = await adminGate(request, db, env);
  if ("res" in gate) return gate.res;
  const rows = await db.prepare("SELECT kind, amount, min_amt, max_amt FROM reserves").bind()
    .all<{ kind: string; amount: number; min_amt: number; max_amt: number }>();
  const reserves: Record<string, { amount: number; min: number; max: number }> = {
    token: { amount: 0, min: 0, max: 0 },
    dark: { amount: 0, min: 0, max: 0 },
  };
  for (const r of rows.results) reserves[r.kind] = { amount: r.amount, min: r.min_amt, max: r.max_amt };
  return json({ reserves });
};

const reservesSet: Route = async (request, db, env) => {
  const gate = await adminGate(request, db, env);
  if ("res" in gate) return gate.res;
  const body = await readJson(request);
  const kind = String(body?.kind ?? "");
  if (!RESERVE_KINDS.includes(kind)) return json({ error: "Reserva no válida" }, 400);
  const amount = Number(body?.amount);
  const min = Number(body?.min);
  const max = Number(body?.max);
  if (![amount, min, max].every((n) => Number.isFinite(n) && n >= 0 && n <= 1e12)) {
    return json({ error: "Cantidades no válidas" }, 400);
  }
  if (min > max) return json({ error: "El mínimo no puede ser mayor que el máximo" }, 400);
  await db.prepare(`INSERT INTO reserves (kind, amount, min_amt, max_amt, updated_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(kind) DO UPDATE SET amount = excluded.amount, min_amt = excluded.min_amt,
        max_amt = excluded.max_amt, updated_at = excluded.updated_at`)
    .bind(kind, Math.round(amount * 1000000) / 1000000, min, max, now()).run();
  return json({ ok: true });
};

const ROUTES: Record<string, Route> = {
  "GET /api/wallet": walletGet,
  "POST /api/wallet/spend": walletSpend,
  "POST /api/vip/buy": vipBuy,
  "POST /api/expedition/roll": expeditionRoll,
  "GET /api/admin/reserves": reservesGet,
  "POST /api/admin/reserves": reservesSet,
  "GET /api/save": saveGet,
  "POST /api/save": savePut,
  "POST /api/register": register,
  "POST /api/login": login,
  "POST /api/logout": logout,
  "GET /api/me": me,
  "GET /api/panel/status": panelStatus,
  "POST /api/panel/unlock": panelUnlock,
  "POST /api/panel/lock": panelLock,
  "POST /api/admin/set-role": setRole,
  "GET /api/admin/assistants": assistantsList,
  "POST /api/admin/permissions": permissionSet,
};

// Devuelve null si la dirección no es de la API, para que siga el flujo normal del sitio.
export async function handleApi(request: Request, env: ApiEnv): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  if (!path.startsWith("/api/")) return null;
  const route = ROUTES[`${request.method} ${path}`];
  if (!route) return json({ error: "No encontrado" }, 404);
  if (!env || !env.DB) return json({ error: "La base de datos todavía no está conectada" }, 503);
  try {
    return await route(request, env.DB, env);
  } catch (error) {
    console.error(error);
    return json({ error: "Error interno" }, 500);
  }
}
