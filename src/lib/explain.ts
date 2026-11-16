// Turns a server auction result into plain sentences. Nothing here decides
// anything: every number comes from the AuctionResult the API returned.

import { COUNTRY_LABELS, SEGMENT_LABELS } from "@shared/contract.ts";
import type { AdRequest, AuctionResult, Bidder } from "@shared/contract.ts";
import { listAnd, usd } from "./format";

export interface Explanation {
  headline: string;
  steps: { key: "filter" | "score" | "price"; title: string; body: string }[];
}

const score = (n: number) => n.toFixed(2);

function matchPhrase(b: Bidder): string {
  if (b.match === "segment") return `targets the ${SEGMENT_LABELS[b.segment]} audience directly`;
  if (b.match === "interest") return `matched one of the interest keywords`;
  return `has no audience match here`;
}

export function winnerOf(auction: AuctionResult) {
  return auction.bidders.find((b) => b.campaign_id === auction.winner_id) ?? null;
}

export function runnerUpOf(auction: AuctionResult) {
  return auction.bidders.find((b) => b.campaign_id === auction.runner_up_id) ?? null;
}

export function explain(request: Pick<AdRequest, "country">, auction: AuctionResult): Explanation {
  const total = auction.bidders.length;
  const excluded = auction.bidders.filter((b) => b.status === "geo_excluded");
  const weak = auction.bidders.filter((b) => b.status === "below_floor");
  const capped = auction.bidders.filter((b) => b.status === "capped");
  const country = COUNTRY_LABELS[request.country];

  const filterParts = [`${total - excluded.length - capped.length} of ${total} campaigns could bid.`];
  if (capped.length) filterParts.push(`${listAnd(capped.map((b) => b.advertiser))} already won a slot on this page.`);
  if (excluded.length) filterParts.push(`${listAnd(excluded.map((b) => b.advertiser))} ${excluded.length === 1 ? "does" : "do"} not buy ${country}.`);
  if (weak.length) filterParts.push(`${listAnd(weak.map((b) => b.advertiser))} scored under the ${usd(auction.floor_cpm)} floor.`);
  const filter = { key: "filter" as const, title: "Filter", body: filterParts.join(" ") };

  const winner = winnerOf(auction);
  if (!auction.filled || !winner) {
    return {
      headline: "No campaign cleared the floor. The slot stays empty and nobody pays.",
      steps: [
        filter,
        { key: "score", title: "Score", body: `Every eligible score was under the ${usd(auction.floor_cpm)} floor.` },
        { key: "price", title: "Price", body: "Nothing was sold, so there is no price." },
      ],
    };
  }

  const runnerUp = runnerUpOf(auction);
  const price = auction.clearing_price_cpm;
  const saved = winner.bid_cpm - price;

  const scoreBody =
    `Score = bid × relevance. ${winner.advertiser} ${matchPhrase(winner)}, so this slot is worth ` +
    `×${winner.relevance.toFixed(3)} its usual click rate. Its ${usd(winner.bid_cpm)} bid scores ${score(winner.score)}, ` +
    `the highest on the ladder.`;

  let priceBody: string;
  if (runnerUp && price >= winner.bid_cpm) {
    priceBody = `${runnerUp.advertiser} scored ${score(runnerUp.score)}, close enough that ${winner.advertiser} pays its full ${usd(winner.bid_cpm)} bid.`;
  } else if (runnerUp) {
    priceBody =
      `${runnerUp.advertiser} came second with ${score(runnerUp.score)}. ${winner.advertiser} pays the lowest bid that still beats it: ` +
      `${runnerUp.score.toFixed(3)} ÷ ${winner.relevance.toFixed(3)} + $0.01 = ${usd(price)} per 1,000 impressions, ${usd(saved)} under its bid.`;
  } else {
    priceBody =
      `Nobody else could bid, so ${winner.advertiser} only had to clear the floor: ` +
      `${auction.floor_cpm.toFixed(2)} ÷ ${winner.relevance.toFixed(3)} + $0.01 = ${usd(price)} per 1,000 impressions.`;
  }

  return {
    headline: `${winner.advertiser} wins and pays ${usd(price)} per 1,000 impressions.`,
    steps: [filter, { key: "score", title: "Score", body: scoreBody }, { key: "price", title: "Price", body: priceBody }],
  };
}
