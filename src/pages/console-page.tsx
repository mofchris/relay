import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, BarChart3, Timer, Target, CircleDollarSign } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ModeToggle } from "@/components/mode-toggle";
import { AdRequestForm } from "@/components/ad-request-form";
import { DeliveryCard } from "@/components/delivery-card";
import type { DeliveryComparison } from "@/components/delivery-card";
import { RecentDeliveries } from "@/components/recent-deliveries";
import { listDeliveries } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { AdRequest, DeliveryResponse, SavedDeliveryRecord } from "@/lib/types";

interface Kpis {
  total: number;
  fillRate: number;
  avgLatency: number;
  revenue: number;
}

function computeKpis(records: SavedDeliveryRecord[]): Kpis {
  if (records.length === 0) return { total: 0, fillRate: 0, avgLatency: 0, revenue: 0 };
  const filled = records.filter((r) => r.decision.filled);
  const latency = records.reduce((sum, r) => sum + r.decision.latency_ms, 0) / records.length;
  const revenue = filled.reduce((sum, r) => sum + r.decision.clearing_price_cpm / 1000, 0);
  return { total: records.length, fillRate: filled.length / records.length, avgLatency: latency, revenue };
}

/** Average metrics across other deliveries in the same segment as `selected`. */
function buildComparison(records: SavedDeliveryRecord[], selected: SavedDeliveryRecord): DeliveryComparison {
  const peers = records.filter((r) => r.request.segment === selected.request.segment && r.id !== selected.id);
  const avg = (f: (r: SavedDeliveryRecord) => number) => peers.reduce((s, r) => s + f(r), 0) / peers.length;
  return {
    segment: selected.request.segment,
    peerCount: peers.length,
    avgClearing: peers.length ? avg((r) => r.decision.clearing_price_cpm) : 0,
    avgCtr: peers.length ? avg((r) => r.decision.predicted_ctr) : 0,
    avgLatency: peers.length ? avg((r) => r.decision.latency_ms) : 0,
  };
}

export function ConsolePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [records, setRecords] = useState<SavedDeliveryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listDeliveries()
      .then((rows) => {
        if (!active) return;
        setRecords(rows);
        setSelectedId((prev) => prev ?? rows[0]?.id ?? null);
      })
      .catch(() => active && setRecords([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [refreshSignal]);

  const selected = records.find((r) => r.id === selectedId) ?? null;
  const kpis = computeKpis(records);
  const comparison = selected ? buildComparison(records, selected) : null;

  function scrollToResult() {
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function handleResult(response: DeliveryResponse, request: AdRequest) {
    // Show it immediately, then refetch to stay in sync with the server.
    const record: SavedDeliveryRecord = {
      id: response.request_id,
      created_at: new Date().toISOString(),
      request,
      decision: response.decision,
      pipeline: response.pipeline,
    };
    setRecords((prev) => [record, ...prev]);
    setSelectedId(record.id);
    setRefreshSignal((n) => n + 1);
    scrollToResult();
  }

  function handleSelect(record: SavedDeliveryRecord) {
    setSelectedId(record.id);
    scrollToResult();
  }

  function handleSignOut() {
    logout();
    navigate("/");
  }

  return (
    <div className="min-h-svh animate-in bg-background fade-in duration-300 motion-reduce:animate-none">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="rounded-md p-1.5 hover:bg-muted">
            <Logo className="h-5" />
          </Link>
          <div className="flex items-center gap-2">
            {user?.email && <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>}
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="size-4" data-icon="inline-start" />
              Sign out
            </Button>
            <ModeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Ad Delivery Console</h1>
          <p className="text-muted-foreground">
            Fire a synthetic ad request and watch the real-time auction pick a winner, price it, and stream the event.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border lg:grid-cols-4">
          <Kpi icon={<BarChart3 className="size-4" />} label="Requests served" value={kpis.total.toLocaleString()} />
          <Kpi icon={<Target className="size-4" />} label="Fill rate" value={`${(kpis.fillRate * 100).toFixed(0)}%`} />
          <Kpi icon={<Timer className="size-4" />} label="Avg latency" value={kpis.total ? `${kpis.avgLatency.toFixed(1)} ms` : "—"} />
          <Kpi icon={<CircleDollarSign className="size-4" />} label="Est. revenue" value={`$${kpis.revenue.toFixed(4)}`} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>New ad request</CardTitle>
                <CardDescription>Set the targeting context — the engine runs a second-price auction across eligible campaigns.</CardDescription>
              </CardHeader>
              <CardContent>
                <AdRequestForm onResult={handleResult} />
              </CardContent>
            </Card>

            {selected && (
              <div ref={resultRef} className="scroll-mt-20">
                <h2 className="mb-3 text-lg font-semibold">Delivery decision</h2>
                <div
                  key={selected.id}
                  className="fade-in slide-in-from-bottom-2 animate-in duration-300 ease-out motion-reduce:animate-none"
                >
                  <DeliveryCard record={selected} comparison={comparison} />
                </div>
              </div>
            )}
          </div>

          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-20">
              <h2 className="mb-3 text-lg font-semibold">Recent deliveries</h2>
              <p className="mb-3 text-xs text-muted-foreground">Select any delivery to inspect its decision and compare it.</p>
              <RecentDeliveries records={records} loading={loading} selectedId={selectedId} onSelect={handleSelect} />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-card px-4 py-4">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className="text-primary">{icon}</span>
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1.5 font-semibold text-2xl tabular-nums">{value}</p>
    </div>
  );
}
