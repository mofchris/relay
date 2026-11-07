// The bid ladder: every campaign in one auction, ranked by score. The winner's
// bar is cobalt; a marker drops from the winner to the runner-up's score,
// which is the line the winner's price is set against.

import type { CSSProperties } from "react";
import { COUNTRY_LABELS } from "@shared/contract.ts";
import type { AuctionResult, Bidder, Country } from "@shared/contract.ts";
import { cx, usd } from "@/lib/format";

const STATUS_TEXT: Record<Bidder["status"], string> = {
  won: "Won",
  runner_up: "Runner-up",
  outbid: "Outbid",
  below_floor: "Under floor",
  geo_excluded: "Sits out",
};

const MATCH_TEXT: Record<Bidder["match"], string> = {
  segment: "audience match",
  interest: "interest match",
  broad: "no match",
};

interface LadderProps {
  auction: AuctionResult;
  country: Country;
  /** Row height in rem. */
  rowRem?: number;
  className?: string;
}

export function Ladder({ auction, country, rowRem = 3.25, className }: LadderProps) {
  const competing = auction.bidders.filter((b) => b.status !== "geo_excluded");
  const top = Math.max(auction.floor_cpm, ...competing.map((b) => b.score));
  const scale = (n: number) => Math.min(1, n / (top * 1.06));
  const runnerUp = auction.bidders.find((b) => b.campaign_id === auction.runner_up_id);
  const priceLineAt = runnerUp ? runnerUp.score : auction.floor_cpm;
  const stableOrder = [...auction.bidders].sort((a, b) => a.campaign_id.localeCompare(b.campaign_id));
  const rank = new Map(auction.bidders.map((b, i) => [b.campaign_id, i]));

  const vars = {
    "--row": `${rowRem}rem`,
    height: `calc(var(--row) * ${auction.bidders.length})`,
  } as CSSProperties;

  return (
    <figure className={cx("[--name:7.25rem] [--score:3.5rem] sm:[--name:10.5rem] sm:[--score:4rem]", className)}>
      <ol className="sr-only">
        {auction.bidders.map((b, i) => (
          <li key={b.campaign_id}>
            {i + 1}. {b.advertiser}: {STATUS_TEXT[b.status]}
            {b.status === "geo_excluded"
              ? `, does not buy ${COUNTRY_LABELS[country]}`
              : `, score ${b.score.toFixed(2)} from a ${usd(b.bid_cpm)} bid, ${MATCH_TEXT[b.match]}`}
          </li>
        ))}
      </ol>

      <div aria-hidden="true" className="relative" style={vars}>
        {/* Floor and price markers live on a layer the exact width of the bar track. */}
        <div className="pointer-events-none absolute inset-y-0 left-(--name) right-(--score) overflow-hidden">
          <div
            className="ladder-mark absolute inset-y-0 w-full border-l border-dashed border-muted/60"
            style={{ translate: `${scale(auction.floor_cpm) * 100}% 0` }}
          />
          {auction.filled && (
            <div
              className="ladder-mark absolute w-full"
              style={{ translate: `${scale(priceLineAt) * 100}% 0`, top: "0.35rem", height: `calc(var(--row) * ${runnerUp ? 2 : 1} - 0.7rem)` }}
            >
              <div className="h-full border-l-2 border-ink" />
            </div>
          )}
        </div>

        {stableOrder.map((b) => {
          const i = rank.get(b.campaign_id) ?? 0;
          const out = b.status === "geo_excluded";
          const won = b.status === "won";
          return (
            <div
              key={b.campaign_id}
              className="ladder-row grid h-(--row) grid-cols-[var(--name)_1fr_var(--score)] items-center"
              style={{ translate: `0 calc(var(--row) * ${i})` }}
            >
              <div className="min-w-0 pr-3">
                <p className={cx("truncate text-sm font-semibold leading-tight sm:text-[0.95rem]", out && "text-muted")}>
                  {b.advertiser}
                </p>
                <p className={cx("truncate text-xs leading-tight", won ? "font-semibold text-accent" : "text-muted")}>
                  {out ? `No ${country} buying` : `${STATUS_TEXT[b.status]} · ${MATCH_TEXT[b.match]}`}
                </p>
              </div>
              <div className={cx("relative h-[42%] overflow-hidden rounded-[3px]", out ? "hatch" : "bg-track")}>
                {!out && (
                  <div
                    className={cx(
                      "ladder-bar absolute inset-0 animate-[grow_650ms_var(--ease-lock)_backwards]",
                      won ? "bg-accent" : b.status === "runner_up" ? "bg-ink/70" : "bg-muted/45",
                    )}
                    style={{ scale: `${scale(b.score)} 1`, animationDelay: `${i * 35}ms` }}
                  />
                )}
              </div>
              <p className={cx("num text-right font-mono text-xs sm:text-[0.8rem]", won ? "font-semibold text-ink" : "text-muted")}>
                {out ? "n/a" : b.score.toFixed(2)}
              </p>
            </div>
          );
        })}
      </div>

      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-2.5 w-4 rounded-[2px] bg-accent" /> Score = bid × relevance
        </span>
        {auction.filled && (
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-3 border-l-2 border-ink" /> {runnerUp ? "Score to beat" : "Floor to clear"}: {priceLineAt.toFixed(2)}
          </span>
        )}
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 border-l border-dashed border-muted" /> Floor {usd(auction.floor_cpm)}
        </span>
      </figcaption>
    </figure>
  );
}
