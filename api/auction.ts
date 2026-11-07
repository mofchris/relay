// The ad auction. Pure and deterministic: the same request against the same
// campaigns always produces the same result, which is what makes every
// decision explainable and testable.
//
// 1. Filter: campaigns that do not buy the request's country sit out.
// 2. Score: each campaign's bid is weighted by how well the slot suits it
//    (relevance = predicted CTR ÷ the campaign's normal CTR).
// 3. Rank: highest score wins. A score under the floor cannot win.
// 4. Price: the winner pays the lowest bid that would still have beaten the
//    runner-up's score (or the floor, with no runner-up), plus one cent, and
//    never more than its own bid. This is a generalised second-price auction.

import { INTEREST_KEYWORDS } from "../shared/contract.ts";
import type {
  AdRequest,
  AuctionResult,
  Bidder,
  BidderStatus,
  Campaign,
  Device,
  MatchKind,
  Placement,
} from "../shared/contract.ts";

export const FLOOR_CPM = 0.5;

/** How much each kind of audience match lifts (or cuts) the predicted CTR. */
export const MATCH_FACTOR: Record<MatchKind, number> = { segment: 1.6, interest: 1.25, broad: 0.55 };

/** Typical CTR differences between devices and placements. */
export const DEVICE_FACTOR: Record<Device, number> = { mobile: 1.1, desktop: 1.0, tablet: 0.95, ctv: 1.2 };
/** Sell order for a page: the slots that lift CTR most go first. */
export const placementsByValue = () =>
  (Object.keys(PLACEMENT_FACTOR) as Placement[]).sort((x, y) => PLACEMENT_FACTOR[y] - PLACEMENT_FACTOR[x]);

export const PLACEMENT_FACTOR: Record<Placement, number> = {
  feed: 1.2,
  video: 1.3,
  interstitial: 1.15,
  sidebar: 0.9,
  banner: 0.8,
};


const MIN_CTR = 0.0005;
const MAX_CTR = 0.5;

const toCents = (n: number) => Math.round(n * 100) / 100;

function words(text: string): Set<string> {
  return new Set(text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
}

function matchKind(campaign: Campaign, request: AdRequest, interestWords: Set<string>): MatchKind {
  if (campaign.segment === request.segment) return "segment";
  if (INTEREST_KEYWORDS[campaign.segment].some((w) => interestWords.has(w))) return "interest";
  return "broad";
}

function buysCountry(campaign: Campaign, request: AdRequest): boolean {
  return campaign.geos === "all" || campaign.geos.includes(request.country);
}

/** Predicted CTR for one campaign in one slot, 0..1. */
export function predictCtr(campaign: Campaign, request: AdRequest, match: MatchKind): number {
  const ctr =
    campaign.base_ctr * MATCH_FACTOR[match] * DEVICE_FACTOR[request.device] * PLACEMENT_FACTOR[request.placement];
  return Math.min(MAX_CTR, Math.max(MIN_CTR, ctr));
}

/** Run one auction for one ad request. */
export function runAuction(
  request: AdRequest,
  campaigns: Campaign[],
  /** Campaigns already shown on this page view (frequency cap: one slot each). */
  capped: ReadonlySet<string> = new Set(),
): AuctionResult {
  const interestWords = words(request.interests ?? "");

  const scored = campaigns.map((campaign) => {
    const match = matchKind(campaign, request, interestWords);
    const predicted_ctr = predictCtr(campaign, request, match);
    const relevance = predicted_ctr / campaign.base_ctr;
    const eligible = buysCountry(campaign, request);
    const score = campaign.bid_cpm * relevance;
    const status: BidderStatus = !eligible
      ? "geo_excluded"
      : capped.has(campaign.id)
        ? "capped"
        : score < FLOOR_CPM
          ? "below_floor"
          : "outbid";
    const bidder: Bidder = {
      campaign_id: campaign.id,
      advertiser: campaign.advertiser,
      headline: campaign.headline,
      segment: campaign.segment,
      bid_cpm: campaign.bid_cpm,
      match,
      predicted_ctr,
      relevance,
      score,
      status,
    };
    return bidder;
  });

  // Competitors first (by score, ties broken by id so results are stable),
  // then campaigns that could not compete.
  const rankOf = (b: Bidder) => (b.status === "outbid" ? 0 : b.status === "below_floor" ? 1 : b.status === "capped" ? 2 : 3);
  const bidders = scored.sort(
    (a, b) => rankOf(a) - rankOf(b) || b.score - a.score || a.campaign_id.localeCompare(b.campaign_id),
  );

  const competing = bidders.filter((b) => b.status === "outbid");
  const winner = competing[0];
  if (!winner) {
    return {
      filled: false,
      floor_cpm: FLOOR_CPM,
      clearing_price_cpm: 0,
      price_basis: "none",
      winner_id: null,
      runner_up_id: null,
      bidders,
    };
  }

  const runnerUp = competing[1];
  winner.status = "won";
  if (runnerUp) runnerUp.status = "runner_up";

  // The score the winner had to beat, converted back into the winner's own bid.
  const toBeat = runnerUp ? runnerUp.score : FLOOR_CPM;
  const clearing = Math.min(winner.bid_cpm, toCents(toBeat / winner.relevance + 0.01));

  return {
    filled: true,
    floor_cpm: FLOOR_CPM,
    clearing_price_cpm: clearing,
    price_basis: runnerUp ? "runner_up" : "floor",
    winner_id: winner.campaign_id,
    runner_up_id: runnerUp?.campaign_id ?? null,
    bidders,
  };
}
