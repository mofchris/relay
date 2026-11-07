// A fictional advertiser's ad, laid out for the placement it won.

import type { CSSProperties } from "react";
import type { Bidder, Placement } from "@shared/contract.ts";
import { brandOf } from "@/lib/brands";
import type { MarkShape } from "@/lib/brands";
import { cx } from "@/lib/format";

export function Mark({ shape, color, className }: { shape: MarkShape; color: string; className?: string }) {
  const common = { fill: "none", stroke: color, strokeWidth: 2.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      {shape === "hex" && <path d="M16 3 27 9.5v13L16 29 5 22.5v-13Z M16 10l5.5 3.2v6.4L16 23l-5.5-3.4v-6.4Z" {...common} />}
      {shape === "helix" && <path d="M9 3c0 7 14 7 14 13S9 22 9 29 M23 3c0 7-14 7-14 13s14 6 14 13 M11 9h10 M11 23h10" {...common} />}
      {shape === "arc" && <path d="M5 26a11 11 0 0 1 22 0 M10 26a6 6 0 0 1 12 0 M16 4v6" {...common} />}
      {shape === "pulse" && <path d="M3 17h7l3-8 5 15 3-7h8" {...common} />}
      {shape === "wave" && <path d="M3 13c4-4 7 4 11 0s7-4 11 0 M3 21c4-4 7 4 11 0s7-4 11 0" {...common} />}
      {shape === "tag" && <path d="M4 15 15 4h13v13L17 28Z M22 10h.01" {...common} />}
    </svg>
  );
}

function AdBadge({ fg }: { fg: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] leading-none font-semibold tracking-wide" style={{ color: fg }}>
      <span className="border px-1 py-0.5" style={{ borderColor: fg }}>
        Ad
      </span>
      <span>Fictional advertiser</span>
    </span>
  );
}

export function Creative({ bidder, placement }: { bidder: Bidder; placement: Placement }) {
  const b = brandOf(bidder.campaign_id);
  const style = { background: b.bg, color: b.fg } as CSSProperties;
  const voice = cx("font-bold tracking-[-0.03em]", b.upper && "uppercase tracking-[-0.01em]", b.italic && "italic");
  const label = `Ad from ${bidder.advertiser}, a fictional advertiser: ${bidder.headline}`;
  const cta = (
    <span className="inline-flex items-center px-[0.9em] py-[0.55em] text-[0.8em] font-bold whitespace-nowrap" style={{ background: b.accent, color: b.ctaFg }}>
      {b.cta}
    </span>
  );

  if (placement === "banner") {
    return (
      <div role="img" aria-label={label} className="relative flex h-full items-center gap-[3cqi] px-[3cqi] text-[clamp(0.6rem,2.1cqi,1.05rem)]" style={style}>
        <Mark shape={b.mark} color={b.accent} className="h-[55%] shrink-0" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="hidden font-semibold @[30rem]:block">{bidder.advertiser}</p>
          <p className={cx("truncate text-[1.35em]", voice)}>{bidder.headline}</p>
        </div>
        <span className="hidden @[30rem]:inline-flex">{cta}</span>
        <span className="absolute top-1 right-1.5 hidden @[30rem]:block">
          <AdBadge fg={b.fg} />
        </span>
      </div>
    );
  }

  if (placement === "video") {
    return (
      <div role="img" aria-label={label} className="relative flex h-full flex-col justify-between p-[5cqi] text-[clamp(0.7rem,2.6cqi,1.1rem)]" style={style}>
        <AdBadge fg={b.fg} />
        <p className={cx("max-w-[80%] text-[3.2em] leading-[0.95]", voice)}>{bidder.headline}</p>
        <div className="flex items-center gap-[2cqi]">
          <span className="grid size-[3.2em] place-items-center rounded-full" style={{ background: b.accent }}>
            <svg viewBox="0 0 10 10" className="ml-[0.2em] size-[1em]" aria-hidden="true">
              <path d="M2 1v8l7-4Z" fill={b.bg} />
            </svg>
          </span>
          <div className="h-[3px] flex-1" style={{ background: `color-mix(in srgb, ${b.fg} 30%, transparent)` }}>
            <div className="h-full w-0" style={{ background: b.accent }} />
          </div>
          <span className="font-semibold">{bidder.advertiser}</span>
        </div>
        <Mark shape={b.mark} color={b.accent} className="absolute top-[5cqi] right-[5cqi] w-[14cqi] opacity-90" />
      </div>
    );
  }

  if (placement === "sidebar") {
    return (
      <div role="img" aria-label={label} className="relative flex h-full flex-col justify-between p-[7cqi] text-[clamp(0.7rem,4.6cqi,1.05rem)]" style={style}>
        <AdBadge fg={b.fg} />
        <p className={cx("text-[2.1em] leading-[0.98]", voice)}>{bidder.headline}</p>
        <div className="flex items-end justify-between gap-3">
          <span className="flex items-center gap-2 font-semibold">
            <Mark shape={b.mark} color={b.accent} className="size-[1.8em]" />
            {bidder.advertiser}
          </span>
          {cta}
        </div>
      </div>
    );
  }

  // feed and interstitial: a large art panel with the brand mark, headline beside it.
  const big = placement === "interstitial";
  return (
    <div
      role="img"
      aria-label={label}
      className={cx("relative grid h-full grid-cols-[1fr_0.8fr] overflow-hidden", big ? "text-[clamp(0.75rem,1.9cqi,1.25rem)]" : "text-[clamp(0.7rem,2.3cqi,1.1rem)]")}
      style={style}
    >
      <div className="flex flex-col justify-between p-[4cqi]">
        <AdBadge fg={b.fg} />
        <div>
          <p className="mb-[0.6em] font-semibold">{bidder.advertiser}</p>
          <p className={cx(big ? "text-[3.6em]" : "text-[2.6em]", "leading-[0.95]", voice)}>{bidder.headline}</p>
        </div>
        <span className="self-start">{cta}</span>
      </div>
      <div className="relative" style={{ background: `color-mix(in srgb, ${b.accent} 18%, ${b.bg})` }}>
        <Mark shape={b.mark} color={b.accent} className="absolute top-1/2 left-1/2 w-[130%] -translate-x-1/3 -translate-y-1/2" />
      </div>
    </div>
  );
}
