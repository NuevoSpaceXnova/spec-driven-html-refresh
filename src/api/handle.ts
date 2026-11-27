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
export const SECTIONS = ["retiros", "trazabilidad", "saldos", "precio", "temporadas", "pruebas"];

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

const ROUTES: Record<string, Route> = {
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
