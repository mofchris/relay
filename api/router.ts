// HTTP API for Relay. Runs as a Cloudflare Pages Function (see
// functions/api/[[route]].ts) and is called directly by the tests.

import { runAuction } from "./auction.ts";
import { hashPassword, signToken, verifyPassword, verifyToken } from "./crypto.ts";
import {
  createUser,
  findUserByEmail,
  findUserById,
  getCampaigns,
  getDelivery,
  getTotals,
  insertDelivery,
  listDeliveries,
  pruneExpired,
  publicUser,
} from "./db.ts";
import type { D1Database } from "./db.ts";
import {
  COUNTRIES,
  DEVICES,
  INTERESTS_MAX_LENGTH,
  PLACEMENTS,
  SEGMENTS,
} from "../shared/contract.ts";
import type {
  AdRequest,
  AuthResponse,
  DeliveriesPage,
  Delivery,
  PreviewResponse,
  User,
} from "../shared/contract.ts";

export interface Env {
  DB: D1Database;
  JWT_SECRET?: string;
}

const MEMBER_TOKEN_TTL = 7 * 24 * 3600;
const GUEST_TOKEN_TTL = 72 * 3600;
const HISTORY_LIMIT = 50;
const MAX_BODY_BYTES = 4096;

class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const isOneOf = <T extends string>(list: readonly T[], value: unknown): value is T =>
  typeof value === "string" && (list as readonly string[]).includes(value);

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, "TOO_LARGE", "Request body is too large.");
  if (!text) return {};
  try {
    const value = JSON.parse(text);
    return value && typeof value === "object" ? value : {};
  } catch {
    throw new HttpError(400, "BAD_JSON", "Request body must be JSON.");
  }
}

function secretOf(env: Env): string {
  if (!env.JWT_SECRET) throw new HttpError(500, "MISCONFIGURED", "The server has no JWT_SECRET configured.");
  return env.JWT_SECRET;
}

async function issue(env: Env, user: User): Promise<AuthResponse> {
  const ttl = user.kind === "guest" ? GUEST_TOKEN_TTL : MEMBER_TOKEN_TTL;
  return { token: await signToken(user.id, secretOf(env), ttl), user };
}

async function requireUser(request: Request, env: Env): Promise<User> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new HttpError(401, "SIGNED_OUT", "Sign in to use the console.");
  const claims = await verifyToken(token, secretOf(env));
  if (!claims) throw new HttpError(401, "SESSION_EXPIRED", "Your session has expired. Sign in again.");
  const row = await findUserById(env.DB, claims.sub);
  if (!row) throw new HttpError(401, "SESSION_EXPIRED", "This session no longer exists. Sign in again.");
  return publicUser(row);
}

const isEmail = (value: unknown): value is string =>
  typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/** Validate an ad request body. */
function parseAdRequest(body: Record<string, unknown>): AdRequest {
  const { placement, device, country, segment } = body;
  const interests = typeof body.interests === "string" ? body.interests.trim() : "";
  if (!isOneOf(PLACEMENTS, placement)) throw new HttpError(400, "VALIDATION", "Choose a placement.");
  if (!isOneOf(DEVICES, device)) throw new HttpError(400, "VALIDATION", "Choose a device.");
  if (!isOneOf(COUNTRIES, country)) throw new HttpError(400, "VALIDATION", "Choose a country.");
  if (!isOneOf(SEGMENTS, segment)) throw new HttpError(400, "VALIDATION", "Choose an audience segment.");
  if (interests.length > INTERESTS_MAX_LENGTH)
    throw new HttpError(400, "VALIDATION", `Keep interests under ${INTERESTS_MAX_LENGTH} characters.`);
  return { placement, device, country, segment, interests };
}

// --- routes --------------------------------------------------------------------

async function guest(env: Env) {
  await pruneExpired(env.DB);
  const row = await createUser(env.DB, { kind: "guest", email: null, name: null, password_hash: null });
  return json(await issue(env, publicUser(row)), 201);
}

