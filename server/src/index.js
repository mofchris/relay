// Relay API server.
//
// Endpoints:
//   POST /api/auth/signup   { email, password, name? }       -> { token, user }
//   POST /api/auth/login    { email, password }              -> { token, user }
//   POST /api/auth/demo                                       -> { token, user }
//   GET  /api/me            (auth)                            -> { user }
//   POST /api/serve         (auth) AdRequest                  -> DeliveryResponse
//   GET  /api/deliveries    (auth)                            -> SavedDeliveryRecord[]
//   GET  /api/deliveries/:id(auth)                            -> SavedDeliveryRecord
//   GET  /api/health                                         -> { ok: true }

import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { db, getCampaigns, insertDelivery, listDeliveries, getDelivery } from "./db.js";
import { serveAd } from "./auction.js";

const PORT = Number(process.env.PORT || 8787);
const JWT_SECRET = process.env.JWT_SECRET || "relay-dev-secret-change-me";
// Comma-separated allow-list, e.g. "https://mofchris.github.io,http://localhost:5173".
const ORIGINS = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const PLACEMENTS = new Set(["feed", "sidebar", "banner", "interstitial", "video"]);
const DEVICES = new Set(["mobile", "desktop", "tablet", "ctv"]);
const SEGMENTS = new Set(["tech", "fitness", "finance", "travel", "shopping", "gaming", "general"]);
const COUNTRIES = new Set(["US", "UK", "CA", "DE", "IN", "BR", "AU", "JP"]);

const app = express();
app.use(cors({ origin: ORIGINS }));
app.use(express.json());

// --- helpers ---------------------------------------------------------------

function fail(res, status, code, message) {
  return res.status(status).json({ detail: { code, message } });
}

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
}

function publicUser(u) {
  return { id: u.id, email: u.email, name: u.name ?? null };
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return fail(res, 401, "NO_TOKEN", "You must be signed in.");
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare("SELECT id, email, name FROM users WHERE id = ?").get(payload.id);
    if (!user) return fail(res, 401, "NO_USER", "Account not found.");
    req.user = user;
    next();
  } catch {
    return fail(res, 401, "BAD_TOKEN", "Your session has expired. Please sign in again.");
  }
}

const isEmail = (s) => typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

// --- auth ------------------------------------------------------------------

app.post("/api/auth/signup", (req, res) => {
  const { email, password, name } = req.body ?? {};
  if (!isEmail(email)) return fail(res, 400, "VALIDATION", "Enter a valid email address.");
  if (typeof password !== "string" || password.length < 6)
    return fail(res, 400, "VALIDATION", "Password must be at least 6 characters.");

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
  if (existing) return fail(res, 409, "EMAIL_TAKEN", "An account with that email already exists.");

  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare("INSERT INTO users (email, password_hash, name, created_at) VALUES (?, ?, ?, ?)")
    .run(email.toLowerCase(), hash, (name || "").trim() || null, new Date().toISOString());
  const user = { id: Number(info.lastInsertRowid), email: email.toLowerCase(), name: (name || "").trim() || null };
  return res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body ?? {};
  if (!isEmail(email) || typeof password !== "string")
    return fail(res, 400, "VALIDATION", "Enter your email and password.");

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return fail(res, 401, "BAD_CREDENTIALS", "Incorrect email or password.");

  return res.json({ token: signToken(user), user: publicUser(user) });
});

// One-click demo account (used by the social buttons in the UI).
app.post("/api/auth/demo", (_req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get("demo@relay.dev");
  if (!user) return fail(res, 500, "NO_DEMO", "Demo account is not seeded.");
  return res.json({ token: signToken(user), user: publicUser(user) });
});

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// --- serving ---------------------------------------------------------------

app.post("/api/serve", requireAuth, (req, res) => {
  const { placement, country, device, segment, interests } = req.body ?? {};
  if (!PLACEMENTS.has(placement) || !DEVICES.has(device) || !SEGMENTS.has(segment) || !COUNTRIES.has(country))
    return fail(res, 400, "VALIDATION", "Invalid ad request: check placement, device, country, and segment.");

  const request = { placement, country, device, segment, interests: typeof interests === "string" ? interests : "" };
  const requestId = randomUUID();
  const { decision, pipeline } = serveAd(request, getCampaigns(), requestId);
  insertDelivery(req.user.id, requestId, request, decision, pipeline);

  res.json({ request_id: requestId, status: decision.filled ? "filled" : "no_fill", decision, pipeline });
});

app.get("/api/deliveries", requireAuth, (req, res) => {
  res.json(listDeliveries(req.user.id, 50));
});

app.get("/api/deliveries/:id", requireAuth, (req, res) => {
  const record = getDelivery(req.user.id, req.params.id);
  if (!record) return fail(res, 404, "NOT_FOUND", "Delivery not found.");
  res.json(record);
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  if (JWT_SECRET === "relay-dev-secret-change-me") {
    console.warn("[relay] Using the default dev JWT secret. Set JWT_SECRET in production.");
  }
  console.log(`[relay] API listening on port ${PORT} (CORS origins: ${ORIGINS.join(", ")})`);
  console.log("[relay] Demo account: demo@relay.dev / demo1234");
});
