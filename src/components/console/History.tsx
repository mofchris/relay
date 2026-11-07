import { RotateCw } from "lucide-react";
import { DEVICE_LABELS, PLACEMENT_LABELS, SEGMENT_LABELS } from "@shared/contract.ts";
import type { DeliveriesPage } from "@shared/contract.ts";
import { winnerOf } from "@/lib/explain";
import { cx, ms, relativeDay, usd, usdSmall } from "@/lib/format";

interface StatsProps {
  totals: DeliveriesPage["totals"] | null;
}

export function Stats({ totals }: StatsProps) {
  const items: [string, string, string][] = [
    ["Auctions run", totals ? String(totals.count) : "–", "in this account"],
    [
      "Filled",
      totals ? (totals.count ? `${Math.round((totals.filled / totals.count) * 100)}%` : "–") : "–",
      totals ? `${totals.filled} of ${totals.count}` : "",
    ],
    ["Spend", totals ? usdSmall(totals.spend) : "–", "one impression per auction"],
    ["Server time", totals?.avg_server_ms != null ? ms(totals.avg_server_ms) : "–", "average, measured"],
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-6 border-y border-line py-6 lg:grid-cols-4">
      {items.map(([term, value, note]) => (
        <div key={term}>
          <dt className="label">{term}</dt>
          <dd className="num mt-1 text-3xl font-bold [font-stretch:115%]">{value}</dd>
          <dd className="text-xs text-muted">{note}</dd>
        </div>
      ))}
    </dl>
  );
}

interface HistoryProps {
  page: DeliveriesPage | null;
  state: "loading" | "ready" | "error";
  error: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRetry: () => void;
}

export function History({ page, state, error, selectedId, onSelect, onRetry }: HistoryProps) {
  return (
    <section aria-labelledby="history-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="history-title" className="title text-2xl">
          History
        </h2>
        {page && page.totals.count > page.deliveries.length && (
          <p className="text-sm text-muted">Showing the latest {page.deliveries.length}</p>
        )}
      </div>

      {state === "error" ? (
        <div className="mt-4 rounded-xl border border-line p-6">
          <p className="font-semibold">Your history did not load.</p>
          <p className="mt-1 text-sm text-muted">{error}</p>
          <button type="button" className="btn btn-ghost mt-4" onClick={onRetry}>
            <RotateCw className="size-4" aria-hidden="true" /> Try again
          </button>
        </div>
      ) : state === "loading" && !page ? (
        <ul aria-label="Loading history" className="mt-4 space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="h-14 animate-pulse rounded-lg bg-track" />
          ))}
        </ul>
      ) : !page?.deliveries.length ? (
        <p className="mt-4 rounded-xl border border-dashed border-line p-6 text-muted">
          Nothing here yet. Every auction you run lands in this list, and you can reopen any of them.
        </p>
      ) : (
        <ul className="mt-4 border-t border-line">
          <li aria-hidden="true" className="hidden grid-cols-[6.5rem_1fr_10rem_5rem_4.5rem] gap-4 border-b border-line py-2 md:grid">
            {["Time", "Slot", "Winner", "Pays", "Server"].map((h, i) => (
              <span key={h} className={cx("label", i >= 3 && "text-right")}>
                {h}
              </span>
            ))}
          </li>
          {page.deliveries.map((d) => {
            const winner = winnerOf(d.auction);
            const selected = d.id === selectedId;
            return (
              <li key={d.id} className="border-b border-line">
                <button
                  type="button"
                  onClick={() => onSelect(d.id)}
                  aria-current={selected ? "true" : undefined}
                  className={cx(
                    "group grid w-full grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 px-2 py-3 text-left transition-colors md:grid-cols-[6.5rem_1fr_10rem_5rem_4.5rem] md:items-center",
                    selected ? "bg-accent-soft" : "hover:bg-track/70",
                  )}
                >
                  <span className="num order-3 text-xs text-muted md:order-none md:text-sm">{relativeDay(d.created_at)}</span>
                  <span className="order-4 col-span-2 truncate text-sm text-muted md:order-none md:col-span-1">
                    {SEGMENT_LABELS[d.request.segment]} · {DEVICE_LABELS[d.request.device]} · {PLACEMENT_LABELS[d.request.placement]} ·{" "}
                    {d.request.country}
                  </span>
                  <span className={cx("order-1 truncate font-semibold md:order-none", selected && "text-accent")}>
                    {winner ? winner.advertiser : "Unfilled"}
                  </span>
                  <span className="num order-2 text-right font-mono text-xs md:order-none">
                    {d.auction.filled ? usd(d.auction.clearing_price_cpm) : "–"}
                  </span>
                  <span className="num hidden text-right font-mono text-xs text-muted md:block">{ms(d.server_ms)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
