// Data access on Cloudflare D1. The interfaces below are the small slice of
// the D1 API this app uses, so the same code runs against a local SQLite shim
// in tests.

import type {
  AccountKind,
  AdRequest,
  AuctionResult,
  Campaign,
  Delivery,
  DeliveryTotals,
  User,
} from "../shared/contract.ts";

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { last_row_id: number; changes: number } }>;
}

export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
}

/** Guest sandboxes are deleted after this long. */
export const GUEST_TTL_HOURS = 72;
/** Shared demo-account history older than this is deleted. */
export const DEMO_HISTORY_DAYS = 7;
/** Each account keeps at most this many deliveries. */
export const MAX_DELIVERIES_PER_USER = 500;

interface UserRow {
  id: number;
  kind: AccountKind;
  email: string | null;
  name: string | null;
  password_hash: string | null;
}

interface CampaignRow {
  id: string;
  advertiser: string;
  headline: string;
  segment: Campaign["segment"];
  bid_cpm: number;
  base_ctr: number;
  geos: string;
}

interface DeliveryRow {
  id: string;
  created_at: string;
  request_json: string;
  auction_json: string;
  server_ms: number;
}

export const publicUser = (row: UserRow): User => ({ id: row.id, email: row.email, name: row.name, kind: row.kind });

export async function getCampaigns(db: D1Database): Promise<Campaign[]> {
  const { results } = await db.prepare("SELECT * FROM campaigns ORDER BY id").all<CampaignRow>();
  return results.map((row) => ({ ...row, geos: row.geos === "all" ? "all" : JSON.parse(row.geos) }));
}

export function findUserById(db: D1Database, id: number) {
  return db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<UserRow>();
}

export function findUserByEmail(db: D1Database, email: string) {
  return db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first<UserRow>();
}

export async function createUser(
  db: D1Database,
  fields: { kind: AccountKind; email: string | null; name: string | null; password_hash: string | null },
): Promise<UserRow> {
  const { meta } = await db
    .prepare("INSERT INTO users (kind, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(fields.kind, fields.email, fields.name, fields.password_hash, new Date().toISOString())
    .run();
  return { id: meta.last_row_id, ...fields };
}

/** Delete expired guest sandboxes and old shared-demo history. */
export async function pruneExpired(db: D1Database, now = Date.now()): Promise<void> {
  const guestCutoff = new Date(now - GUEST_TTL_HOURS * 3600_000).toISOString();
  const demoCutoff = new Date(now - DEMO_HISTORY_DAYS * 86400_000).toISOString();
  await db.batch([
    db
      .prepare(
        "DELETE FROM deliveries WHERE user_id IN (SELECT id FROM users WHERE kind = 'guest' AND created_at < ?)",
      )
      .bind(guestCutoff),
    db.prepare("DELETE FROM users WHERE kind = 'guest' AND created_at < ?").bind(guestCutoff),
    db
      .prepare(
        "DELETE FROM deliveries WHERE user_id IN (SELECT id FROM users WHERE kind = 'demo') AND created_at < ?",
      )
      .bind(demoCutoff),
  ]);
}

export async function insertDelivery(db: D1Database, userId: number, delivery: Delivery): Promise<void> {
  await db.batch([
    db
      .prepare(
        `INSERT INTO deliveries (id, user_id, request_json, auction_json, filled, clearing_price_cpm, server_ms, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        delivery.id,
        userId,
        JSON.stringify(delivery.request),
        JSON.stringify(delivery.auction),
        delivery.auction.filled ? 1 : 0,
        delivery.auction.clearing_price_cpm,
        delivery.server_ms,
        delivery.created_at,
      ),
    db
      .prepare(
        `DELETE FROM deliveries WHERE user_id = ? AND id NOT IN
           (SELECT id FROM deliveries WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?)`,
      )
      .bind(userId, userId, MAX_DELIVERIES_PER_USER),
  ]);
}

const toDelivery = (row: DeliveryRow): Delivery => ({
  id: row.id,
  created_at: row.created_at,
  request: JSON.parse(row.request_json) as AdRequest,
  auction: JSON.parse(row.auction_json) as AuctionResult,
  server_ms: row.server_ms,
});

export async function listDeliveries(db: D1Database, userId: number, limit: number): Promise<Delivery[]> {
  const { results } = await db
    .prepare("SELECT * FROM deliveries WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?")
    .bind(userId, limit)
    .all<DeliveryRow>();
  return results.map(toDelivery);
}

export async function getDelivery(db: D1Database, userId: number, id: string): Promise<Delivery | null> {
  const row = await db
    .prepare("SELECT * FROM deliveries WHERE user_id = ? AND id = ?")
    .bind(userId, id)
    .first<DeliveryRow>();
  return row ? toDelivery(row) : null;
}

export async function getTotals(db: D1Database, userId: number): Promise<DeliveryTotals> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS count,
              COALESCE(SUM(filled), 0) AS filled,
              COALESCE(SUM(clearing_price_cpm), 0) / 1000.0 AS spend,
              AVG(server_ms) AS avg_server_ms
         FROM deliveries WHERE user_id = ?`,
    )
    .bind(userId)
    .first<DeliveryTotals>();
  return row ?? { count: 0, filled: 0, spend: 0, avg_server_ms: null };
}
