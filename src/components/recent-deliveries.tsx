import { Inbox, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PLACEMENT_LABELS, SEGMENT_LABELS } from "@/lib/types";
import type { SavedDeliveryRecord } from "@/lib/types";

interface RecentDeliveriesProps {
  records: SavedDeliveryRecord[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (record: SavedDeliveryRecord) => void;
}

/** Clickable delivery history. Selecting an item shows its decision + metrics. */
export function RecentDeliveries({ records, loading, selectedId, onSelect }: RecentDeliveriesProps) {
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
    <ul className="divide-y overflow-hidden rounded-lg border">
      {records.map((record) => {
        const selected = record.id === selectedId;
        return (
          <li key={record.id}>
            <button
              type="button"
              onClick={() => onSelect(record)}
              aria-pressed={selected}
              className={cn(
                "flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors",
                "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                selected && "bg-primary/10 hover:bg-primary/10",
              )}
            >
              <div className="min-w-0">
                <p className={cn("truncate font-medium", selected && "text-primary")}>{record.decision.advertiser}</p>
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
            </button>
          </li>
        );
      })}
    </ul>
  );
}
