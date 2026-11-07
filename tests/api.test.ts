import { test } from "node:test";
import assert from "node:assert/strict";
import { handle } from "../api/router.ts";
import type { Env } from "../api/router.ts";
import { pruneExpired, GUEST_TTL_HOURS } from "../api/db.ts";
import { createTestDb } from "./d1-shim.ts";
import type { AuthResponse, DeliveriesPage, Delivery, PreviewResponse } from "../shared/contract.ts";

function setup() {
  const env: Env = { DB: createTestDb(), JWT_SECRET: "test-secret" };
  const call = async (method: string, path: string, opts: { body?: unknown; token?: string } = {}) => {
    const headers: Record<string, string> = {};
    if (opts.body !== undefined) headers["content-type"] = "application/json";
    if (opts.token) headers.authorization = `Bearer ${opts.token}`;
    const res = await handle(
      new Request(`https://relay.test${path}`, {
        method,
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      }),
      env,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tests inspect arbitrary JSON bodies
    return { status: res.status, body: (await res.json()) as any };
  };
  return { env, call };
}

const AD = { placement: "feed", device: "mobile", country: "US", segment: "gaming", interests: "" };

test("a guest can run an auction, and it is recorded in their history", async () => {
  const { call } = setup();
  const guest = await call("POST", "/api/auth/guest");
  assert.equal(guest.status, 201);
  const { token, user } = guest.body as AuthResponse;
  assert.equal(user.kind, "guest");

  const empty = await call("GET", "/api/deliveries", { token });
  assert.deepEqual((empty.body as DeliveriesPage).totals, { count: 0, filled: 0, spend: 0, avg_server_ms: null });

  const served = await call("POST", "/api/deliveries", { token, body: AD });
  assert.equal(served.status, 201);
  const delivery = served.body as Delivery;
  assert.equal(delivery.auction.winner_id, "cmp_helix");
  assert.equal(delivery.auction.clearing_price_cpm, 2.35);
  assert.ok(delivery.server_ms >= 0);

  const page = (await call("GET", "/api/deliveries", { token })).body as DeliveriesPage;
  assert.equal(page.deliveries.length, 1);
  assert.equal(page.deliveries[0].id, delivery.id);
  assert.equal(page.totals.count, 1);
  assert.equal(page.totals.filled, 1);
  assert.ok(Math.abs(page.totals.spend - 0.00235) < 1e-12);

  const one = await call("GET", `/api/deliveries/${delivery.id}`, { token });
  assert.deepEqual(one.body, delivery);
});

test("accounts cannot see each other's deliveries", async () => {
  const { call } = setup();
  const a = (await call("POST", "/api/auth/guest")).body as AuthResponse;
  const b = (await call("POST", "/api/auth/guest")).body as AuthResponse;
  const delivery = (await call("POST", "/api/deliveries", { token: a.token, body: AD })).body as Delivery;
  const res = await call("GET", `/api/deliveries/${delivery.id}`, { token: b.token });
  assert.equal(res.status, 404);
  const page = (await call("GET", "/api/deliveries", { token: b.token })).body as DeliveriesPage;
  assert.equal(page.deliveries.length, 0);
});

test("protected routes reject missing and forged tokens", async () => {
  const { call } = setup();
  assert.equal((await call("GET", "/api/deliveries")).status, 401);
  assert.equal((await call("POST", "/api/deliveries", { body: AD })).status, 401);
  const forged = await call("GET", "/api/me", { token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjF9.bad" });
  assert.equal(forged.status, 401);
  assert.equal(forged.body.error.code, "SESSION_EXPIRED");
});

test("ad requests are validated", async () => {
  const { call } = setup();
  const { token } = (await call("POST", "/api/auth/guest")).body as AuthResponse;
  const bad = await call("POST", "/api/deliveries", { token, body: { ...AD, country: "FR" } });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error.code, "VALIDATION");
  const long = await call("POST", "/api/deliveries", { token, body: { ...AD, interests: "x".repeat(121) } });
  assert.equal(long.status, 400);
});

test("sign up, sign in, and the shared demo account", async () => {
  const { call } = setup();
  const created = await call("POST", "/api/auth/signup", {
    body: { email: "Ada@Example.com", password: "correct horse", name: "Ada" },
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.user.email, "ada@example.com");
  assert.equal(created.body.user.kind, "member");

  const dup = await call("POST", "/api/auth/signup", { body: { email: "ada@example.com", password: "another one" } });
  assert.equal(dup.status, 409);

  const short = await call("POST", "/api/auth/signup", { body: { email: "b@example.com", password: "short" } });
  assert.equal(short.status, 400);

  const wrong = await call("POST", "/api/auth/login", { body: { email: "ada@example.com", password: "wrong pass" } });
  assert.equal(wrong.status, 401);

  const ok = await call("POST", "/api/auth/login", { body: { email: "ada@example.com", password: "correct horse" } });
  assert.equal(ok.status, 200);
  const me = await call("GET", "/api/me", { token: ok.body.token });
  assert.equal(me.body.user.name, "Ada");

  const demo = await call("POST", "/api/auth/login", { body: { email: "demo@relay.dev", password: "demo1234" } });
  assert.equal(demo.status, 200);
  assert.equal(demo.body.user.kind, "demo");
});

test("the public preview runs one auction per segment and records nothing", async () => {
  const { call, env } = setup();
  const res = await call("GET", "/api/auction/preview?placement=video&device=ctv&country=JP");
  assert.equal(res.status, 200);
  const body = res.body as PreviewResponse;
  assert.deepEqual(body.request, { placement: "video", device: "ctv", country: "JP" });
  assert.equal(body.results.length, 7);
  const finance = body.results.find((r) => r.segment === "finance")!;
  assert.equal(finance.auction.bidders.find((b) => b.campaign_id === "cmp_lumen")!.status, "geo_excluded");
  const rows = await env.DB.prepare("SELECT COUNT(*) AS n FROM deliveries").first<{ n: number }>();
  assert.equal(rows!.n, 0);
  assert.equal((await call("GET", "/api/auction/preview?country=XX")).status, 400);
});

test("expired guest sandboxes are pruned with their history", async () => {
  const { call, env } = setup();
  const { token, user } = (await call("POST", "/api/auth/guest")).body as AuthResponse;
  await call("POST", "/api/deliveries", { token, body: AD });
  await pruneExpired(env.DB, Date.now() + (GUEST_TTL_HOURS + 1) * 3600_000);
  assert.equal(await env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(user.id).first(), null);
  const left = await env.DB.prepare("SELECT COUNT(*) AS n FROM deliveries").first<{ n: number }>();
  assert.equal(left!.n, 0);
});

test("unknown routes and bad JSON get clear errors", async () => {
  const { call, env } = setup();
  assert.equal((await call("GET", "/api/nope")).status, 404);
  const res = await handle(
    new Request("https://relay.test/api/auth/login", { method: "POST", body: "{not json" }),
    env,
  );
  assert.equal(res.status, 400);
});
