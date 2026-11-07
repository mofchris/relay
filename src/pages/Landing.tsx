import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, RotateCw } from "lucide-react";
import { COUNTRY_LABELS, SEGMENT_LABELS, SEGMENTS } from "@shared/contract.ts";
import type { AuctionResult, Campaign, PageAuctionResponse, Placement, Segment } from "@shared/contract.ts";
import { NavItem, SiteFooter, SiteHeader, SkipLink } from "@/components/chrome";
import { Slot } from "@/components/Slot";
import { api, messageOf } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { cx, percent, usd } from "@/lib/format";
import { useTitle } from "@/lib/useTitle";

const IDLE_MS = 7000;

function useDevice() {
  const [mobile] = useState(() => window.matchMedia("(max-width: 767px)").matches);
  return mobile ? "mobile" : "desktop";
}

export function Landing() {
  useTitle(null);
  const device = useDevice();
  const [segment, setSegment] = useState<Segment>("general");
  const [pinned, setPinned] = useState(false);
  const [page, setPage] = useState<PageAuctionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const hero = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    api
      .pageAuction({ segment, device })
      .then((p) => {
        if (!active) return;
        setPage(p);
        setError(null);
      })
      .catch((e) => active && setError(messageOf(e)));
    return () => {
      active = false;
    };
  }, [segment, device, attempt]);

  // Idle: while nobody has picked a reader and the hero is on screen, re-sell
  // the page to the next audience every few seconds.
  useEffect(() => {
    if (!page || pinned || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let visible = true;
    const observer = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    if (hero.current) observer.observe(hero.current);
    const timer = setInterval(() => {
      if (visible && !document.hidden) setSegment((s) => SEGMENTS[(SEGMENTS.indexOf(s) + 1) % SEGMENTS.length]);
    }, IDLE_MS);
    return () => {
      clearInterval(timer);
      observer.disconnect();
    };
  }, [page, pinned]);

  const slot = (placement: Placement): AuctionResult | null =>
    page?.slots.find((s) => s.placement === placement)?.auction ?? null;
  const country = page?.request.country ?? "US";

  return (
    <>
      <SkipLink />
      <SiteHeader>
        <a href="#how" className="hidden px-2 py-3 text-[0.9375rem] font-semibold hover:text-spec sm:inline-block">
          How it works
        </a>
        <NavItem to="/console">Console</NavItem>
      </SiteHeader>

      <main id="main" className="mx-auto max-w-[84rem] px-4 sm:px-8">
        <div ref={hero} onPointerDown={() => setPinned(true)} onFocusCapture={() => setPinned(true)}>
          <Slot placement="banner" auction={slot("banner")} country={country} className="mt-6" />

          <div className="mt-14 grid gap-12 lg:grid-cols-12 lg:gap-8">
            <section className="lg:col-span-8" aria-labelledby="hero-title">
              <h1 id="hero-title" className="display -ml-[0.05em] text-[clamp(2.9rem,7.4vw,7rem)]">
                The ads on this page were auctioned when you opened it.
              </h1>
              <p className="mt-8 max-w-[38rem] text-lg text-muted sm:text-xl">
                Relay is a working ad server. It just sold this page's five ad slots to six fictional advertisers, on the
                server, in real time. Each slot shows who won, what they paid and why. Nothing was recorded and nobody was
                charged.
              </p>

              <Audience
                segment={segment}
                page={page}
                onPick={(s) => {
                  setPinned(true);
                  setSegment(s);
                }}
              />
              {error && (
                <p role="alert" className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                  <span>The auction did not load. {error}</span>
                  <button type="button" className="link" onClick={() => setAttempt((n) => n + 1)}>
                    <RotateCw className="mr-1 inline size-3.5" aria-hidden="true" />
                    Try again
                  </button>
                </p>
              )}
              <StartButtons className="mt-10" />
            </section>

            <aside className="lg:col-span-4" aria-label="Sidebar ad">
              <Slot placement="sidebar" auction={slot("sidebar")} country={country} className="mx-auto max-w-[22rem] lg:sticky lg:top-6" />
            </aside>
          </div>
        </div>

        <HowItWorks feed={slot("feed")} country={country} />

        <Slot placement="interstitial" auction={slot("interstitial")} country={country} className="mt-24" />

        <Bidders video={slot("video")} country={country} />

        <section aria-labelledby="cta-title" className="mt-28 border-t-[3px] border-ink pt-10">
          <h2 id="cta-title" className="display max-w-4xl text-[clamp(2.4rem,5.5vw,5rem)]">
            Now describe a slot of your own and sell it.
          </h2>
          <p className="mt-6 max-w-xl text-lg text-muted">
            The console keeps every auction you run, so you can change one thing and compare.
          </p>
          <StartButtons className="mt-8" />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function Audience({ segment, page, onPick }: { segment: Segment; page: PageAuctionResponse | null; onPick: (s: Segment) => void }) {
  const source = page?.country_source;
  return (
    <div className="mt-10">
      <p id="audience-label" className="label">
        Sell the page again, to a different reader
      </p>
      <div role="radiogroup" aria-labelledby="audience-label" className="mt-3 flex flex-wrap">
        {SEGMENTS.map((s) => (
          <button key={s} type="button" role="radio" aria-checked={s === segment} className="opt" onClick={() => onPick(s)}>
            {SEGMENT_LABELS[s]}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted">
        {page ? (
          <>
            Sold for a {page.request.device === "mobile" ? "phone" : "desktop"} reader in {COUNTRY_LABELS[page.request.country]}
            {source === "visitor" ? ", which is where your connection comes from." : ". Relay only sells eight countries, so readers elsewhere count as US."}
          </>
        ) : (
          "Selling the page…"
        )}
      </p>
    </div>
  );
}

function StartButtons({ className }: { className?: string }) {
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
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn btn-solid" onClick={start} disabled={busy}>
          {busy ? "Opening your sandbox…" : status === "signed-in" ? "Back to your console" : "Run your own auctions"}
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
        {status !== "signed-in" && (
          <Link to="/signin" className="btn">
            Sign in
          </Link>
        )}
      </div>
      {status !== "signed-in" && <p className="mt-3 text-sm text-muted">No sign-up needed. A guest sandbox lasts three days.</p>}
      {error && (
        <p role="alert" className="mt-3 text-sm text-spec">
          {error}
        </p>
      )}
    </div>
  );
}

function HowItWorks({ feed, country }: { feed: AuctionResult | null; country: PageAuctionResponse["request"]["country"] }) {
  return (
    <section id="how" aria-labelledby="how-title" className="mt-28 scroll-mt-6 grid gap-12 lg:grid-cols-12 lg:gap-8">
      <article className="lg:col-span-8">
        <h2 id="how-title" className="display text-[clamp(2.4rem,5.5vw,5rem)]">
          How one slot gets sold
        </h2>
        <Step n={1} title="Filter">
          A request arrives describing the slot and the reader: placement, device, country and audience. Campaigns that
          do not buy that country sit the auction out. Lumen Finance, for one, only buys the US, the UK and Canada.
        </Step>
        <Slot placement="feed" auction={feed} country={country} className="my-12" />
        <Step n={2} title="Score">
          Every remaining bid is weighted by relevance: how much better than usual this ad should do here. An audience
          match, a phone or a video slot all push it up; a banner pulls it down. Score is bid × relevance.
        </Step>
        <Step n={3} title="Price">
          The highest score wins. It does not pay its full bid: it pays the lowest bid that would still have beaten the
          runner-up, plus one cent. Below the $0.50 floor, nobody wins and the slot stays empty. Open any receipt on this
          page to see the numbers.
        </Step>
        <Step n={4} title="Record">
          Here, nothing is kept. In the console, every auction you run is saved to your account in a Cloudflare D1
          database, with the time the server took to decide it.
        </Step>
      </article>

      <aside className="lg:col-span-4" aria-labelledby="disclosure-title">
        <div className="border-[1.5px] border-ink p-6 lg:sticky lg:top-6">
          <h2 id="disclosure-title" className="heading text-xl">
            Advertising disclosure
          </h2>
          <h3 className="mt-6 font-semibold">Real</h3>
          <ul className="mt-2 space-y-2 text-[0.9375rem] text-muted">
            <li>The auctions. They run on the server, in a Cloudflare Worker, every time, and the same request always gets the same result.</li>
            <li>Accounts, with PBKDF2 password hashing and signed sessions.</li>
            <li>Your history in the console, and the timings it shows.</li>
          </ul>
          <h3 className="mt-6 font-semibold">Fictional</h3>
          <ul className="mt-2 space-y-2 text-[0.9375rem] text-muted">
            <li>All six advertisers, their ads, bids and usual click rates.</li>
            <li>The readers. No ad is shown to anyone else and no money moves.</li>
            <li>The relevance factors for device and placement, which are fixed estimates.</li>
          </ul>
        </div>
      </aside>
    </section>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: string }) {
  return (
    <div className="mt-10 grid grid-cols-[2.5rem_1fr] gap-x-4 sm:grid-cols-[3.5rem_1fr]">
      <span className="num pt-1 text-sm text-spec" aria-hidden="true">
        0{n}
      </span>
      <div>
        <h3 className="heading text-2xl">{title}</h3>
        <p className="mt-2 max-w-[40rem] text-muted">{children}</p>
      </div>
    </div>
  );
}

function Bidders({ video, country }: { video: AuctionResult | null; country: PageAuctionResponse["request"]["country"] }) {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api
      .campaigns()
      .then((r) => setCampaigns([...r.campaigns].sort((a, b) => b.bid_cpm - a.bid_cpm)))
      .catch(() => setFailed(true));
  }, []);

  return (
    <section aria-labelledby="bidders-title" className="mt-28 grid gap-12 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-7">
        <h2 id="bidders-title" className="display text-[clamp(2.4rem,5.5vw,5rem)]">
          The six bidders
        </h2>
        <p className="mt-6 max-w-lg text-muted">Read live from the database. Each has one standing bid and the audience it wants.</p>
        <div className="mt-8 overflow-x-auto">
          {failed ? (
            <p className="text-muted">The advertiser list did not load. Refresh to try again.</p>
          ) : (
            <table className="w-full min-w-[32rem] text-left text-[0.9375rem]">
              <caption className="sr-only">Fictional advertisers and their bids</caption>
              <thead>
                <tr className="border-b-[3px] border-ink">
                  {["Advertiser", "Wants", "Bid per 1,000", "Usual CTR", "Buys in"].map((h) => (
                    <th key={h} scope="col" className="label py-3 pr-4">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={cx(!campaigns && "animate-pulse")}>
                {(campaigns ?? Array.from({ length: 6 }, () => null)).map((c, i) => (
                  <tr key={c?.id ?? i} className="border-b border-line">
                    <th scope="row" className="py-3.5 pr-4 font-semibold">
                      {c ? c.advertiser : <span className="block h-4 w-28 bg-panel" />}
                    </th>
                    <td className="py-3.5 pr-4">{c ? SEGMENT_LABELS[c.segment] : ""}</td>
                    <td className="num py-3.5 pr-4">{c ? usd(c.bid_cpm) : ""}</td>
                    <td className="num py-3.5 pr-4">{c ? percent(c.base_ctr, 1) : ""}</td>
                    <td className="py-3.5 pr-4 text-muted">{c ? (c.geos === "all" ? "Everywhere" : c.geos.join(", ")) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <div className="lg:col-span-5 lg:pt-4">
        <Slot placement="video" auction={video} country={country} />
      </div>
    </section>
  );
}
