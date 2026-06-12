// Deterministic, offline ad-decisioning engine.
//
// When no backend is connected (VITE_API_URL unset) the console runs in demo
// mode and uses this engine instead of a real serving service. It models the
// core of a real-time ad exchange: filter eligible campaigns, score them by
// expected value (eCPM = bid x predicted CTR), run a second-price auction, and
// return a decision plus the pipeline side-effects. Pure & deterministic — the
// same request always yields the same decision, which keeps the demo stable.

import type {
  AdRequest,
  Country,
  DeliveryDecision,
  Device,
  Placement,
  Segment,
} from "./types";
import { PLACEMENT_LABELS, SEGMENT_LABELS } from "./types";

interface Campaign {
  id: string;
  advertiser: string;
  headline: string;
  segment: Segment;
  /** Base bid in CPM (USD). */
  base_cpm: number;
  /** Base predicted CTR (0..1) before contextual adjustment. */
  base_ctr: number;
  /** Countries the campaign is eligible in ("all" = no geo restriction). */
  geos: Country[] | "all";
}

/** The advertiser catalog the demo auction draws from. */
const CAMPAIGNS: Campaign[] = [
  { id: "cmp_nova", advertiser: "Nova Cloud", headline: "Ship serverless in one command", segment: "tech", base_cpm: 4.2, base_ctr: 0.024, geos: "all" },
  { id: "cmp_helix", advertiser: "Helix Gaming", headline: "Play the open beta tonight", segment: "gaming", base_cpm: 3.8, base_ctr: 0.041, geos: "all" },
  { id: "cmp_lumen", advertiser: "Lumen Finance", headline: "0% APR for your first 18 months", segment: "finance", base_cpm: 6.8, base_ctr: 0.011, geos: ["US", "UK", "CA"] },
  { id: "cmp_pulse", advertiser: "PulseFit", headline: "Your AI running coach, free for 30 days", segment: "fitness", base_cpm: 3.1, base_ctr: 0.018, geos: "all" },
  { id: "cmp_drift", advertiser: "Drift Travel", headline: "Last-minute escapes, up to 40% off", segment: "travel", base_cpm: 2.9, base_ctr: 0.02, geos: "all" },
  { id: "cmp_bytemart", advertiser: "Bytemart", headline: "Black Friday came early — shop now", segment: "shopping", base_cpm: 5.5, base_ctr: 0.032, geos: ["US", "UK", "CA", "DE", "AU", "BR", "IN"] },
];

/** Minimum eCPM (USD) a bid must clear to win; below this we serve a house ad. */
const FLOOR_CPM = 0.5;

const DEVICE_FACTOR: Record<Device, number> = {
  mobile: 1.1,
  desktop: 1.0,
  tablet: 0.95,
  ctv: 1.2,
};

const PLACEMENT_FACTOR: Record<Placement, number> = {
  feed: 1.2,
  video: 1.3,
  interstitial: 1.15,
  sidebar: 0.9,
  banner: 0.8,
};

/** Stable 32-bit hash of a string — used to derive deterministic "jitter". */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function geoEligible(campaign: Campaign, country: Country): boolean {
  return campaign.geos === "all" || campaign.geos.includes(country);
}

interface ScoredCandidate {
  campaign: Campaign;
  effective_ctr: number;
  ecpm: number;
  segment_match: boolean;
}

function score(campaign: Campaign, request: AdRequest): ScoredCandidate {
  const segmentMatch = campaign.segment === request.segment;
  // Interest free-text can reinforce or create a soft segment match.
  const interestHit = request.interests
    ? request.interests.toLowerCase().includes(campaign.segment)
    : false;
  const segmentBoost = segmentMatch ? 1.6 : interestHit ? 1.25 : 0.55;
  const effectiveCtr = clamp(
    campaign.base_ctr * segmentBoost * DEVICE_FACTOR[request.device] * PLACEMENT_FACTOR[request.placement],
    0.0005,
    0.5,
  );
  const ecpm = campaign.base_cpm * (effectiveCtr / campaign.base_ctr);
  return { campaign, effective_ctr: effectiveCtr, ecpm, segment_match: segmentMatch || interestHit };
}

/**
 * Run the demo auction for a single ad request and return a DeliveryDecision.
 * Pure function: deterministic in `request`.
 */
export function mockServe(request: AdRequest, requestId: string): DeliveryDecision {
  const eligible = CAMPAIGNS.filter((c) => geoEligible(c, request.country));
  const candidates = eligible
    .map((c) => score(c, request))
    .filter((c) => c.ecpm >= FLOOR_CPM)
    .sort((a, b) => b.ecpm - a.ecpm);

  const seed = hash(`${requestId}:${request.placement}:${request.device}:${request.country}`);
  const latency = 4 + (seed % 6); // 4–9 ms

  if (candidates.length === 0) {
    return {
      request_id: requestId,
      filled: false,
      campaign_id: null,
      advertiser: "Relay House",
      headline: "Your ad could be here",
      bid_cpm: 0,
      clearing_price_cpm: 0,
      predicted_ctr: 0,
      latency_ms: latency,
      segment_match: false,
      candidates_considered: eligible.length,
      reasons: [
        `No eligible campaign cleared the $${FLOOR_CPM.toFixed(2)} CPM floor for ${request.country} / ${SEGMENT_LABELS[request.segment]}.`,
        "Served a house ad as fallback to avoid an empty slot.",
      ],
    };
  }

  const winner = candidates[0];
  const runnerUp = candidates[1];
  // Second-price auction: winner pays just enough (in eCPM terms) to beat the
  // runner-up, expressed back as a CPM, capped at their own bid.
  const clearing = runnerUp
    ? Math.min(winner.campaign.base_cpm, round2((runnerUp.ecpm / winner.effective_ctr) * winner.campaign.base_ctr + 0.01))
    : FLOOR_CPM;

  const reasons: string[] = [];
  if (winner.segment_match) {
    reasons.push(`Matched the ${SEGMENT_LABELS[request.segment]} segment — ${winner.campaign.advertiser} bids strongest here.`);
  } else {
    reasons.push(`No exact segment match; ${winner.campaign.advertiser} won on broad reach + bid.`);
  }
  reasons.push(`Won a ${candidates.length}-way auction at $${clearing.toFixed(2)} clearing CPM (bid $${winner.campaign.base_cpm.toFixed(2)}).`);
  reasons.push(`${PLACEMENT_LABELS[request.placement]} on ${request.device} lifts predicted CTR to ${(winner.effective_ctr * 100).toFixed(2)}%.`);
  reasons.push(`Decision returned from the Redis-backed edge in ${latency} ms.`);

  return {
    request_id: requestId,
    filled: true,
    campaign_id: winner.campaign.id,
    advertiser: winner.campaign.advertiser,
    headline: winner.campaign.headline,
    bid_cpm: round2(winner.campaign.base_cpm),
    clearing_price_cpm: clearing,
    predicted_ctr: winner.effective_ctr,
    latency_ms: latency,
    segment_match: winner.segment_match,
    candidates_considered: candidates.length,
    reasons,
  };
}

/** Deterministic pipeline side-effects for a delivery (cache hit ~70%). */
export function mockPipeline(requestId: string) {
  const h = hash(requestId);
  return {
    redis_cached: h % 10 < 7,
    kafka_streamed: true,
    bigquery_logged: true,
  };
}
