import { test } from "node:test";
import assert from "node:assert/strict";
import { FLOOR_CPM, runAuction } from "../api/auction.ts";
import { COUNTRIES, DEVICES, PLACEMENTS, SEGMENTS } from "../shared/contract.ts";
import type { AdRequest, Campaign } from "../shared/contract.ts";

// Same catalog as migrations/0001_init.sql.
const CAMPAIGNS: Campaign[] = [
  { id: "cmp_nova", advertiser: "Nova Cloud", headline: "", segment: "tech", bid_cpm: 4.2, base_ctr: 0.024, geos: "all" },
  { id: "cmp_helix", advertiser: "Helix Gaming", headline: "", segment: "gaming", bid_cpm: 3.8, base_ctr: 0.041, geos: "all" },
  { id: "cmp_lumen", advertiser: "Lumen Finance", headline: "", segment: "finance", bid_cpm: 6.8, base_ctr: 0.011, geos: ["US", "UK", "CA"] },
  { id: "cmp_pulse", advertiser: "PulseFit", headline: "", segment: "fitness", bid_cpm: 3.1, base_ctr: 0.018, geos: "all" },
  { id: "cmp_drift", advertiser: "Drift Travel", headline: "", segment: "travel", bid_cpm: 2.9, base_ctr: 0.02, geos: "all" },
  { id: "cmp_bytemart", advertiser: "Bytemart", headline: "", segment: "shopping", bid_cpm: 5.5, base_ctr: 0.032, geos: ["US", "UK", "CA", "DE", "AU", "BR", "IN"] },
];

const request = (overrides: Partial<AdRequest> = {}): AdRequest => ({
  placement: "feed",
  device: "mobile",
  country: "US",
  segment: "gaming",
  interests: "",
  ...overrides,
});

test("the segment's own campaign wins and pays just enough to beat the runner-up", () => {
  const result = runAuction(request(), CAMPAIGNS);
  assert.equal(result.filled, true);
  assert.equal(result.winner_id, "cmp_helix");
  assert.equal(result.runner_up_id, "cmp_lumen");
  assert.equal(result.price_basis, "runner_up");

  // Helix: relevance 1.6 × 1.1 × 1.2 = 2.112. Lumen (broad): 6.80 × 0.726 = 4.9368.
  // Helix must bid at least 4.9368 / 2.112 = 2.3375, plus a cent, rounded: $2.35.
  assert.equal(result.clearing_price_cpm, 2.35);
  const helix = result.bidders.find((b) => b.campaign_id === "cmp_helix")!;
  assert.equal(helix.status, "won");
  assert.equal(helix.match, "segment");
  assert.ok(Math.abs(helix.relevance - 2.112) < 1e-9);
});

test("a campaign that does not buy the country is excluded, and someone else wins", () => {
  const us = runAuction(request({ segment: "finance", country: "US" }), CAMPAIGNS);
  assert.equal(us.winner_id, "cmp_lumen");

  const jp = runAuction(request({ segment: "finance", country: "JP" }), CAMPAIGNS);
  const lumen = jp.bidders.find((b) => b.campaign_id === "cmp_lumen")!;
  assert.equal(lumen.status, "geo_excluded");
  assert.notEqual(jp.winner_id, "cmp_lumen");
  // Excluded campaigns are listed after every competitor.
  assert.equal(jp.bidders.at(-1)!.status, "geo_excluded");
});

test("interest keywords give a campaign an interest match", () => {
  const plain = runAuction(request({ segment: "tech" }), CAMPAIGNS);
  const withInterest = runAuction(request({ segment: "tech", interests: "Esports, streaming" }), CAMPAIGNS);
  const helixPlain = plain.bidders.find((b) => b.campaign_id === "cmp_helix")!;
  const helixInterest = withInterest.bidders.find((b) => b.campaign_id === "cmp_helix")!;
  assert.equal(helixPlain.match, "broad");
  assert.equal(helixInterest.match, "interest");
  assert.ok(helixInterest.score > helixPlain.score);
});

test("a lone bidder pays the lowest bid that clears the floor", () => {
  const result = runAuction(request(), [CAMPAIGNS[1]]);
  assert.equal(result.price_basis, "floor");
  assert.equal(result.runner_up_id, null);
  // 0.50 / 2.112 = 0.2367, plus a cent: $0.25.
  assert.equal(result.clearing_price_cpm, 0.25);
});

test("nothing wins when every score is under the floor", () => {
  const weak: Campaign = { ...CAMPAIGNS[0], id: "cmp_weak", bid_cpm: 0.6 };
  const result = runAuction(request({ segment: "gaming", placement: "banner" }), [weak]);
  assert.equal(result.filled, false);
  assert.equal(result.winner_id, null);
  assert.equal(result.clearing_price_cpm, 0);
  assert.equal(result.price_basis, "none");
  assert.equal(result.bidders[0].status, "below_floor");
});

test("ties on score are broken by campaign id, so results are stable", () => {
  const a: Campaign = { ...CAMPAIGNS[0], id: "cmp_a" };
  const b: Campaign = { ...CAMPAIGNS[0], id: "cmp_b" };
  const result = runAuction(request({ segment: "tech" }), [b, a]);
  assert.equal(result.winner_id, "cmp_a");
  // Equal scores: the winner pays its full bid, never more.
  assert.equal(result.clearing_price_cpm, a.bid_cpm);
});

test("pricing invariants hold for every possible request", () => {
  for (const placement of PLACEMENTS)
    for (const device of DEVICES)
      for (const country of COUNTRIES)
        for (const segment of SEGMENTS) {
          const r = request({ placement, device, country, segment });
          const result = runAuction(r, CAMPAIGNS);
          assert.deepEqual(runAuction(r, CAMPAIGNS), result, "deterministic");
          assert.equal(result.bidders.length, CAMPAIGNS.length);

          const competing = result.bidders.filter((b) => b.status !== "geo_excluded" && b.status !== "below_floor");
          if (!result.filled) {
            assert.equal(competing.length, 0);
            continue;
          }
          const winner = result.bidders.find((b) => b.campaign_id === result.winner_id)!;
          assert.equal(winner, competing[0]);
          assert.ok(competing.every((b) => b.score <= winner.score), "winner has the top score");

          // Never pays more than it bid, or less than the floor.
          assert.ok(result.clearing_price_cpm <= winner.bid_cpm);
          assert.ok(result.clearing_price_cpm * winner.relevance >= FLOOR_CPM);

          // At the price it pays, the winner still beats the runner-up.
          const runnerUp = result.bidders.find((b) => b.campaign_id === result.runner_up_id);
          if (runnerUp) assert.ok(result.clearing_price_cpm * winner.relevance >= runnerUp.score - 1e-9);
        }
});
