import type React from "react";
import {
  Zap,
  Target,
  Activity,
  Database,
  Radio,
  BarChart3,
  Boxes,
  Network,
  Gauge,
  Server,
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Real-time decisioning",
    body: "Every ad request runs a second-price auction across eligible campaigns and returns a winner in single-digit milliseconds.",
  },
  {
    icon: Target,
    title: "Audience targeting",
    body: "Match on segment, geo, device, placement, and interest signals — with campaign and budget rules applied at request time.",
  },
  {
    icon: Activity,
    title: "Streaming analytics",
    body: "Impressions, clicks, and conversions stream through Kafka the instant they happen, powering live campaign dashboards.",
  },
  {
    icon: Database,
    title: "Edge caching",
    body: "Redis keeps hot campaigns and feature data in memory, collapsing tail latency for high-traffic placements.",
  },
];

const stack = ["Go", "Python", "Kafka", "Redis", "PostgreSQL", "BigQuery", "Kubernetes", "Docker"];

const steps = [
  { icon: Radio, title: "1. Request", body: "An ad request arrives with user, placement, geo, and device context." },
  { icon: Zap, title: "2. Decide", body: "The engine runs a real-time auction across eligible campaigns and returns the winning creative." },
  { icon: BarChart3, title: "3. Measure", body: "The delivery event streams through Kafka to Redis, PostgreSQL, and BigQuery for live analytics." },
];

const metrics = [
  { value: "<10ms", label: "p99 decision latency" },
  { value: "2.4M", label: "requests / sec at peak" },
  { value: "40B+", label: "events streamed / day" },
  { value: "99.99%", label: "delivery uptime" },
];

export function FeaturesSection() {
  return (
    <section id="features" className="mx-auto w-full max-w-4xl scroll-mt-24 px-4 py-16 md:py-24">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="text-2xl font-semibold md:text-4xl">Everything an ad stack needs, in real time</h2>
        <p className="mt-3 text-muted-foreground">
          From the request hitting the edge to the impression landing in your dashboard — without batch jobs or lag.
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {features.map((f) => (
          <div key={f.title} className="rounded-xl border bg-card p-5 transition-colors hover:border-primary/40">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <f.icon className="size-5" />
            </div>
            <h3 className="mt-4 font-semibold">{f.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <p className="text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Built on a battle-tested stack
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {stack.map((tech) => (
            <span
              key={tech}
              className="rounded-md border bg-card px-3 py-1 font-mono text-xs text-muted-foreground"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>

      <div id="how-it-works" className="scroll-mt-24 pt-20">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-semibold md:text-4xl">How it works</h2>
          <p className="mt-3 text-muted-foreground">Three hops from request to live analytics.</p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.title} className="rounded-xl border bg-card p-6 text-center">
              <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <s.icon className="size-5" />
              </div>
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div id="reliability" className="scroll-mt-24 pt-20">
        <div className="mx-auto max-w-3xl rounded-2xl border bg-card p-8 md:p-10">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Server className="size-6" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold md:text-3xl">Built to scale</h2>
          <p className="mt-2 text-muted-foreground">
            Distributed, event-driven, and observable — so delivery stays fast and measurable under load.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-4">
            {metrics.map((m) => (
              <div key={m.label} className="bg-card px-4 py-4 text-center">
                <p className="font-semibold text-2xl tracking-tight tabular-nums md:text-3xl">{m.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{m.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <ReliabilityPoint icon={Boxes} title="Horizontal scale">
              Kubernetes autoscaling absorbs spikes from thousands to millions of requests per second.
            </ReliabilityPoint>
            <ReliabilityPoint icon={Database} title="Low-latency cache">
              Redis serves hot campaigns and counters from memory to keep p99 in single-digit milliseconds.
            </ReliabilityPoint>
            <ReliabilityPoint icon={Network} title="Event-driven">
              Kafka decouples delivery from analytics ingestion, so a slow consumer never slows serving.
            </ReliabilityPoint>
            <ReliabilityPoint icon={Gauge} title="Observability">
              Live dashboards track fill rate, latency, and spend, with BigQuery for deep historical analysis.
            </ReliabilityPoint>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReliabilityPoint({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Server;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}
