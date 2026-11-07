// An ad slot drawn like an ad-ops spec: a magenta dimension line above, the
// sold creative (or hatched, unsold inventory) inside, and a receipt below.

import { useState } from "react";
import type { ReactNode } from "react";
import type { AuctionResult, Country, Placement } from "@shared/contract.ts";
import { Creative } from "@/components/Creative";
import { Ladder } from "@/components/Ladder";
import { SLOT_SPECS } from "@/lib/brands";
import { runnerUpOf, winnerOf } from "@/lib/explain";
import { cx, usd } from "@/lib/format";

function Dimension({ placement }: { placement: Placement }) {
  const spec = SLOT_SPECS[placement];
  return (
    <div className="mb-2 flex items-center gap-2" aria-hidden="true">
      <span className="h-2.5 border-l border-spec" />
      <span className="h-px flex-1 bg-spec" />
      <span className="spec whitespace-nowrap">
        {spec.size} {spec.name}
      </span>
      <span className="h-px flex-1 bg-spec" />
      <span className="h-2.5 border-l border-spec" />
    </div>
  );
}

export function Receipt({ auction }: { auction: AuctionResult }) {
  const winner = winnerOf(auction);
  const runnerUp = runnerUpOf(auction);
  if (!auction.filled || !winner) {
    return <>Unsold. No bid cleared the {usd(auction.floor_cpm)} floor, so nobody pays.</>;
  }
  return (
    <>
      Sold to <strong className="font-semibold text-ink">{winner.advertiser}</strong> for{" "}
      <strong className="num font-semibold text-ink">{usd(auction.clearing_price_cpm)}</strong> per 1,000 impressions. It bid{" "}
      {usd(winner.bid_cpm)};{" "}
      {runnerUp ? (
        <>
          {runnerUp.advertiser} came second with a score of {runnerUp.score.toFixed(2)}.
        </>
      ) : (
        <>nobody else could bid, so it only had to clear the floor.</>
      )}
    </>
  );
}

interface SlotProps {
  placement: Placement;
  auction: AuctionResult | null;
  country: Country;
  /** Offer a button that opens the full auction under the receipt. */
  explainable?: boolean;
  className?: string;
  children?: ReactNode;
}

export function Slot({ placement, auction, country, explainable = true, className, children }: SlotProps) {
  const [open, setOpen] = useState(false);
  const winner = auction ? winnerOf(auction) : null;
  const spec = SLOT_SPECS[placement];

  return (
    <figure className={cx("@container", className)}>
      <Dimension placement={placement} />
      <div className="hatch relative overflow-hidden border border-line" style={{ aspectRatio: spec.ratio }}>
        {winner ? (
          <div key={winner.campaign_id} className="fill-in absolute inset-0">
            <Creative bidder={winner} placement={placement} />
          </div>
        ) : (
          auction && (
            <div className="absolute inset-0 grid place-items-center">
              <span className="bg-ground px-2 py-1 text-sm font-semibold">Unsold</span>
            </div>
          )
        )}
        {!auction && <span className="sr-only">Selling this slot…</span>}
      </div>
      <figcaption className="mt-2.5 min-h-[3em] text-sm text-muted" aria-live="polite">
        {auction ? <Receipt auction={auction} /> : "Selling this slot…"}
        {auction && explainable && (
          <button
            type="button"
            className="link ml-1.5 text-ink"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Hide the auction" : "See the auction"}
          </button>
        )}
      </figcaption>
      {auction && open && <Ladder auction={auction} country={country} className="rise-in mt-5" />}
      {children}
    </figure>
  );
}
