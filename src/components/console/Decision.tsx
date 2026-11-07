import { ArrowRight } from "lucide-react";
import { COUNTRY_LABELS, DEVICE_LABELS, INTEREST_KEYWORDS, PLACEMENT_LABELS, SEGMENT_LABELS } from "@shared/contract.ts";
import type { AdRequest, Delivery } from "@shared/contract.ts";
import { Ladder } from "@/components/Ladder";
import { Slot } from "@/components/Slot";

/** Show each placement near its real size instead of stretching it. */
const SLOT_WIDTH: Record<AdRequest["placement"], string> = {
  banner: "max-w-3xl",
  sidebar: "max-w-[20rem]",
  feed: "max-w-2xl",
  interstitial: "max-w-3xl",
  video: "max-w-2xl",
};
import { explain, runnerUpOf, winnerOf } from "@/lib/explain";
import { SCENARIOS } from "@/lib/scenarios";
import { listAnd, ms, percent, relativeDay, shortId, usd } from "@/lib/format";


interface NextStep {
  text: string;
  request: AdRequest;
}

/** One concrete change to try next, chosen from what this auction showed. */
function nextStep(delivery: Delivery): NextStep | null {
  const { request, auction } = delivery;
  const excluded = auction.bidders.filter((b) => b.status === "geo_excluded");
  const winner = winnerOf(auction);
  const runnerUp = runnerUpOf(auction);

  if (excluded.length && request.country !== "US") {
    return {
      text: `${listAnd(excluded.map((b) => b.advertiser))} sat this one out. Run the same slot in the United States and watch the ladder change.`,
      request: { ...request, country: "US" },
    };
  }
  if (winner && runnerUp && !request.interests) {
    const word = INTEREST_KEYWORDS[runnerUp.segment][0];
    if (word) {
      return {
        text: `Add the interest “${word}” and ${runnerUp.advertiser} gets an interest match. Does it catch ${winner.advertiser}?`,
        request: { ...request, interests: word },
      };
    }
  }
  if (request.placement !== "video") {
    return {
      text: "Move the slot to video pre-roll, where ads usually get the most clicks, and see every score rise.",
      request: { ...request, placement: "video" },
    };
  }
  return {
    text: "Try a banner instead, the weakest placement, and see who still clears the floor.",
    request: { ...request, placement: "banner" },
  };
}

interface Props {
  delivery: Delivery;
  roundTripMs?: number;
  fresh: boolean;
  running: boolean;
  onRun: (request: AdRequest) => void;
}

export function Decision({ delivery, roundTripMs, fresh, running, onRun }: Props) {
  const { request, auction } = delivery;
  const explanation = explain(request, auction);
  const winner = winnerOf(auction);
  const next = nextStep(delivery);

  const slot = [
    SEGMENT_LABELS[request.segment],
    DEVICE_LABELS[request.device],
    PLACEMENT_LABELS[request.placement],
    COUNTRY_LABELS[request.country],
  ].join(" · ");

  return (
    <article aria-labelledby="decision-title" className="reveal" key={delivery.id}>
      <p className="text-sm text-muted">
        {fresh ? "Just now" : relativeDay(delivery.created_at)} · Delivery{" "}
        <span className="font-mono text-xs text-ink">{shortId(delivery.id)}</span>
      </p>
      <h2 id="decision-title" className="heading mt-3 text-[clamp(1.6rem,3vw,2.4rem)]">
        {explanation.headline}
      </h2>
      <p className="mt-3 text-muted">
        {slot}
        {request.interests && <> · interests: “{request.interests}”</>}
      </p>

      {winner && (
        <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden border border-line bg-line sm:grid-cols-4">
          {[
            ["Bid", usd(winner.bid_cpm), "per 1,000 impressions"],
            ["Pays", usd(auction.clearing_price_cpm), "per 1,000 impressions"],
            ["Kept", usd(winner.bid_cpm - auction.clearing_price_cpm), "versus its bid"],
            ["Predicted CTR", percent(winner.predicted_ctr), `usual ${percent(winner.predicted_ctr / winner.relevance)}`],
          ].map(([term, value, note], i) => (
            <div key={term} className="bg-ground px-4 py-4">
              <dt className="label">{term}</dt>
              <dd className={`num mt-1 text-2xl font-bold  ${i === 1 ? "text-spec" : ""}`}>{value}</dd>
              <dd className="text-xs text-muted">{note}</dd>
            </div>
          ))}
        </dl>
      )}

      <Slot placement={request.placement} auction={auction} country={request.country} explainable={false} className={`mt-8 ${SLOT_WIDTH[request.placement]}`} />
      <h3 className="heading mt-12 text-xl">The auction behind it</h3>
      <Ladder auction={auction} country={request.country} className="mt-4" />

      <ol className="mt-10 grid gap-6 md:grid-cols-2">
        {explanation.steps.map((step, i) => (
          <li key={step.key} className="border-t border-line pt-4">
            <h3 className="font-semibold">
              <span className="num mr-2 font-mono text-xs text-muted">{i + 1}</span>
              {step.title}
            </h3>
            <p className="mt-1.5 text-sm text-muted">{step.body}</p>
          </li>
        ))}
        <li className="border-t border-line pt-4">
          <h3 className="font-semibold">
            <span className="num mr-2 font-mono text-xs text-muted">4</span>Record
          </h3>
          <p className="mt-1.5 text-sm text-muted">
            Saved to your history in Cloudflare D1. The Worker spent {ms(delivery.server_ms)} on it, mostly database
            reads.
            {roundTripMs !== undefined && <> The round trip from your browser took {ms(roundTripMs)}.</>}
          </p>
        </li>
      </ol>

      {next && (
        <div className="mt-10 flex flex-col gap-4 bg-panel p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl">
            <span className="font-semibold">Try next. </span>
            {next.text}
          </p>
          <button type="button" className="btn btn-solid shrink-0" disabled={running} onClick={() => onRun(next.request)}>
            Run it
            <ArrowRight className="nudge size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </article>
  );
}

export function FirstRun({ running, onRun }: { running: boolean; onRun: (request: AdRequest) => void }) {
  return (
    <section aria-labelledby="first-title" className="reveal">
      <h2 id="first-title" className="display text-[clamp(2.25rem,4.5vw,3.75rem)]">
        Run your first auction
      </h2>
      <p className="mt-5 max-w-xl text-muted">
        Fill in the slot on the left, or start from one of these. You will see every bidder's score, who won, the price
        they paid and how it was worked out. Each run is saved to your history below.
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-3">
        {SCENARIOS.map((s) => (
          <li key={s.label}>
            <button
              type="button"
              disabled={running}
              onClick={() => onRun(s.request)}
              className="group h-full w-full border border-line bg-ground p-4 text-left transition-colors hover:border-ink disabled:opacity-60"
            >
              <span className="block font-semibold">{s.label}</span>
              <span className="mt-1 block text-sm text-muted">{s.detail}</span>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-spec">
                Run it{" "}
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
