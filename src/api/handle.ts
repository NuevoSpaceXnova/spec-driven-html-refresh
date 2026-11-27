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
const SAVE_TOP_KEYS = ["v","token","planets","active","moves","inbox","market","galaxy","debris","speed","testMode","vipUntil","dark","dmShips","animOff","accountLevel","seasonMax","seasonStart","levelPts","levelSince","simSec","spent","daily","expLog","alliance","alliances","ranking","profile","wallet","txs","officers","empireClass","vacation","prod","stats","referrals"];
const SAVE_LEVEL_KEYS = ["mm","mc","ds","sol","sm","sc","tk","rf","sy","lab","fus","nan","ter","silo","lb","ph","jg","en","cm","bl","es","cp","ap","lz","io","pl","im","hd","hy","gv"];
const SAVE_UNIT_KEYS = ["nc","ng","cz","ch","cr","bt","ac","bm","de","dr","rc","sp","co","sat","lm","ll","lg","gc","ci","cpl","cs","cg","mi"];
const SAVE_PLANET_KEYS = ["name","coords","parent","moon","queue","queueExtra","shipQueue","res","lvl","fleet"];
const SAVE_SIGNED_KEYS = new Set(["amount","delta"]);
const SAVE_NUMERIC_CAPS: Record<string, number> = {
  metal: 1e15, crystal: 1e15, deut: 1e15, token: 1e15, dark: 1e15,
  mm: 1e6, mc: 1e6, ds: 1e6, sol: 1e6, sm: 1e6, sc: 1e6, tk: 1e6,
  rf: 1e6, sy: 1e6, lab: 1e6, fus: 1e6, nan: 1e6, ter: 1e6, silo: 1e6,
  lb: 1e6, ph: 1e6, jg: 1e6, en: 1e6, cm: 1e6, bl: 1e6, es: 1e6,
  cp: 1e6, ap: 1e6, lz: 1e6, io: 1e6, pl: 1e6, im: 1e6, hd: 1e6, hy: 1e6, gv: 1e6,
  n: 1e12, wins: 1e12, mined: 1e15, spent: 1e15, pts: 1e15, rate: 1e12,
  start: 1e15, end: 1e15, total: 1e15, t: 1e15, endAt: 1e15, startAt: 1e15,
  g: 1e6, s: 1e6, active: 100, version: 1e9, day: 1e9, level: 1e6,
};
function saveRecord(v: unknown): v is Record<string, any> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
function validateSaveTree(v: unknown, key = "", depth = 0): boolean {
  if (depth > 18) return false;
  if (typeof v === "number") {
    const cap = SAVE_NUMERIC_CAPS[key] ?? 1e15;
    return Number.isFinite(v) && Math.abs(v) <= cap && (v >= 0 || SAVE_SIGNED_KEYS.has(key));
  }
  if (v === null || typeof v === "string" || typeof v === "boolean") return typeof v !== "string" || v.length <= 20000;
  if (Array.isArray(v)) return v.length <= 10000 && v.every(x => validateSaveTree(x, key, depth + 1));
  if (!saveRecord(v)) return false;
  return Object.entries(v).every(([k, x]) => k.length <= 100 && validateSaveTree(x, k, depth + 1));
}
function capOfSave(level: number): number {
  return 100000 + 50000 * Math.floor(Math.pow(1.6, level));
}
function saveResources(data: any): { metal: number; crystal: number; deuterium: number } {
  return (data.planets || []).reduce((sum: any, p: any) => ({
    metal: sum.metal + p.res.metal, crystal: sum.crystal + p.res.crystal, deuterium: sum.deuterium + p.res.deut,
  }), { metal: 0, crystal: 0, deuterium: 0 });
}
function maxSaveProduction(data: any): { metal: number; crystal: number; deuterium: number } {
  const pw = (n: number) => n * Math.pow(1.1, n);
  return (data.planets || []).reduce((sum: any, p: any) => {
    if (p.moon) return sum;
    const l = p.lvl;
    const bonus = 2.025; // alianza + clase + geólogo (35 %) y VIP (50 %)
    return {
      metal: sum.metal + (30 + 30 * pw(l.mm)) * bonus,
      crystal: sum.crystal + (15 + 20 * pw(l.mc)) * bonus,
      deuterium: sum.deuterium + (12 * pw(l.ds)) * (1 + 0.05 * l.cm) * bonus,
    };
  }, { metal: 0, crystal: 0, deuterium: 0 });
}
function stripAuthoritativeSaveFields(data: any): any {
  delete data.dark;
  delete data.token;
  for (const p of data.planets || []) if (p.res) delete p.res.token;
  return data;
}
function validateSaveStructure(data: any): string {
  if (!saveRecord(data)) return "La partida debe ser un objeto JSON.";
  const unknown = Object.keys(data).find(k => !SAVE_TOP_KEYS.includes(k));
  if (unknown) return "Campo de partida desconocido: " + unknown;
  if (data.v !== 2 || !Array.isArray(data.planets) || data.planets.length < 1 || data.planets.length > 20) return "Estructura de planetas no válida.";
  if (!Number.isInteger(data.active) || data.active < 0 || data.active >= data.planets.length) return "Planeta activo no válido.";
  if (data.speed !== 1) return "Velocidad de partida no válida.";
  for (const p of data.planets) {
    if (!saveRecord(p) || Object.keys(p).some(k => !SAVE_PLANET_KEYS.includes(k))) return "Estructura de planeta no válida.";
    if (!saveRecord(p.res) || !saveRecord(p.lvl) || !saveRecord(p.fleet)) return "Recursos, niveles o flota no válidos.";
    if (Object.keys(p.res).some(k => !["metal","crystal","deut","token"].includes(k))) return "Recurso desconocido.";
    if (Object.keys(p.lvl).some(k => !SAVE_LEVEL_KEYS.includes(k))) return "Nivel desconocido.";
    if (Object.keys(p.fleet).some(k => !SAVE_UNIT_KEYS.includes(k))) return "Unidad desconocida.";
    if (typeof p.moon !== "boolean" || typeof p.name !== "string" || typeof p.coords !== "string") return "Identidad del planeta no válida.";
    for (const k of ["metal","crystal","deut"]) if (typeof p.res[k] !== "number") return "Recurso con tipo incorrecto: " + k;
    for (const k of SAVE_LEVEL_KEYS) if (p.lvl[k] === undefined) p.lvl[k] = 0;
    for (const k of SAVE_UNIT_KEYS) if (p.fleet[k] === undefined) p.fleet[k] = 0;
  }
  if (!validateSaveTree(data)) return "La partida contiene valores numéricos o estructuras no válidos.";
  for (const p of data.planets) {
    for (const k of ["metal","crystal","deut"]) {
      const storageKey = k === "metal" ? "sm" : k === "crystal" ? "sc" : "tk";
      const capacity = capOfSave(p.lvl[storageKey]) * 1.5;
      p.res[k] = Math.min(p.res[k], capacity);
    }
  }
  return "";
}
async function rejectSave(db: DB, userId: string, reason: string, status = 409): Promise<Response> {
  await db.prepare("INSERT INTO save_rejects (user_id, reason, created_at) VALUES (?, ?, ?)")
    .bind(userId, reason.slice(0, 240), now()).run();
  return json({ error: reason, rejected: true }, status);
}
function firstSaveIsFresh(data: any): boolean {
  if (data.planets.length !== 1) return false;
  const p = data.planets[0];
  const expected = { mm: 1, mc: 1, sol: 1 };
  if (Object.entries(expected).some(([k,v]) => p.lvl[k] !== v)) return false;
  if (SAVE_LEVEL_KEYS.some(k => !(k in expected) && p.lvl[k] !== 0)) return false;
  if (SAVE_UNIT_KEYS.some(k => p.fleet[k] !== 0)) return false;
  return p.res.metal === 500 && p.res.crystal === 300 && p.res.deut === 0;
}
function validateGrowth(previous: any, next: any, elapsed: number): string {
  const oldRes = saveResources(previous), newRes = saveResources(next), rates = maxSaveProduction(previous);
  for (const k of ["metal","crystal","deuterium"] as const) {
    const increase = newRes[k] - oldRes[k];
    if (increase > 0 && increase > rates[k] * elapsed / 3600 * 3 + 1) return "Aumento de recursos superior a la producción permitida.";
  }
  const oldPlanets = previous.planets || [];
  for (let i = 0; i < next.planets.length; i++) {
    const p = next.planets[i], old = oldPlanets[i];
    if (!old) {
      if (Object.values(p.fleet).some((n: any) => n > 0)) return "No se permite crear flotas en planetas nuevos.";
      continue;
    }
    const yard = Math.max(1, old.lvl.sy || 1);
    for (const id of SAVE_UNIT_KEYS) {
      const oldCount = old.fleet[id] || 0, newCount = p.fleet[id] || 0;
      if (newCount <= oldCount) continue;
      const catalog: Record<string, [number,number]> = {
        nc:[2000,2000], ng:[6000,6000], cz:[3000,1000], ch:[6000,4000], cr:[20000,7000],
        bt:[45000,15000], ac:[30000,40000], bm:[50000,25000], de:[60000,50000], dr:[5000000,4000000],
        rc:[10000,6000], sp:[0,1000], co:[10000,20000], sat:[0,0], lm:[0,0], ll:[0,0], lg:[0,0],
        gc:[0,0], ci:[0,0], cpl:[0,0], cs:[0,0], cg:[0,0], mi:[0,0],
      };
      const [metal, crystal] = catalog[id] || [0,0];
      const unitSeconds = Math.max(10, Math.round(((metal + crystal) / (0.7 * (1 + 0.5 * (yard - 1)))) / 1.5));
      const maxUnits = Math.floor(elapsed / unitSeconds) * 3;
      if (newCount - oldCount > maxUnits) return "Aumento de flota o defensas superior a la velocidad del astillero.";
    }
  }
  return "";
}
const saveGet: Route = async (request, db) => {
  const user = await currentUser(request, db);
  if (!user) return json({ error: "No autorizado" }, 401);
  const row = await db.prepare("SELECT data, version FROM saves WHERE user_id = ?").bind(user.id)
    .first<{ data: string; version: number }>();
  if (!row) return json({ data: null, version: 0 });
  try {
    const clean = stripAuthoritativeSaveFields(JSON.parse(row.data));
    return json({ data: JSON.stringify(clean), version: row.version });
  } catch { return json({ data: null, version: row.version }); }
};
const savePut: Route = async (request, db) => {
  const user = await currentUser(request, db);
  if (!user) return json({ error: "No autorizado" }, 401);
  const body = await readJson(request);
  const data = typeof body?.data === "string" ? body.data : "";
  const version = body?.version;
  if (!data || data.length > MAX_SAVE_CHARS) return rejectSave(db, user.id, "Partida vacía o demasiado grande.", 400);
  if (typeof version !== "number" || !Number.isInteger(version) || version < 0) return rejectSave(db, user.id, "Versión no válida.", 400);
  let parsed: any;
  try { parsed = JSON.parse(data); } catch { return rejectSave(db, user.id, "JSON de partida no válido.", 400); }
  const structuralError = validateSaveStructure(parsed);
  if (structuralError) return rejectSave(db, user.id, structuralError, 400);
  stripAuthoritativeSaveFields(parsed);
  const cleanData = JSON.stringify(parsed);
  if (cleanData.length > MAX_SAVE_CHARS) return rejectSave(db, user.id, "Partida demasiado grande después de normalizar.", 400);
  const current = await db.prepare("SELECT data, version FROM saves WHERE user_id = ?").bind(user.id)
    .first<{ data: string; version: number }>();
  const check = await db.prepare("SELECT metal, crystal, deuterium, checked_at FROM save_checks WHERE user_id = ?")
    .bind(user.id).first<{ metal: number; crystal: number; deuterium: number; checked_at: number }>();
  if (!current) {
    if (version !== 0) return json({ error: "Conflicto", data: null, version: 0 }, 409);
    if (!firstSaveIsFresh(parsed)) return rejectSave(db, user.id, "La primera partida debe partir del estado inicial.", 409);
    try {
      await db.prepare("INSERT INTO saves (user_id, data, version, updated_at) VALUES (?, ?, 1, ?)")
        .bind(user.id, cleanData, now()).run();
      const resources = saveResources(parsed);
      await db.prepare("INSERT INTO save_checks (user_id, metal, crystal, deuterium, checked_at) VALUES (?, ?, ?, ?, ?)")
        .bind(user.id, resources.metal, resources.crystal, resources.deuterium, now()).run();
    } catch { return rejectSave(db, user.id, "No se pudo crear la partida inicial.", 409); }
    return json({ ok: true, version: 1 });
  }
  if (current.version !== version) return json({ error: "Conflicto", data: current.data, version: current.version }, 409);
  let previous: any;
  try { previous = JSON.parse(current.data); } catch { return rejectSave(db, user.id, "La copia guardada del servidor no es válida."); }
  const elapsed = check ? Math.max(0, now() - check.checked_at) : 0;
  const growthError = validateGrowth(previous, parsed, elapsed);
  if (growthError) return rejectSave(db, user.id, growthError);
  const resources = saveResources(parsed);
  const updated = await db.prepare("UPDATE saves SET data = ?, version = version + 1, updated_at = ? WHERE user_id = ? AND version = ?")
    .bind(cleanData, now(), user.id, version).run();
  if (!updated.meta || !updated.meta.changes) {
    const latest = await db.prepare("SELECT data, version FROM saves WHERE user_id = ?").bind(user.id)
      .first<{ data: string; version: number }>();
    return json({ error: "Conflicto", data: latest?.data ?? null, version: latest?.version ?? 0 }, 409);
  }
  await db.prepare("INSERT INTO save_checks (user_id, metal, crystal, deuterium, checked_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET metal=excluded.metal, crystal=excluded.crystal, deuterium=excluded.deuterium, checked_at=excluded.checked_at")
    .bind(user.id, resources.metal, resources.crystal, resources.deuterium, now()).run();
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
