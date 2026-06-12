import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DecorIcon } from "@/components/decor-icon";
import { FullWidthDivider } from "@/components/full-width-divider";
import { ArrowRightIcon, CalendarIcon, Zap } from "lucide-react";

export function HeroSection() {
  return (
    <section>
      <div className="relative flex flex-col items-center justify-center gap-5 px-4 py-12 md:px-4 md:py-24 lg:py-28">
        {/* X Faded Borders & Shades */}
        <div aria-hidden="true" className="absolute inset-0 -z-1 size-full overflow-hidden">
          <div
            className={cn(
              "absolute -inset-x-20 inset-y-0 z-0 rounded-full",
              "bg-[radial-gradient(ellipse_at_center,theme(--color-foreground/.1),transparent,transparent)]",
              "blur-[50px]"
            )}
          />
          <div className="absolute inset-y-0 left-4 w-px bg-linear-to-b from-transparent via-border to-border md:left-8" />
          <div className="absolute inset-y-0 right-4 w-px bg-linear-to-b from-transparent via-border to-border md:right-8" />
          <div className="absolute inset-y-0 left-8 w-px bg-linear-to-b from-transparent via-border/50 to-border/50 md:left-12" />
          <div className="absolute inset-y-0 right-8 w-px bg-linear-to-b from-transparent via-border/50 to-border/50 md:right-12" />
        </div>

        <div
          className={cn(
            "group mx-auto flex w-fit items-center gap-3 rounded-sm border bg-card p-1 shadow",
            "fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards transition-all delay-500 duration-500 ease-out motion-reduce:animate-none"
          )}
        >
          <div className="rounded-xs border bg-card px-1.5 py-0.5 shadow-sm">
            <p className="font-mono text-xs">REALTIME</p>
          </div>
          <span className="text-xs">sub-10ms ad decisions</span>
        </div>

        <h1
          className={cn(
            "max-w-2xl text-balance text-center text-3xl text-foreground md:text-5xl lg:text-6xl",
            "fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards delay-100 duration-500 ease-out motion-reduce:animate-none"
          )}
        >
          Deliver the right ad in milliseconds
        </h1>

        <p
          className={cn(
            "max-w-xl text-balance text-center text-muted-foreground text-sm tracking-wider sm:text-lg",
            "fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards delay-200 duration-500 ease-out motion-reduce:animate-none"
          )}
        >
          Relay is a real-time ad delivery and analytics platform — targeted decisioning, streaming event pipelines, and
          edge caching, built to serve millions of requests per second and measure every impression as it happens.
        </p>

        <div className="fade-in slide-in-from-bottom-10 flex w-fit animate-in items-center justify-center gap-3 fill-mode-backwards pt-2 delay-300 duration-500 ease-out motion-reduce:animate-none">
          <Button asChild variant="outline">
            <Link to="/auth">
              <CalendarIcon data-icon="inline-start" /> Book a demo
            </Link>
          </Button>
          <Button asChild>
            <Link to="/app">
              Open the console <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="relative">
        <DecorIcon className="size-4" position="top-left" />
        <DecorIcon className="size-4" position="top-right" />
        <DecorIcon className="size-4" position="bottom-left" />
        <DecorIcon className="size-4" position="bottom-right" />

        <FullWidthDivider className="-top-px" />
        <div className="overflow-hidden bg-muted/30 px-4 py-10 md:px-8 md:py-14">
          <HeroPreview />
        </div>
        <FullWidthDivider className="-bottom-px" />
      </div>
    </section>
  );
}

/** An on-brand mock of a delivery decision (no external assets). */
function HeroPreview() {
  return (
    <div className="mx-auto max-w-3xl rounded-xl border bg-card p-5 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Zap className="size-4" />
          </span>
          <div>
            <p className="font-semibold leading-tight">Helix Gaming</p>
            <p className="text-xs text-muted-foreground">“Play the open beta tonight”</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-md bg-emerald-100 px-2 py-1 font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            Filled
          </span>
          <span className="rounded-md bg-secondary px-2 py-1 font-medium">In-feed · Mobile · US</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 pt-4 text-left sm:grid-cols-4">
        <Stat label="Clearing CPM" value="$3.41" />
        <Stat label="Predicted CTR" value="5.41%" />
        <Stat label="Latency" value="6 ms" />
        <Stat label="Auction" value="4 bidders" />
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 border-t pt-3 text-xs text-muted-foreground">
        <PipelineDot label="Redis cache hit" />
        <PipelineDot label="Streamed to Kafka" />
        <PipelineDot label="Logged to BigQuery" />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function PipelineDot({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-1.5 rounded-full bg-emerald-500" />
      {label}
    </span>
  );
}
