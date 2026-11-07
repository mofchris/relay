import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, RotateCw } from "lucide-react";
import { COUNTRY_LABELS, DEVICE_LABELS, PLACEMENT_LABELS, SEGMENT_LABELS, SEGMENTS } from "@shared/contract.ts";
import type { Campaign, PreviewResponse, Segment } from "@shared/contract.ts";
import { Ladder } from "@/components/Ladder";
import { NavItem, Roll, SiteFooter, SiteHeader, SkipLink } from "@/components/chrome";
import { api, messageOf } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { explain } from "@/lib/explain";
import { cx, percent, usd } from "@/lib/format";
import { useTitle } from "@/lib/useTitle";

const SLOT = { placement: "feed", device: "mobile", country: "US" } as const;
const CYCLE_MS = 5000;

export function Landing() {
  useTitle(null);
  return (
    <>
      <SkipLink />
      <SiteHeader>
        <a href="#how" className="hidden rounded-full px-3 py-2 text-sm font-semibold text-muted hover:text-ink sm:inline-flex">
          <Roll>How it works</Roll>
        </a>
        <NavItem to="/console">Console</NavItem>
      </SiteHeader>
      <main id="main">
        <Hero />
        <HowItWorks />
        <RealVsMadeUp />
        <Bidders />
      </main>
      <SiteFooter />
    </>
  );
}

function StartButton({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { status, startGuest } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (status === "signed-in") return navigate("/console");
    setBusy(true);
    setError(null);
    try {
      await startGuest();
      navigate("/console");
    } catch (e) {
      setError(messageOf(e));
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <button type="button" className="btn btn-primary" onClick={start} disabled={busy}>
        <Roll>{busy ? "Opening your sandbox…" : status === "signed-in" ? "Back to your console" : "Run your own auctions"}</Roll>
        <ArrowRight className="nudge size-4" aria-hidden="true" />
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function Hero() {
  const { status } = useSession();
  return (
    <section className="mx-auto grid max-w-7xl gap-12 px-4 pt-10 pb-20 sm:px-8 lg:grid-cols-12 lg:gap-10 lg:pt-16">
      <div className="lg:col-span-5 lg:pt-6">
        <h1 className="display text-[clamp(3rem,8.4vw,6.6rem)] -ml-[0.04em]">Every ad slot is an auction.</h1>
        <p className="mt-8 max-w-[34rem] text-lg text-muted">
          Relay is a small, working ad server. Describe a slot and who is looking at it, and it runs a second-price
          auction on the server between six fictional advertisers. Then it shows you who won, what they paid, and why.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <StartButton />
          <Link to="/signin" className="btn btn-ghost">
            <Roll>Sign in</Roll>
          </Link>
        </div>
        {status !== "signed-in" && (
          <p className="mt-4 text-sm text-muted">No sign-up: you get a private sandbox that is deleted after three days.</p>
        )}
      </div>
      <div className="lg:col-span-7">
        <LivePreview />
      </div>
    </section>
  );
}

function LivePreview() {
  const [data, setData] = useState<PreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [segment, setSegment] = useState<Segment>("gaming");
  const [pinned, setPinned] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    api
      .preview(SLOT)
      .then((d) => active && setData(d))
      .catch((e) => active && setError(messageOf(e)));
    return () => {
      active = false;
    };
  }, [attempt]);

  // Idle: step through the audiences while nobody is choosing one.
  useEffect(() => {
    if (!data || pinned || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let visible = true;
    const observer = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    if (panel.current) observer.observe(panel.current);
    const timer = setInterval(() => {
      if (!visible || document.hidden) return;
      setSegment((s) => SEGMENTS[(SEGMENTS.indexOf(s) + 1) % SEGMENTS.length]);
    }, CYCLE_MS);
    return () => {
      clearInterval(timer);
      observer.disconnect();
    };
  }, [data, pinned]);

  const choose = useCallback((s: Segment) => {
    setPinned(true);
    setSegment(s);
  }, []);

  const result = data?.results.find((r) => r.segment === segment);
  const explanation = result ? explain(SLOT, result.auction) : null;

  return (
    <div
      ref={panel}
      className="rounded-[1.25rem] border border-line bg-raised p-5 sm:p-7"
      onPointerDown={() => setPinned(true)}
      onFocusCapture={() => setPinned(true)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="title text-xl">Live auction</h2>
        <p className="text-xs text-muted">
          Run by the API just now · {DEVICE_LABELS[SLOT.device]}, {PLACEMENT_LABELS[SLOT.placement].toLowerCase()},{" "}
          {COUNTRY_LABELS[SLOT.country]} · not recorded
        </p>
      </div>

      <div role="radiogroup" aria-label="Audience" className="mt-5 flex flex-wrap gap-2">
        {SEGMENTS.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={s === segment}
            className="chip"
            onClick={() => choose(s)}
          >
            {SEGMENT_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="mt-6 min-h-[22rem]" aria-live="polite">
        {error ? (
          <div className="grid min-h-[20rem] place-items-center text-center">
            <div>
              <p className="font-semibold">The live auction did not load.</p>
              <p className="mt-1 text-sm text-muted">{error}</p>
              <button
                type="button"
                className="btn btn-ghost mt-4"
                onClick={() => {
                  setError(null);
                  setAttempt((n) => n + 1);
                }}
              >
                <RotateCw className="size-4" aria-hidden="true" /> Try again
              </button>
            </div>
          </div>
        ) : !result || !explanation ? (
          <LadderSkeleton />
        ) : (
          <>
            <p className="title mb-5 min-h-[2.75rem] text-lg sm:text-xl">{explanation.headline}</p>
            <Ladder auction={result.auction} country={SLOT.country} />
          </>
        )}
      </div>
    </div>
  );
}

export function LadderSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-label="Loading the auction" role="status" className="space-y-5 pt-2">
      <div className="h-6 w-3/4 animate-pulse rounded bg-track" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="grid grid-cols-[7.25rem_1fr] items-center gap-3 sm:grid-cols-[10.5rem_1fr]">
          <div className="h-4 animate-pulse rounded bg-track" />
          <div className="h-4 animate-pulse rounded bg-track" style={{ width: `${90 - i * 12}%` }} />
        </div>
      ))}
    </div>
  );
}

