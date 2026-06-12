import { useEffect, useState } from "react";
import { Inbox, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { listDeliveries } from "@/lib/api";
import { PLACEMENT_LABELS, SEGMENT_LABELS } from "@/lib/types";
import type { SavedDeliveryRecord } from "@/lib/types";

/** `refreshSignal` — bump this number to trigger a re-fetch (e.g. after a serve). */
export function RecentDeliveries({ refreshSignal = 0 }: { refreshSignal?: number }) {
  const [records, setRecords] = useState<SavedDeliveryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listDeliveries()
      .then((rows) => active && setRecords(rows))
      .catch(() => active && setRecords([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [refreshSignal]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading recent deliveries…
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
        <Inbox className="size-6" />
        <p>No deliveries yet. Serve an ad to see the stream here.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y rounded-lg border">
      {records.map((record) => (
        <li key={record.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{record.decision.advertiser}</p>
            <p className="truncate text-xs text-muted-foreground">
              {SEGMENT_LABELS[record.request.segment]} · {PLACEMENT_LABELS[record.request.placement]} ·{" "}
              {new Date(record.created_at).toLocaleTimeString()}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn("shrink-0 gap-1.5 tabular-nums", !record.decision.filled && "text-amber-600 dark:text-amber-400")}
          >
            <span className={cn("size-1.5 rounded-full", record.decision.filled ? "bg-emerald-500" : "bg-amber-500")} />
            {record.decision.latency_ms} ms
          </Badge>
        </li>
      ))}
    </ul>
  );
}
