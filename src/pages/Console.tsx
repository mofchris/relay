import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import type { AdRequest, DeliveriesPage, Delivery } from "@shared/contract.ts";
import { SkipLink, ThemeToggle, Wordmark } from "@/components/chrome";
import { Decision, FirstRun } from "@/components/console/Decision";
import { History, Stats } from "@/components/console/History";
import { RequestForm } from "@/components/console/RequestForm";
import { ApiError, api, messageOf } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { SCENARIOS } from "@/lib/scenarios";
import { useTitle } from "@/lib/useTitle";

export function Console() {
  const { status } = useSession();
  if (status === "checking") {
    return (
      <p role="status" className="grid min-h-svh place-items-center text-muted">
        Checking your session…
      </p>
    );
  }
  if (status === "signed-out") return <Navigate to="/signin" replace />;
  return <ConsoleView />;
}

function accountLabel(kind: string, email: string | null) {
  if (kind === "guest") return "Guest sandbox, deleted after 3 days";
  if (kind === "demo") return "Shared demo account";
  return email ?? "Signed in";
}

function ConsoleView() {
  useTitle("Console");
  const navigate = useNavigate();
  const { user, signOut } = useSession();

  const [page, setPage] = useState<DeliveriesPage | null>(null);
  const [historyState, setHistoryState] = useState<"loading" | "ready" | "error">("loading");
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const [form, setForm] = useState<AdRequest>(SCENARIOS[0].request);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [freshId, setFreshId] = useState<string | null>(null);
  const [roundTrips, setRoundTrips] = useState<Record<string, number>>({});
  const decisionRef = useRef<HTMLDivElement>(null);

  const leave = useCallback(() => {
    signOut();
    navigate("/signin", { replace: true });
  }, [navigate, signOut]);

  const handleFailure = useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.status === 401) leave();
      return messageOf(error);
    },
    [leave],
  );

  useEffect(() => {
    let active = true;
    api
      .deliveries()
      .then((p) => {
        if (!active) return;
        setPage(p);
        setHistoryState("ready");
      })
      .catch((e) => {
        if (!active) return;
        setHistoryError(handleFailure(e));
        setHistoryState("error");
      });
    return () => {
      active = false;
    };
  }, [attempt, handleFailure]);

  /** Bring the decision into view. After a run this only matters on narrow screens. */
  const reveal = (always: boolean) => {
    if (!always && !window.matchMedia("(max-width: 1023px)").matches) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => decisionRef.current?.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "auto" }));
  };

  async function run(request: AdRequest) {
    setForm(request);
    setRunning(true);
    setRunError(null);
    const started = performance.now();
    try {
      const delivery: Delivery = await api.serve(request);
      const roundTrip = performance.now() - started;
      setRoundTrips((r) => ({ ...r, [delivery.id]: roundTrip }));
      setPage((p) => ({
        deliveries: [delivery, ...(p?.deliveries ?? [])].slice(0, 50),
        totals: p?.totals ?? { count: 0, filled: 0, spend: 0, avg_server_ms: null },
      }));
      setSelectedId(delivery.id);
      setFreshId(delivery.id);
      reveal(false);
      // Totals are aggregated by the server; refresh them in the background.
      api.deliveries().then(setPage, () => undefined);
    } catch (e) {
      setRunError(handleFailure(e));
    } finally {
      setRunning(false);
    }
  }

  const deliveries = page?.deliveries ?? [];
  const selected = deliveries.find((d) => d.id === selectedId) ?? deliveries[0] ?? null;

  return (
    <>
      <SkipLink />
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[90rem] items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <Wordmark suffix="Console" />
          <div className="flex items-center gap-2 sm:gap-3">
            <p className="hidden max-w-[16rem] truncate text-sm text-muted md:block">
              {user && accountLabel(user.kind, user.email)}
            </p>
            <button type="button" className="btn btn-ghost min-h-11 px-4 text-sm" onClick={leave}>
              Sign out
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-[90rem] px-4 pt-8 pb-24 sm:px-8">
        <h1 className="sr-only">Relay console</h1>
        <div className="grid gap-12 lg:grid-cols-[22rem_1fr] xl:grid-cols-[24rem_1fr] xl:gap-16">
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <RequestForm value={form} onChange={setForm} onRun={run} running={running} error={runError} />
          </aside>

          <div ref={decisionRef} className="min-w-0 scroll-mt-4" aria-live="polite" aria-busy={running}>
            {historyState === "loading" && !page ? (
              <p role="status" className="text-muted">
                Loading your auctions…
              </p>
            ) : selected ? (
              <Decision
                key={selected.id}
                delivery={selected}
                roundTripMs={roundTrips[selected.id]}
                fresh={selected.id === freshId}
                running={running}
                onRun={run}
              />
            ) : (
              <FirstRun running={running} onRun={run} />
            )}
          </div>
        </div>

        <div className="mt-20 space-y-10">
          <Stats totals={page?.totals ?? null} />
          <History
            page={page}
            state={historyState}
            error={historyError}
            selectedId={selected?.id ?? null}
            onSelect={(id) => {
              setSelectedId(id);
              reveal(true);
            }}
            onRetry={() => {
              setHistoryState("loading");
              setAttempt((n) => n + 1);
            }}
          />
        </div>
      </main>
    </>
  );
}