const STEPS = [
  {
    title: "Filter",
    body: "Campaigns that don't buy the visitor's country sit out. Lumen Finance, for one, only buys the US, the UK and Canada.",
  },
  {
    title: "Score",
    body: "Each bid is weighted by relevance: how much better than usual the ad should do in this slot, given the audience, device and placement.",
  },
  {
    title: "Price",
    body: "The top score wins but pays only the lowest bid that would still have beaten the runner-up, plus a cent. Below the $0.50 floor, nobody wins.",
  },
  {
    title: "Record",
    body: "In the console, every auction you run is saved to your account in a Cloudflare D1 database, with the time the server took.",
  },
];

function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-title" className="scroll-mt-8 border-y border-line bg-raised">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-8 lg:py-28">
        <h2 id="how-title" className="display max-w-3xl text-[clamp(2.25rem,5vw,4.25rem)]">
          What happens to one request
        </h2>
        <ol className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="border-t-2 border-ink pt-5">
              <p className="num font-mono text-sm text-muted">{i + 1}</p>
              <h3 className="title mt-6 text-2xl">{step.title}</h3>
              <p className="mt-3 text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function RealVsMadeUp() {
  return (
    <section aria-labelledby="honest-title" className="mx-auto max-w-7xl px-4 py-20 sm:px-8 lg:py-28">
      <h2 id="honest-title" className="display max-w-3xl text-[clamp(2.25rem,5vw,4.25rem)]">
        What's real, and what's made up
      </h2>
      <div className="mt-14 grid gap-12 md:grid-cols-2">
        <div>
          <h3 className="title text-2xl">Real</h3>
          <ul className="mt-5 divide-y divide-line border-y border-line">
            {[
              "The auction runs on the server, in a Cloudflare Worker, for every request. Prices are computed, never picked: the same request always gets the same result.",
              "Accounts and sign-in, with PBKDF2 password hashing and signed session tokens.",
              "Your delivery history, stored in Cloudflare D1.",
              "Timings. Server time is measured by the Worker; round trip is measured by your browser.",
            ].map((t) => (
              <li key={t} className="py-4">
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="title text-2xl">Made up</h3>
          <ul className="mt-5 divide-y divide-line border-y border-line">
            {[
              "The six advertisers, their bids, headlines and usual click rates.",
              "The traffic. Every request is one somebody typed in. No ad is shown to anyone and no money moves.",
              "The relevance factors for device and placement are fixed estimates, not learned from data.",
            ].map((t) => (
              <li key={t} className="py-4 text-muted">
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Bidders() {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api
      .campaigns()
      .then((r) => setCampaigns([...r.campaigns].sort((a, b) => b.bid_cpm - a.bid_cpm)))
      .catch(() => setFailed(true));
  }, []);

  return (
    <section aria-labelledby="bidders-title" className="mx-auto max-w-7xl px-4 sm:px-8">
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h2 id="bidders-title" className="display text-[clamp(2.25rem,5vw,4.25rem)]">
            The bidders
          </h2>
          <p className="mt-6 max-w-sm text-muted">
            Six fictional advertisers, read live from the database. Each has one standing bid and an audience it
            targets.
          </p>
          <StartButton className="mt-8" />
        </div>
        <div className="overflow-x-auto lg:col-span-8">
          {failed ? (
            <p className="text-muted">The advertiser list did not load. Refresh to try again.</p>
          ) : (
            <table className="w-full min-w-[34rem] text-left text-sm">
              <caption className="sr-only">Fictional advertisers and their bids</caption>
              <thead>
                <tr className="border-b-2 border-ink">
                  {["Advertiser", "Audience", "Bid per 1,000", "Usual CTR", "Buys in"].map((h) => (
                    <th key={h} scope="col" className="label py-3 pr-4 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={cx(!campaigns && "animate-pulse")}>
                {(campaigns ?? Array.from({ length: 6 }, () => null)).map((c, i) => (
                  <tr key={c?.id ?? i} className="border-b border-line">
                    <th scope="row" className="py-4 pr-4 font-semibold">
                      {c ? (
                        <>
                          {c.advertiser}
                          <span className="block text-xs font-normal text-muted">“{c.headline}”</span>
                        </>
                      ) : (
                        <span className="block h-4 w-28 rounded bg-track" />
                      )}
                    </th>
                    <td className="py-4 pr-4">{c ? SEGMENT_LABELS[c.segment] : ""}</td>
                    <td className="num py-4 pr-4 font-mono text-xs">{c ? usd(c.bid_cpm) : ""}</td>
                    <td className="num py-4 pr-4 font-mono text-xs">{c ? percent(c.base_ctr, 1) : ""}</td>
                    <td className="py-4 pr-4 text-muted">{c ? (c.geos === "all" ? "Everywhere" : c.geos.join(", ")) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