async function signup(request: Request, env: Env) {
  const body = await readBody(request);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = body.password;
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 60) || null : null;
  if (!isEmail(email)) throw new HttpError(400, "VALIDATION", "Enter a valid email address.");
  if (typeof password !== "string" || password.length < 8 || password.length > 200)
    throw new HttpError(400, "VALIDATION", "Use a password of at least 8 characters.");
  if (await findUserByEmail(env.DB, email))
    throw new HttpError(409, "EMAIL_TAKEN", "That email already has an account. Sign in instead.");
  const row = await createUser(env.DB, {
    kind: "member",
    email,
    name,
    password_hash: await hashPassword(password),
  });
  return json(await issue(env, publicUser(row)), 201);
}

async function login(request: Request, env: Env) {
  const body = await readBody(request);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!isEmail(email) || !password) throw new HttpError(400, "VALIDATION", "Enter your email and password.");
  const row = await findUserByEmail(env.DB, email);
  if (!row || !(await verifyPassword(password, row.password_hash)))
    throw new HttpError(401, "BAD_CREDENTIALS", "That email and password do not match.");
  return json(await issue(env, publicUser(row)));
}

async function preview(url: URL, env: Env) {
  const base = parseAdRequest({
    placement: url.searchParams.get("placement") ?? "feed",
    device: url.searchParams.get("device") ?? "mobile",
    country: url.searchParams.get("country") ?? "US",
    segment: "general",
  });
  const campaigns = await getCampaigns(env.DB);
  const body: PreviewResponse = {
    request: { placement: base.placement, device: base.device, country: base.country },
    results: SEGMENTS.map((segment) => ({ segment, auction: runAuction({ ...base, segment }, campaigns) })),
  };
  return json(body);
}

async function serve(request: Request, env: Env, startedAt: number) {
  const user = await requireUser(request, env);
  const adRequest = parseAdRequest(await readBody(request));
  const auction = runAuction(adRequest, await getCampaigns(env.DB));
  const delivery: Delivery = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    request: adRequest,
    auction,
    server_ms: Date.now() - startedAt,
  };
  await insertDelivery(env.DB, user.id, delivery);
  return json(delivery, 201);
}

async function history(request: Request, env: Env) {
  const user = await requireUser(request, env);
  const [deliveries, totals] = await Promise.all([
    listDeliveries(env.DB, user.id, HISTORY_LIMIT),
    getTotals(env.DB, user.id),
  ]);
  const body: DeliveriesPage = { deliveries, totals };
  return json(body);
}

async function oneDelivery(request: Request, env: Env, id: string) {
  const user = await requireUser(request, env);
  const delivery = await getDelivery(env.DB, user.id, id);
  if (!delivery) throw new HttpError(404, "NOT_FOUND", "No delivery with that id in this account.");
  return json(delivery);
}

/** Route an /api request. Anything else is a 404. */
export async function handle(request: Request, env: Env): Promise<Response> {
  const startedAt = Date.now();
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "");
  const method = request.method;
  const route = `${method} ${path}`;

  try {
    if (route === "GET /api/health") return json({ ok: true });
    if (route === "POST /api/auth/guest") return await guest(env);
    if (route === "POST /api/auth/signup") return await signup(request, env);
    if (route === "POST /api/auth/login") return await login(request, env);
    if (route === "GET /api/me") return json({ user: await requireUser(request, env) });
    if (route === "GET /api/campaigns") return json({ campaigns: await getCampaigns(env.DB) });
    if (route === "GET /api/auction/preview") return await preview(url, env);
    if (route === "POST /api/deliveries") return await serve(request, env, startedAt);
    if (route === "GET /api/deliveries") return await history(request, env);
    const match = path.match(/^\/api\/deliveries\/([\w-]{1,64})$/);
    if (match && method === "GET") return await oneDelivery(request, env, match[1]);
    throw new HttpError(404, "NOT_FOUND", `No route for ${method} ${path}.`);
  } catch (error) {
    if (error instanceof HttpError) return json({ error: { code: error.code, message: error.message } }, error.status);
    console.error(error);
    return json({ error: { code: "SERVER_ERROR", message: "Something went wrong on the server." } }, 500);
  }
}
