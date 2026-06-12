// SQLite persistence using Node's built-in driver (no native dependency).
// Creates the schema on first run and seeds the campaign catalog, a demo
// account, and some backdated delivery history so analytics look alive.

import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { serveAd } from "./auction.js";

const here = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || join(here, "..", "relay.db");

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name          TEXT,
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id         TEXT PRIMARY KEY,
    advertiser TEXT NOT NULL,
    headline   TEXT NOT NULL,
    segment    TEXT NOT NULL,
    base_cpm   REAL NOT NULL,
    base_ctr   REAL NOT NULL,
    geos       TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS deliveries (
    id            TEXT PRIMARY KEY,
    user_id       INTEGER NOT NULL,
    request_json  TEXT NOT NULL,
    decision_json TEXT NOT NULL,
    pipeline_json TEXT NOT NULL,
    created_at    TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_deliveries_user ON deliveries(user_id, created_at DESC);
`);

const SEED_CAMPAIGNS = [
  { id: "cmp_nova", advertiser: "Nova Cloud", headline: "Ship serverless in one command", segment: "tech", base_cpm: 4.2, base_ctr: 0.024, geos: "all" },
  { id: "cmp_helix", advertiser: "Helix Gaming", headline: "Play the open beta tonight", segment: "gaming", base_cpm: 3.8, base_ctr: 0.041, geos: "all" },
  { id: "cmp_lumen", advertiser: "Lumen Finance", headline: "0% APR for your first 18 months", segment: "finance", base_cpm: 6.8, base_ctr: 0.011, geos: ["US", "UK", "CA"] },
  { id: "cmp_pulse", advertiser: "PulseFit", headline: "Your AI running coach, free for 30 days", segment: "fitness", base_cpm: 3.1, base_ctr: 0.018, geos: "all" },
  { id: "cmp_drift", advertiser: "Drift Travel", headline: "Last-minute escapes, up to 40% off", segment: "travel", base_cpm: 2.9, base_ctr: 0.02, geos: "all" },
  { id: "cmp_bytemart", advertiser: "Bytemart", headline: "Black Friday came early — shop now", segment: "shopping", base_cpm: 5.5, base_ctr: 0.032, geos: ["US", "UK", "CA", "DE", "AU", "BR", "IN"] },
];

/** All campaigns, with geos parsed back to "all" | string[]. */
export function getCampaigns() {
  return db.prepare("SELECT * FROM campaigns").all().map((c) => ({
    ...c,
    geos: c.geos === "all" ? "all" : JSON.parse(c.geos),
  }));
}

export function insertDelivery(userId, requestId, request, decision, pipeline, createdAt = new Date().toISOString()) {
  db.prepare(
    `INSERT INTO deliveries (id, user_id, request_json, decision_json, pipeline_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(requestId, userId, JSON.stringify(request), JSON.stringify(decision), JSON.stringify(pipeline), createdAt);
}

/** Map a delivery row to the SavedDeliveryRecord shape the frontend expects. */
export function rowToRecord(row) {
  return {
    id: row.id,
    created_at: row.created_at,
    request: JSON.parse(row.request_json),
    decision: JSON.parse(row.decision_json),
    pipeline: JSON.parse(row.pipeline_json),
  };
}

export function listDeliveries(userId, limit = 50) {
  return db
    .prepare("SELECT * FROM deliveries WHERE user_id = ? ORDER BY created_at DESC LIMIT ?")
    .all(userId, limit)
    .map(rowToRecord);
}

export function getDelivery(userId, id) {
  const row = db.prepare("SELECT * FROM deliveries WHERE user_id = ? AND id = ?").get(userId, id);
  return row ? rowToRecord(row) : null;
}

// ---------------------------------------------------------------------------
// Seeding (runs once, on an empty database)
// ---------------------------------------------------------------------------

function seedCampaigns() {
  const count = db.prepare("SELECT COUNT(*) AS c FROM campaigns").get().c;
  if (count > 0) return;
  const stmt = db.prepare(
    "INSERT INTO campaigns (id, advertiser, headline, segment, base_cpm, base_ctr, geos) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  for (const c of SEED_CAMPAIGNS) {
    stmt.run(c.id, c.advertiser, c.headline, c.segment, c.base_cpm, c.base_ctr, c.geos === "all" ? "all" : JSON.stringify(c.geos));
  }
}

function seedDemoUser() {
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get("demo@relay.dev");
  if (existing) return existing.id;
  const hash = bcrypt.hashSync("demo1234", 10);
  const info = db
    .prepare("INSERT INTO users (email, password_hash, name, created_at) VALUES (?, ?, ?, ?)")
    .run("demo@relay.dev", hash, "Demo User", new Date().toISOString());
  return Number(info.lastInsertRowid);
}

function seedDemoHistory(userId) {
  const count = db.prepare("SELECT COUNT(*) AS c FROM deliveries WHERE user_id = ?").get(userId).c;
  if (count > 0) return;
  const campaigns = getCampaigns();
  const placements = ["feed", "sidebar", "banner", "interstitial", "video"];
  const devices = ["mobile", "desktop", "tablet", "ctv"];
  const segments = ["tech", "fitness", "finance", "travel", "shopping", "gaming", "general"];
  const countries = ["US", "UK", "CA", "DE", "IN", "BR", "AU", "JP"];
  const pick = (arr, i) => arr[i % arr.length];

  for (let i = 0; i < 14; i++) {
    const request = {
      placement: pick(placements, i * 3 + 1),
      device: pick(devices, i * 2),
      country: pick(countries, i * 5 + 2),
      segment: pick(segments, i),
      interests: "",
    };
    const requestId = randomUUID();
    const { decision, pipeline } = serveAd(request, campaigns, requestId);
    // Backdate over roughly the last few hours.
    const createdAt = new Date(Date.now() - (i + 1) * 11 * 60 * 1000).toISOString();
    insertDelivery(userId, requestId, request, decision, pipeline, createdAt);
  }
}

seedCampaigns();
const demoId = seedDemoUser();
seedDemoHistory(demoId);
