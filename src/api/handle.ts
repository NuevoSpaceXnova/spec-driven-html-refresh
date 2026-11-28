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
const SAVE_BUILD_KEYS = ["mm","mc","ds","sol","sm","sc","tk","rf","sy","lab","fus","nan","ter","silo","lb","ph","jg"];
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
  const numericKeys = new Set(["v","token","dark","active","speed","vipUntil","accountLevel","seasonMax","seasonStart","levelPts","levelSince","simSec","spent","metal","crystal","deut","wins","mined","amount","delta","pts","rate","t","start","end","total","n","day","fortressNext","checked_at","price","qty","count","level"]);
  if (numericKeys.has(key) && v !== undefined && v !== null && typeof v !== "number") return false;
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
  const cap = 100000 + 50000 * Math.floor(Math.pow(1.6, level));
  return Number.isFinite(cap) ? Math.min(cap, 1e15) : 1e15;
}
function clipSaveResources(data: any): boolean {
  let clipped = false;
  for (const p of data.planets) {
    for (const k of ["metal","crystal","deut"]) {
      const storageKey = k === "metal" ? "sm" : k === "crystal" ? "sc" : "tk";
      const capacity = capOfSave(p.lvl[storageKey]);
      if (p.res[k] > capacity) clipped = true;
      p.res[k] = Math.min(p.res[k], capacity);
    }
  }
  return clipped;
}
function saveLevelBuildSeconds(id: string, targetLevel: number, levels: any): number {
  const costs: Record<string, [number,number,number]> = {
    mm:[60,15,1.5], mc:[48,24,1.6], ds:[225,75,1.5], sol:[75,30,1.5],
    sm:[1000,250,1.6], sc:[1000,500,1.6], tk:[1000,1000,1.6],
    rf:[400,120,1.5], sy:[400,200,1.5], lab:[200,400,1.6],
    fus:[900,360,1.8], nan:[1000,300,2], ter:[0,50000,2], silo:[20000,20000,2],
    lb:[20000,40000,2], ph:[10000,20000,2], jg:[200000,100000,2],
  };
  const c = costs[id];
  if (!c) return 0;
  const metal = Math.floor(c[0] * Math.pow(c[2], targetLevel - 1));
  const crystal = Math.floor(c[1] * Math.pow(c[2], targetLevel - 1));
  const base = (metal + crystal) / (2500 * (1 + (levels.rf || 0))) * 3600;
  return Math.max(5, Math.ceil(base * Math.pow(0.5, levels.nan || 0) * (1 - 0.02 * (levels.gv || 0)) / 1.5));
}
function saveResources(data: any): { metal: number; crystal: number; deuterium: number } {
  return (data.planets || []).reduce((sum: any, p: any) => ({
    metal: sum.metal + p.res.metal, crystal: sum.crystal + p.res.crystal, deuterium: sum.deuterium + p.res.deut,
  }), { metal: 0, crystal: 0, deuterium: 0 });
}
function saveResourcesCapped(data: any): { metal: number; crystal: number; deuterium: number } {
  return (data.planets || []).reduce((sum: any, p: any) => ({
    metal: sum.metal + Math.min(p.res.metal, capOfSave(p.lvl.sm)),
    crystal: sum.crystal + Math.min(p.res.crystal, capOfSave(p.lvl.sc)),
    deuterium: sum.deuterium + Math.min(p.res.deut, capOfSave(p.lvl.tk)),
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
  delete data.dmShips;
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
  const numericTopLevel = ["token","vipUntil","accountLevel","seasonMax","seasonStart","levelPts","levelSince","simSec","spent","active","speed"];
  for (const k of numericTopLevel) if (data[k] !== undefined && typeof data[k] !== "number") return "Tipo numérico incorrecto en " + k + ".";
  for (const p of data.planets) {
    if (!saveRecord(p) || Object.keys(p).some(k => !SAVE_PLANET_KEYS.includes(k))) return "Estructura de planeta no válida.";
    if (!saveRecord(p.res) || !saveRecord(p.lvl) || !saveRecord(p.fleet)) return "Recursos, niveles o flota no válidos.";
    if (p.queue !== undefined && p.queue !== null && !saveRecord(p.queue)) return "Cola de construcción no válida.";
    if (p.queueExtra !== undefined && !Array.isArray(p.queueExtra)) return "Cola adicional no válida.";
    if (p.shipQueue !== undefined && !Array.isArray(p.shipQueue)) return "Cola de naves no válida.";
    if (p.parent !== undefined && typeof p.parent !== "string") return "Planeta padre no válido.";
    const buildingQueue = [p.queue, ...(p.queueExtra || [])].filter(Boolean);
    if (buildingQueue.length > 4 || (p.queueExtra || []).length > 3) return "Cola de construcción demasiado larga.";
    for (const q of buildingQueue) {
      if (!saveRecord(q) || typeof q.id !== "string" || !SAVE_BUILD_KEYS.includes(q.id)
        || typeof q.end !== "number" || typeof q.total !== "number"
        || (q.darkSpendId !== undefined && q.darkSpendId !== null && (!Number.isInteger(q.darkSpendId) || q.darkSpendId <= 0))) return "Elemento de cola no válido.";
    }
    if (p.shipQueue && (p.shipQueue.length > 1000 || p.shipQueue.some((q: any) => !saveRecord(q)
      || typeof q.id !== "string" || !SAVE_UNIT_KEYS.includes(q.id) || !Number.isInteger(q.n) || q.n < 1
      || typeof q.start !== "number" || typeof q.end !== "number" || typeof q.total !== "number"))) return "Orden de astillero no válida.";
    if (Object.keys(p.res).some(k => !["metal","crystal","deut","token"].includes(k))) return "Recurso desconocido.";
    if (Object.keys(p.lvl).some(k => !SAVE_LEVEL_KEYS.includes(k))) return "Nivel desconocido.";
    if (Object.keys(p.fleet).some(k => !SAVE_UNIT_KEYS.includes(k))) return "Unidad desconocida.";
    if (typeof p.moon !== "boolean" || typeof p.name !== "string" || typeof p.coords !== "string") return "Identidad del planeta no válida.";
    for (const k of ["metal","crystal","deut"]) if (typeof p.res[k] !== "number") return "Recurso con tipo incorrecto: " + k;
    for (const k of SAVE_LEVEL_KEYS) if (typeof p.lvl[k] !== "number") return "Falta un nivel o su tipo no es numérico: " + k + ".";
    for (const k of SAVE_UNIT_KEYS) if (typeof p.fleet[k] !== "number") return "Falta una unidad o su tipo no es numérico: " + k + ".";
  }
  const expectedTypes: Record<string,string[]> = {
    planets:["array"], moves:["array"], inbox:["array"], market:["object"], galaxy:["object"],
    debris:["object"], dmShips:["object"], daily:["object"], expLog:["array"], alliances:["array"],
    wallet:["object"], txs:["array"], officers:["object"], prod:["object"], stats:["object"], referrals:["array"],
    alliance:["object","null"], ranking:["object","null"], profile:["object","null"], empireClass:["string","null"],
    testMode:["boolean"], animOff:["boolean"], vacation:["boolean"],
  };
  for (const [k, types] of Object.entries(expectedTypes)) {
    if (data[k] === undefined) continue;
    const type = data[k] === null ? "null" : Array.isArray(data[k]) ? "array" : typeof data[k];
    if (!types.includes(type)) return "Tipo de dato incorrecto en " + k + ".";
  }
  if (data.prod !== undefined && Object.entries(data.prod).some(([k,v]) => !["mm","mc","ds","sol","fus"].includes(k) || typeof v !== "number" || v < 0 || v > 100)) return "Porcentajes de producción no válidos.";
  if (data.officers !== undefined) {
    if (Object.keys(data.officers).some(k => !["geo","eng","adm","tec"].includes(k))) return "Oficial desconocido.";
    for (const [k,v] of Object.entries(data.officers)) if ((k === "adm" || k === "tec") ? typeof v !== "boolean" : typeof v !== "number") return "Estado de oficial no válido.";
  }
  if (data.wallet !== undefined && (Object.keys(data.wallet).some(k => k !== "address") || typeof data.wallet.address !== "string")) return "Wallet no válida.";
  if (data.stats !== undefined && (Object.keys(data.stats).some(k => !["wins","mined"].includes(k)) || typeof data.stats.wins !== "number" || typeof data.stats.mined !== "number")) return "Estadísticas no válidas.";
  for (const p of data.planets) {
    for (const k of SAVE_LEVEL_KEYS) if (!Number.isInteger(p.lvl[k]) || p.lvl[k] < 0) return "Los niveles deben ser enteros no negativos.";
    for (const k of SAVE_UNIT_KEYS) if (!Number.isInteger(p.fleet[k]) || p.fleet[k] < 0) return "Las unidades deben ser enteros no negativos.";
  }
  if (!validateSaveTree(data)) return "La partida contiene valores numéricos o estructuras no válidos.";
  for (const p of data.planets) {
    const keys = p.moon ? ["lb","rf","sy","ph","jg"] : ["mm","mc","ds","sol","sm","sc","tk","rf","sy","lab","fus","nan","ter","silo"];
    const used = keys.reduce((n: number, k: string) => n + p.lvl[k], 0);
    const fields = p.moon ? 1 + 3 * p.lvl.lb : 163 + 5 * p.lvl.ter;
    if (used > fields) return "El planeta supera sus campos de construcción.";
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
  if (p.moon || p.queue || (p.queueExtra && p.queueExtra.length) || (p.shipQueue && p.shipQueue.length)) return false;
  const expected = { mm: 1, mc: 1, sol: 1 };
  if (Object.entries(expected).some(([k,v]) => p.lvl[k] !== v)) return false;
  if (SAVE_LEVEL_KEYS.some(k => !(k in expected) && p.lvl[k] !== 0)) return false;
  if (SAVE_UNIT_KEYS.some(k => p.fleet[k] !== 0)) return false;
  return p.res.metal === 500 && p.res.crystal === 300 && p.res.deut === 0;
}
function validateGrowth(previous: any, next: any, elapsed: number, baseline?: {metal:number; crystal:number; deuterium:number} | null): string {
  const oldRes = baseline || saveResources(previous), newRes = saveResourcesCapped(next);
  const oldPlanets = previous.planets || [];
  if (next.planets.length < oldPlanets.length) return "No se permite eliminar planetas desde el guardado.";
  const newColonies = next.planets.slice(oldPlanets.length).filter((p: any) => !p.moon);
  const oldColonizers = oldPlanets.reduce((n: number, p: any) => n + (p.fleet.co || 0), 0);
  const newColonizers = next.planets.reduce((n: number, p: any) => n + (p.fleet.co || 0), 0);
  if (newColonies.length > oldColonizers - newColonizers) return "Colonia nueva sin consumir una nave colonizadora.";
  const moonParents = next.planets.filter((p: any) => p.moon).map((p: any) => p.parent);
  if (new Set(moonParents).size !== moonParents.length) return "Solo puede existir una luna por planeta.";
  for (const p of next.planets.slice(oldPlanets.length)) {
    if (Object.values(p.fleet).some((n: any) => n > 0)) return "Un planeta nuevo no puede traer flota.";
    if (p.moon) {
      if (p.res.metal !== 0 || p.res.crystal !== 0 || p.res.deut !== 0) return "Una luna nueva debe comenzar sin recursos.";
      if (["lb","rf","sy","ph","jg"].some(k => p.lvl[k] !== 0)) return "Una luna nueva no puede traer edificios.";
      const parent = oldPlanets.find((x: any) => x.coords === p.parent && !x.moon);
      if (!parent || ["en","cm","bl","es","cp","ap","lz","io","pl","im","hd","hy","gv"].some(k => p.lvl[k] > (parent.lvl[k] || 0))) return "Investigación de luna no válida.";
    } else {
      if (p.res.metal !== 500 || p.res.crystal !== 300 || p.res.deut !== 0) return "Una colonia nueva debe comenzar con recursos iniciales.";
      if (SAVE_LEVEL_KEYS.some(k => !["mm","mc","sol"].includes(k) && !["en","cm","bl","es","cp","ap","lz","io","pl","im","hd","hy","gv"].includes(k) && p.lvl[k] !== 0)) return "Edificios iniciales de colonia no válidos.";
      if (p.lvl.mm !== 1 || p.lvl.mc !== 1 || p.lvl.sol !== 1) return "Edificios iniciales de colonia no válidos.";
      for (const k of ["en","cm","bl","es","cp","ap","lz","io","pl","im","hd","hy","gv"]) {
        const maxResearch = oldPlanets.reduce((m: number, x: any) => Math.max(m, x.lvl[k] || 0), 0);
        if (p.lvl[k] > maxResearch) return "Investigación heredada de colonia no válida.";
      }
    }
  }
  const researchCosts: Record<string,[number,number,number,number]> = {
    en:[0,800,400,2], cm:[400,0,600,2], bl:[1000,0,0,2], es:[200,1000,200,2],
    cp:[0,400,600,2], ap:[4000,8000,4000,1.75], lz:[200,100,0,2], io:[300,400,0,2],
    pl:[2000,4000,1000,2], im:[800,0,400,2], hd:[1500,800,600,2], hy:[4000,4000,2000,2], gv:[0,20000,10000,2],
  };
  const researchSpend = {metal:0, crystal:0, deut:0};
  for (let i = 0; i < next.planets.length; i++) {
    const old = oldPlanets[i];
    if (!old) continue;
    for (const [id, c] of Object.entries(researchCosts)) {
      const increase = next.planets[i].lvl[id] - (old.lvl[id] || 0);
      for (let n = 1; n <= increase; n++) {
        const factor = Math.pow(c[3], (old.lvl[id] || 0) + n - 1);
        researchSpend.metal += Math.floor(c[0] * factor);
        researchSpend.crystal += Math.floor(c[1] * factor);
        researchSpend.deut += Math.floor(c[2] * factor);
      }
    }
  }
  const rates = maxSaveProduction(next);
  for (const [resource, field] of [["metal","metal"],["crystal","crystal"],["deuterium","deut"]] as const) {
    const allowedSpend = oldRes[resource] + rates[resource] * elapsed / 3600 * 3 - newRes[resource];
    if (!Number.isFinite(researchSpend[field]) || researchSpend[field] > allowedSpend + 1) return "Aumento de investigación sin recursos suficientes.";
  }
  return "";
}
async function validateTimedGrowth(db: DB, userId: string, previous: any, next: any, currentTime: number): Promise<string> {
  const shipCosts: Record<string,[number,number]> = {
    nc:[10000,10000], ng:[30000,30000], cz:[15000,5000], ch:[30000,20000], cr:[100000,35000],
    bt:[225000,75000], ac:[150000,200000], bm:[250000,125000], de:[300000,250000], dr:[25000000,20000000],
    rc:[50000,30000], sp:[0,5000], co:[50000,100000], sat:[0,10000],
    lm:[10000,0], ll:[7500,2500], lg:[30000,10000], gc:[100000,75000], ci:[10000,30000],
    cpl:[250000,250000], cs:[0,100000], cg:[100000,100000], mi:[62500,0],
  };
  for (let i = 0; i < next.planets.length; i++) {
    const p = next.planets[i], old = previous.planets[i];
    if (!old) continue;
    const buildKeys = p.moon ? ["lb","rf","sy","ph","jg"] : ["mm","mc","ds","sol","sm","sc","tk","rf","sy","lab","fus","nan","ter","silo"];
    const changedBuildings = buildKeys.filter(id => p.lvl[id] > (old.lvl[id] || 0));
    if (changedBuildings.length) {
      if (changedBuildings.length !== 1 || !old.queue || old.queue.id !== changedBuildings[0]
        || p.lvl[changedBuildings[0]] !== (old.lvl[changedBuildings[0]] || 0) + 1) return "Aumento de edificios sin una cola de construcción válida.";
      const row = await db.prepare("SELECT started_at FROM save_queue_checks WHERE user_id = ? AND queue_key = ?")
        .bind(userId, "b:" + i).first<{started_at:number}>();
      if (!row) return "No existe reloj de servidor para la construcción.";
      const seconds = saveLevelBuildSeconds(changedBuildings[0], p.lvl[changedBuildings[0]], old.lvl);
      if (seconds > Math.max(0, currentTime - row.started_at) * 3) return "Construcción completada antes del tiempo permitido por el servidor.";
    }
    let shipSeconds = 0;
    const yard = Math.max(1, old.lvl.sy || 1);
    for (const id of SAVE_UNIT_KEYS) {
      const increase = (p.fleet[id] || 0) - (old.fleet[id] || 0);
      if (increase <= 0) continue;
      const [metal, crystal] = shipCosts[id] || [0,0];
      const unitSeconds = Math.max(10, Math.round(((metal + crystal) / (0.7 * (1 + 0.5 * (yard - 1)))) / 1.5));
      shipSeconds += unitSeconds * increase;
    }
    if (shipSeconds > 0) {
      if ((old.lvl.sy || 0) < 1) return "No se pueden construir unidades sin astillero.";
      const row = await db.prepare("SELECT started_at FROM save_queue_checks WHERE user_id = ? AND queue_key = ?")
        .bind(userId, "s:" + i).first<{started_at:number}>();
      if (!row) return "No existe reloj de servidor para la cola de astillero.";
      if (shipSeconds > Math.max(0, currentTime - row.started_at) * 3) return "Flota o defensas completadas antes del tiempo permitido por el servidor.";
    }
  }
  return "";
}
async function syncQueueChecks(db: DB, userId: string, previous: any, next: any, currentTime: number): Promise<void> {
  for (let i = 0; i < next.planets.length; i++) {
    const p = next.planets[i], old = previous?.planets?.[i];
    const oldBuild = old?.queue, newBuild = p.queue;
    if (newBuild) {
      if (!oldBuild || oldBuild.id !== newBuild.id || oldBuild.darkSpendId !== newBuild.darkSpendId) {
        await db.prepare("INSERT INTO save_queue_checks (user_id, queue_key, started_at) VALUES (?, ?, ?) ON CONFLICT(user_id, queue_key) DO UPDATE SET started_at=excluded.started_at")
          .bind(userId, "b:" + i, currentTime).run();
      } else {
        await db.prepare("INSERT OR IGNORE INTO save_queue_checks (user_id, queue_key, started_at) VALUES (?, ?, ?)")
          .bind(userId, "b:" + i, currentTime).run();
      }
    } else {
      await db.prepare("DELETE FROM save_queue_checks WHERE user_id = ? AND queue_key = ?").bind(userId, "b:" + i).run();
    }
    const oldShip = old?.shipQueue?.[0], newShip = p.shipQueue?.[0];
    const sameShip = oldShip && newShip && oldShip.id === newShip.id && oldShip.n === newShip.n
      && oldShip.total === newShip.total && oldShip.start === newShip.start && oldShip.end === newShip.end;
    if (newShip) {
      if (!sameShip) {
        await db.prepare("INSERT INTO save_queue_checks (user_id, queue_key, started_at) VALUES (?, ?, ?) ON CONFLICT(user_id, queue_key) DO UPDATE SET started_at=excluded.started_at")
          .bind(userId, "s:" + i, currentTime).run();
      } else {
        await db.prepare("INSERT OR IGNORE INTO save_queue_checks (user_id, queue_key, started_at) VALUES (?, ?, ?)")
          .bind(userId, "s:" + i, currentTime).run();
      }
    } else {
      await db.prepare("DELETE FROM save_queue_checks WHERE user_id = ? AND queue_key = ?").bind(userId, "s:" + i).run();
    }
  }
}
function validateResourceGrowth(previous: any, next: any, elapsed: number, baseline?: {metal:number; crystal:number; deuterium:number} | null): string {
  const oldRes = baseline || saveResources(previous), newRes = saveResources(next), rates = maxSaveProduction(next);
  for (const k of ["metal","crystal","deuterium"] as const) {
    const increase = newRes[k] - oldRes[k];
    if (increase > rates[k] * elapsed / 3600 * 3 + 1) return "Aumento de recursos superior a la producción permitida.";
  }
  return "";
}
async function validateDarkProgression(db: DB, userId: string, previous: any, next: any): Promise<string> {
  const techKeys = ["en","cm","bl","es","cp","ap","lz","io","pl","im","hd","hy","gv"];
  const findSpend = async (spendId: number, id: string, level: number): Promise<boolean> => {
    if (!Number.isInteger(spendId) || spendId <= 0) return false;
    const cost = 10 * (level - 5);
    const move = await db.prepare("SELECT delta, reason FROM dark_moves WHERE id = ? AND user_id = ? AND delta < 0")
      .bind(spendId, userId).first<{delta:number; reason:string}>();
    if (!move || move.reason !== `Mejora · ${id} nivel ${level}` || Math.abs(move.delta + cost) > 0.000001) return false;
    const refunded = await db.prepare("SELECT id FROM dark_moves WHERE refund_of = ?").bind(spendId).first();
    return !refunded;
  };
  for (let i = 0; i < next.planets.length; i++) {
    const p = next.planets[i], old = previous.planets[i];
    if (!old) continue;
    for (const k of SAVE_LEVEL_KEYS) if (p.lvl[k] < (old.lvl[k] || 0)) return "Los niveles no pueden disminuir.";
    for (const id of techKeys) {
      const previousLevel = old.lvl[id] || 0;
      const target = p.lvl[id];
      for (let level = Math.max(6, previousLevel + 1); level <= target; level++) {
        const cost = 10 * (level - 5);
        const move = await db.prepare("SELECT id FROM dark_moves WHERE user_id = ? AND reason = ? AND delta = ?")
          .bind(userId, `Mejora · ${id} nivel ${level}`, -cost).first();
        if (!move) return "Investigación sin gasto autoritativo de materia oscura.";
      }
    }
    const dmShipIds = ["bt","ac","bm","de","dr","gc","cpl","cg"];
    for (const id of dmShipIds) {
      if ((p.fleet[id] || 0) <= (old.fleet[id] || 0)) continue;
      const unlocked = await db.prepare("SELECT ship_id FROM dm_ship_unlocks WHERE user_id = ? AND ship_id = ?")
        .bind(userId, id).first();
      if (!unlocked) return "Nave especial sin desbloqueo autoritativo.";
    }
    const oldQueue = [old.queue, ...(old.queueExtra || [])].filter(Boolean);
    const newQueue = [p.queue, ...(p.queueExtra || [])].filter(Boolean);
    for (const q of newQueue) {
      const target = (p.lvl[q.id] || 0) + 1;
      if (target >= 6 && 10 * (target - 5) > 0 && !(await findSpend(q.darkSpendId, q.id, target))) {
        return "Cola de construcción sin gasto autoritativo de materia oscura.";
      }
    }
    for (const q of oldQueue) {
      const target = (old.lvl[q.id] || 0) + 1;
      if (target < 6) continue;
      const completed = (p.lvl[q.id] || 0) >= target;
      const stillQueued = newQueue.some((n: any) => n.darkSpendId === q.darkSpendId);
      if (completed && !(await findSpend(q.darkSpendId, q.id, target))) {
        return "Construcción completada sin gasto autoritativo de materia oscura.";
      }
      if (!completed && !stillQueued && q.darkSpendId) {
        const refunded = await db.prepare("SELECT id FROM dark_moves WHERE refund_of = ?").bind(q.darkSpendId).first();
        if (!refunded) return "La cola de construcción desapareció sin reembolso válido.";
      }
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
      await db.prepare("INSERT INTO save_checks (user_id, metal, crystal, deuterium, checked_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET metal=excluded.metal, crystal=excluded.crystal, deuterium=excluded.deuterium, checked_at=excluded.checked_at")
        .bind(user.id, resources.metal, resources.crystal, resources.deuterium, now()).run();
      await db.prepare("DELETE FROM save_queue_checks WHERE user_id = ?").bind(user.id).run();
      await syncQueueChecks(db, user.id, null, parsed, now());
    } catch { return rejectSave(db, user.id, "No se pudo crear la partida inicial.", 409); }
    return json({ ok: true, version: 1 });
  }
  if (current.version !== version) return json({ error: "Conflicto", data: current.data, version: current.version }, 409);
  let previous: any;
  try { previous = JSON.parse(current.data); } catch { return rejectSave(db, user.id, "La copia guardada del servidor no es válida."); }
  const darkError = await validateDarkProgression(db, user.id, previous, parsed);
  if (darkError) return rejectSave(db, user.id, darkError);
  const elapsed = check ? Math.max(0, now() - check.checked_at) : 0;
  const baseline = check ? {metal:check.metal, crystal:check.crystal, deuterium:check.deuterium} : null;
  const growthError = validateGrowth(previous, parsed, elapsed, baseline);
  if (growthError) return rejectSave(db, user.id, growthError);
  const timedError = await validateTimedGrowth(db, user.id, previous, parsed, now());
  if (timedError) return rejectSave(db, user.id, timedError);
  const clipped = clipSaveResources(parsed);
  const resourceError = validateResourceGrowth(previous, parsed, elapsed, baseline);
  if (resourceError) return rejectSave(db, user.id, resourceError);
  const cleanAfterClip = JSON.stringify(parsed);
  const resources = saveResources(parsed);
  const updated = await db.prepare("UPDATE saves SET data = ?, version = version + 1, updated_at = ? WHERE user_id = ? AND version = ?")
    .bind(cleanAfterClip, now(), user.id, version).run();
  if (!updated.meta || !updated.meta.changes) {
    const latest = await db.prepare("SELECT data, version FROM saves WHERE user_id = ?").bind(user.id)
      .first<{ data: string; version: number }>();
    return json({ error: "Conflicto", data: latest?.data ?? null, version: latest?.version ?? 0 }, 409);
  }
  await db.prepare("INSERT INTO save_checks (user_id, metal, crystal, deuterium, checked_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET metal=excluded.metal, crystal=excluded.crystal, deuterium=excluded.deuterium, checked_at=excluded.checked_at")
    .bind(user.id, resources.metal, resources.crystal, resources.deuterium, now()).run();
  await syncQueueChecks(db, user.id, previous, parsed, now());
  return json({ ok: true, version: version + 1, clipped, resources: parsed.planets.map((p: any) => ({metal:p.res.metal, crystal:p.res.crystal, deut:p.res.deut})) });
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
  const unlockRows = await db.prepare("SELECT ship_id FROM dm_ship_unlocks WHERE user_id = ?").bind(user.id).all<{ship_id:string}>();
  const dmShips = Object.fromEntries(unlockRows.results.map(r => [r.ship_id, true]));
  return json({ token, dark: darkRow?.dark ?? 0, dmShips, vipUntil: await vipUntilFor(db, user.id) });
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
const walletDarkSpend: Route = async (request, db) => {
  const user = await currentUser(request, db);
  if (!user) return json({ error: "No autorizado" }, 401);
  const body = await readJson(request);
  const amount = Math.round(Number(body?.amount) * 1000000) / 1000000;
  const reason = String(body?.reason ?? "").slice(0, MAX_REASON);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e12 || !reason) return json({ error: "Cantidad o motivo no válido" }, 400);
  await ensureWallet(db, user.id);
  const upd = await db.prepare("UPDATE wallets SET dark = ROUND(dark - ?, 6), updated_at = ? WHERE user_id = ? AND dark >= ?")
    .bind(amount, now(), user.id, amount).run();
  const row = await db.prepare("SELECT dark FROM wallets WHERE user_id = ?").bind(user.id).first<{dark:number}>();
  if (!upd.meta || !upd.meta.changes) return json({ error: "Materia oscura insuficiente", dark: row?.dark ?? 0 }, 409);
  const move = await db.prepare("INSERT INTO dark_moves (user_id, delta, reason, balance_after, created_at) VALUES (?, ?, ?, ?, ?) RETURNING id")
    .bind(user.id, -amount, reason, row?.dark ?? 0, now()).first<{id:number}>();
  return json({ ok: true, dark: row?.dark ?? 0, spendId: move?.id ?? null });
};
const walletDarkBuy: Route = async (request, db) => {
  const user = await currentUser(request, db);
  if (!user) return json({ error: "No autorizado" }, 401);
  const body = await readJson(request);
  const usd = Number(body?.usd);
  const boxes: Record<number, number> = {1:10, 5:55, 10:120, 25:325, 50:700, 100:1500};
  if (!Number.isFinite(usd) || boxes[usd] === undefined) return json({ error: "Caja no válida" }, 400);
  const cost = Math.round(usd / 0.000152);
  const token = await spendToken(db, user.id, cost, "Caja de materia oscura");
  if (token === null) return json({ error: "Saldo de TOKEN insuficiente", token: await ensureWallet(db, user.id) }, 409);
  const dark = await creditDark(db, user.id, boxes[usd]);
  return json({ ok: true, token, dark });
};
const walletDarkRefund: Route = async (request, db) => {
  const user = await currentUser(request, db);
  if (!user) return json({ error: "No autorizado" }, 401);
  const body = await readJson(request);
  const spendId = Number(body?.spendId);
  if (!Number.isInteger(spendId) || spendId <= 0) return json({ error: "Reembolso no válido" }, 400);
  const spend = await db.prepare("SELECT delta, reason FROM dark_moves WHERE id = ? AND user_id = ? AND delta < 0")
    .bind(spendId, user.id).first<{delta:number; reason:string}>();
  if (!spend) return json({ error: "Gasto no encontrado" }, 404);
  const match = /^Mejora · ([a-z]+) nivel (\d+)$/.exec(spend.reason);
  if (!match) return json({ error: "Este gasto no admite reembolso de construcción" }, 403);
  const saved = await db.prepare("SELECT data FROM saves WHERE user_id = ?").bind(user.id).first<{data:string}>();
  let queued = false;
  try {
    const game = saved ? JSON.parse(saved.data) : null;
    queued = !!game?.planets?.some((p: any) => p.queue?.darkSpendId === spendId && p.queue.id === match[1]
      && (p.lvl?.[match[1]] || 0) + 1 === Number(match[2]));
  } catch { queued = false; }
  if (!queued) return json({ error: "La construcción ya no está pendiente en el servidor" }, 409);
  const amount = -spend.delta;
  await ensureWallet(db, user.id);
  const refundMove = await db.prepare("INSERT OR IGNORE INTO dark_moves (user_id, delta, reason, balance_after, created_at, refund_of) VALUES (?, ?, ?, 0, ?, ?) RETURNING id")
    .bind(user.id, amount, "Reembolso · " + spend.reason, now(), spendId).first<{id:number}>();
  if (!refundMove) return json({ error: "Este gasto ya fue reembolsado" }, 409);
  await db.prepare("UPDATE wallets SET dark = ROUND(dark + ?, 6), updated_at = ? WHERE user_id = ?")
    .bind(amount, now(), user.id).run();
  const row = await db.prepare("SELECT dark FROM wallets WHERE user_id = ?").bind(user.id).first<{dark:number}>();
  await db.prepare("UPDATE dark_moves SET balance_after = ? WHERE id = ?").bind(row?.dark ?? 0, refundMove.id).run();
  return json({ ok: true, dark: row?.dark ?? 0 });
};
const walletDarkUnlock: Route = async (request, db) => {
  const user = await currentUser(request, db);
  if (!user) return json({ error: "No autorizado" }, 401);
  const body = await readJson(request);
  const costs: Record<string,number> = {bt:5, ac:12, bm:7, de:30, dr:150, gc:10, cpl:40, cg:25};
  const shipId = String(body?.shipId ?? "");
  const cost = costs[shipId];
  if (!cost) return json({ error: "Desbloqueo no válido" }, 400);
  const existing = await db.prepare("SELECT ship_id FROM dm_ship_unlocks WHERE user_id = ? AND ship_id = ?")
    .bind(user.id, shipId).first();
  if (existing) {
    const row = await db.prepare("SELECT dark FROM wallets WHERE user_id = ?").bind(user.id).first<{dark:number}>();
    return json({ ok: true, dark: row?.dark ?? 0, unlocked: true });
  }
  await ensureWallet(db, user.id);
  const inserted = await db.prepare("INSERT OR IGNORE INTO dm_ship_unlocks (user_id, ship_id, unlocked_at) VALUES (?, ?, ?)")
    .bind(user.id, shipId, now()).run();
  if (!inserted.meta || !inserted.meta.changes) {
    const balance = await db.prepare("SELECT dark FROM wallets WHERE user_id = ?").bind(user.id).first<{dark:number}>();
    return json({ ok: true, dark: balance?.dark ?? 0, unlocked: true });
  }
  const upd = await db.prepare("UPDATE wallets SET dark = ROUND(dark - ?, 6), updated_at = ? WHERE user_id = ? AND dark >= ?")
    .bind(cost, now(), user.id, cost).run();
  const row = await db.prepare("SELECT dark FROM wallets WHERE user_id = ?").bind(user.id).first<{dark:number}>();
  if (!upd.meta || !upd.meta.changes) {
    await db.prepare("DELETE FROM dm_ship_unlocks WHERE user_id = ? AND ship_id = ?").bind(user.id, shipId).run();
    return json({ error: "Materia oscura insuficiente", dark: row?.dark ?? 0 }, 409);
  }
  await db.prepare("INSERT INTO dark_moves (user_id, delta, reason, balance_after, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(user.id, -cost, "Desbloqueo de nave · " + shipId, row?.dark ?? 0, now()).run();
  return json({ ok: true, dark: row?.dark ?? 0, unlocked: true });
};
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
  const balance = row?.dark ?? 0;
  await db.prepare("INSERT INTO dark_moves (user_id, delta, reason, balance_after, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(userId, amount, "Crédito de materia oscura", balance, now()).run();
  return balance;
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
  "POST /api/wallet/dark/spend": walletDarkSpend,
  "POST /api/wallet/dark/buy": walletDarkBuy,
  "POST /api/wallet/dark/refund": walletDarkRefund,
  "POST /api/wallet/dark/unlock": walletDarkUnlock,
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
