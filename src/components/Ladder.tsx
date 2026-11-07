// The auction behind a slot: every campaign ranked by score. The winner's bar
// takes its brand colour; the magenta line marks the score the winner had to
// beat, which is what its price is set against. Hatched rows sat out.

import type { CSSProperties } from "react";
import { COUNTRY_LABELS } from "@shared/contract.ts";
import type { AuctionResult, Bidder, Country } from "@shared/contract.ts";
import { brandOf } from "@/lib/brands";
import { cx, usd } from "@/lib/format";

const STATUS_TEXT: Record<Bidder["status"], string> = {
  won: "Won",
  runner_up: "Second",
  outbid: "Outbid",
  below_floor: "Under the floor",
  geo_excluded: "Sat out",
  capped: "Capped",
};

const MATCH_TEXT: Record<Bidder["match"], string> = {
  segment: "audience match",
  interest: "interest match",
  broad: "no match",
};

export function Ladder({ auction, country, className }: { auction: AuctionResult; country: Country; className?: string }) {
  const sitsOut = (b: Bidder) => b.status === "geo_excluded" || b.status === "capped";
  const competing = auction.bidders.filter((b) => !sitsOut(b));
  const top = Math.max(auction.floor_cpm, ...competing.map((b) => b.score));
  const scale = (n: number) => Math.min(1, n / (top * 1.06));
  const runnerUp = auction.bidders.find((b) => b.campaign_id === auction.runner_up_id);
  const priceLineAt = runnerUp ? runnerUp.score : auction.floor_cpm;
  const stableOrder = [...auction.bidders].sort((a, b) => a.campaign_id.localeCompare(b.campaign_id));
  const rank = new Map(auction.bidders.map((b, i) => [b.campaign_id, i]));
  const vars = { "--row": "2.75rem", height: `calc(var(--row) * ${auction.bidders.length})` } as CSSProperties;

  return (
    <figure className={cx("[--name:7.5rem] [--score:3.25rem] sm:[--name:11rem] sm:[--score:3.75rem]", className)}>
      <ol className="sr-only">
        {auction.bidders.map((b, i) => (
          <li key={b.campaign_id}>
            {i + 1}. {b.advertiser}: {STATUS_TEXT[b.status]}
            {b.status === "capped"
              ? ", already won another slot on this page"
              : b.status === "geo_excluded"
              ? `, does not buy ${COUNTRY_LABELS[country]}`
              : `, score ${b.score.toFixed(2)} from a ${usd(b.bid_cpm)} bid, ${MATCH_TEXT[b.match]}`}
          </li>
        ))}
      </ol>

      <div aria-hidden="true" className="relative" style={vars}>
        <div className="pointer-events-none absolute inset-y-0 right-(--score) left-(--name) overflow-hidden">
          <div
            className="ladder-mark absolute inset-y-0 w-full border-l border-dashed border-muted"
            style={{ translate: `${scale(auction.floor_cpm) * 100}% 0` }}
          />
          {auction.filled && (
            <div
              className="ladder-mark absolute w-full"
              style={{ translate: `${scale(priceLineAt) * 100}% 0`, top: 0, height: `calc(var(--row) * ${runnerUp ? 2 : 1})` }}
            >
              <div className="h-full border-l-2 border-spec" />
            </div>
          )}
        </div>

        {stableOrder.map((b) => {
          const i = rank.get(b.campaign_id) ?? 0;
          const out = sitsOut(b);
          const won = b.status === "won";
          const brand = brandOf(b.campaign_id);
          return (
            <div
              key={b.campaign_id}
              className="ladder-row grid h-(--row) grid-cols-[var(--name)_1fr_var(--score)] items-center border-b border-line"
              style={{ translate: `0 calc(var(--row) * ${i})` }}
            >
              <div className="min-w-0 pr-3 leading-tight">
                <p className={cx("truncate text-[0.9375rem] font-semibold", out && "text-muted")}>{b.advertiser}</p>
                <p className="truncate text-xs text-muted">
                  {b.status === "capped" ? "Already on this page" : out ? `No ${country} buying` : `${STATUS_TEXT[b.status]}, ${MATCH_TEXT[b.match]}`}
                </p>
              </div>
              <div className={cx("relative h-3.5", out ? "hatch" : "bg-panel")}>
                {!out && (
                  <div
                    className="ladder-bar absolute inset-0 animate-[grow_650ms_var(--ease-fill)_backwards]"
                    style={{
                      scale: `${scale(b.score)} 1`,
                      animationDelay: `${i * 35}ms`,
                      background: won ? brand.bg : b.status === "runner_up" ? "var(--ink)" : "var(--hatch)",
                      boxShadow: won ? `inset 0 0 0 1px color-mix(in srgb, ${brand.fg} 25%, transparent)` : undefined,
                    }}
                  />
                )}
              </div>
              <p className={cx("num text-right text-sm", won ? "font-bold" : "text-muted")}>{out ? "n/a" : b.score.toFixed(2)}</p>
            </div>
          );
        })}
      </div>

      <figcaption className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
        <span>Bar length = score = bid × relevance</span>
        {auction.filled && (
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-3 border-l-2 border-spec" />
            {runnerUp ? "Score to beat" : "Floor to clear"} {priceLineAt.toFixed(2)}
          </span>
        )}
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 border-l border-dashed border-muted" /> Floor {usd(auction.floor_cpm)}
        </span>
      </figcaption>
    </figure>
  );
}
