import type React from "react";
import { Activity, ArrowRight, ArrowDown, ArrowUp, DollarSign, Gauge, Timer, Megaphone, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { SEGMENT_LABELS } from "@/lib/types";
import type { SavedDeliveryRecord, Segment } from "@/lib/types";

/** Average metrics across other deliveries in the same segment ("domain"). */
export interface DeliveryComparison {
  segment: Segment;
  peerCount: number;
  avgClearing: number;
  avgCtr: number;
  avgLatency: number;
}

const pct = (value: number, avg: number): number | null => (avg ? ((value - avg) / avg) * 100 : null);

export function DeliveryCard({
  record,
  comparison,
}: {
  record: SavedDeliveryRecord;
  comparison?: DeliveryComparison | null;
}) {
  const { decision, pipeline, request } = record;
  const time = new Date(record.created_at).toLocaleTimeString();

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Megaphone className="size-4 text-primary" />
              {decision.advertiser}
            </CardTitle>
            <CardDescription>
              <span className="font-medium text-foreground">“{decision.headline}”</span>
              <br />
              Request <span className="font-mono text-xs">{record.id.slice(0, 8)}</span> · {time}
            </CardDescription>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Badge
              className={cn(
                "border-transparent font-medium",
                decision.filled
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
              )}
            >
              {decision.filled ? "Filled" : "No-fill · house ad"}
            </Badge>
            <Badge variant="secondary" className="font-medium">
              {decision.segment_match ? "Segment match" : "Broad match"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-4">
          <Metric icon={<DollarSign className="size-4" />} label="Winning bid" value={`$${decision.bid_cpm.toFixed(2)}`} sub="CPM" />
          <Metric icon={<DollarSign className="size-4" />} label="Clearing price" value={`$${decision.clearing_price_cpm.toFixed(2)}`} sub="CPM · 2nd price" />
          <Metric icon={<Gauge className="size-4" />} label="Predicted CTR" value={`${(decision.predicted_ctr * 100).toFixed(2)}%`} sub={`${decision.candidates_considered} in auction`} />
          <Metric icon={<Timer className="size-4" />} label="Latency" value={`${decision.latency_ms} ms`} sub="end-to-end" />
        </div>

        <Section icon={<TrendingUp className="size-4" />} title={`Compared to ${SEGMENT_LABELS[request.segment]} average`}>
          {!comparison || comparison.peerCount === 0 ? (
            <p className="text-sm text-muted-foreground">
              First delivery in the {SEGMENT_LABELS[request.segment]} segment — no peers to compare against yet.
            </p>
          ) : (
            <>
              <p className="mb-2 text-xs text-muted-foreground">
                Across {comparison.peerCount} other {comparison.peerCount === 1 ? "delivery" : "deliveries"} in this segment.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Compare label="Clearing CPM" value={`$${decision.clearing_price_cpm.toFixed(2)}`} deltaPct={pct(decision.clearing_price_cpm, comparison.avgClearing)} avg={`$${comparison.avgClearing.toFixed(2)}`} tone="neutral" />
                <Compare label="Predicted CTR" value={`${(decision.predicted_ctr * 100).toFixed(2)}%`} deltaPct={pct(decision.predicted_ctr, comparison.avgCtr)} avg={`${(comparison.avgCtr * 100).toFixed(2)}%`} tone="higher-good" />
                <Compare label="Latency" value={`${decision.latency_ms} ms`} deltaPct={pct(decision.latency_ms, comparison.avgLatency)} avg={`${comparison.avgLatency.toFixed(1)} ms`} tone="lower-good" />
              </div>
            </>
          )}
        </Section>

        <Section icon={<ArrowRight className="size-4" />} title="Decision trace">
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {decision.reasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-2">
                <ArrowRight className="mt-1 size-3 shrink-0 text-primary" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Separator />

        <Section icon={<Activity className="size-4" />} title="Event pipeline">
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
            <PipelineFlag ok={pipeline.redis_cached} label={pipeline.redis_cached ? "Redis cache hit" : "Redis cache miss"} neutralWhenOff />
            <PipelineFlag ok={pipeline.kafka_streamed} label="Streamed to Kafka" />
            <PipelineFlag ok={pipeline.bigquery_logged} label="Logged to BigQuery" />
          </div>
        </Section>
      </CardContent>
    </Card>
  );
}

function Metric({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="bg-card px-4 py-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className="text-primary">{icon}</span>
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1 font-semibold text-lg tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function Compare({
  label,
  value,
  deltaPct,
  avg,
  tone,
}: {
  label: string;
  value: string;
  deltaPct: number | null;
  avg: string;
  tone: "neutral" | "higher-good" | "lower-good";
}) {
  const up = (deltaPct ?? 0) >= 0;
  const isGood = tone === "neutral" ? null : tone === "higher-good" ? up : !up;
  const color = isGood === null ? "text-muted-foreground" : isGood ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";

  return (
    <div className="rounded-lg border bg-card px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums">{value}</p>
      {deltaPct === null || !Number.isFinite(deltaPct) ? (
        <p className="text-xs text-muted-foreground">avg {avg}</p>
      ) : (
        <p className={cn("flex items-center gap-0.5 text-xs tabular-nums", color)}>
          {up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
          {Math.abs(deltaPct).toFixed(0)}% vs {avg}
        </p>
      )}
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="flex items-center gap-2 text-sm font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
      </h4>
      {children}
    </div>
  );
}

function PipelineFlag({ ok, label, neutralWhenOff }: { ok: boolean; label: string; neutralWhenOff?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "size-1.5 rounded-full",
          ok ? "bg-emerald-500" : neutralWhenOff ? "bg-amber-500" : "bg-muted-foreground/40",
        )}
      />
      {label}
    </span>
  );
}
