# Relay — Real-Time Ad Delivery & Analytics

Relay is a real-time ad delivery and analytics platform: it serves targeted ads in
single-digit milliseconds and measures every impression as it happens. This repository
is the **web frontend** — a marketing site plus a live **Ad Delivery Console** that
runs the core decisioning logic in the browser so the whole experience works with no
backend.

> Portfolio / demo project. Traffic is synthetic and the auction runs locally — no real
> ads are served and no personal data is collected.

![Landing page](docs/landing.png)

---

## Contents

- [What it does](#what-it-does)
- [Screenshots](#screenshots)
- [How the demo works](#how-the-demo-works)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Routes](#routes)
- [Design system](#design-system)
- [License](#license)

---

## What it does

The product idea: a backend platform that **delivers targeted ads and tracks campaign
performance in real time**, built on distributed, event-driven infrastructure (Go,
Python, Kafka, Redis, PostgreSQL, BigQuery, Kubernetes, Docker).

This frontend showcases that platform and lets you exercise the decisioning path:

- **Real-time decisioning** — every ad request runs a second-price auction across
  eligible campaigns and returns a winner in single-digit milliseconds.
- **Audience targeting** — matches on segment, geo, device, placement, and free-text
  interest signals, with per-campaign geo eligibility.
- **Streaming analytics** — each delivery emits an event and updates live KPIs
  (requests served, fill rate, average latency, estimated revenue).
- **Pipeline visibility** — every decision shows its downstream side-effects: Redis
  cache hit/miss, streamed to Kafka, logged to BigQuery.

## Screenshots

| Ad Delivery Console | Sign in |
| --- | --- |
| ![Console](docs/console.png) | ![Auth](docs/auth.png) |

The console: pick a targeting context, click **Serve an ad**, and inspect the winning
campaign, the clearing price, the predicted CTR, the decision trace, and the event
pipeline. Recent deliveries and KPIs update on every request.

## How the demo works

The console talks to a small API client (`src/lib/api.ts`) that runs in one of two modes:

1. **Demo / offline (default).** With no `VITE_API_URL` set, decisions are computed by a
   deterministic engine in `src/lib/mock.ts` and persisted to `localStorage`. The engine
   models the core of an ad exchange:
   - filter campaigns by geo eligibility,
   - score each by **eCPM = bid × predicted CTR**, where predicted CTR is adjusted for
     segment match, device, and placement,
   - run a **second-price auction** (the winner pays just enough to beat the runner-up,
     capped at its own bid),
   - fall back to a house ad if nothing clears the price floor.

   The same request always produces the same decision, which keeps the demo stable.

2. **Connected.** Set `VITE_API_URL` and the client calls a real serving backend instead
   (`POST /api/serve`, `GET /api/deliveries`, `GET /api/deliveries/:id`). The TypeScript
   types in `src/lib/types.ts` define the request/response contract a Go/Python service
   would implement.

No API keys ever live in the browser — connected mode expects a server that owns them.

## Tech stack

**Frontend (this repo)**

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) for dev/build
- [Tailwind CSS v4](https://tailwindcss.com/) with the `radix-nova` shadcn style
- UI blocks from the [@efferd](https://efferd.com) registry (hero, auth, footer, CTA)
- [React Router](https://reactrouter.com/), [Motion](https://motion.dev/),
  [lucide-react](https://lucide.dev/), [Geist](https://vercel.com/font)

**Backend the platform targets** (not in this repo)

- Go and Python services, Kafka streaming, Redis caching, PostgreSQL, BigQuery,
  orchestrated with Kubernetes and Docker.

## Project structure

```
src/
├── App.tsx                     # routes: / , /auth , /app
├── main.tsx                    # React entry
├── index.css                   # Tailwind v4 + design tokens (slate/neutral theme)
├── pages/
│   ├── landing-page.tsx        # marketing page composition
│   └── console-page.tsx        # Ad Delivery Console (KPIs + form + results)
├── components/
│   ├── hero.tsx                # hero + on-brand delivery-decision preview
│   ├── features-section.tsx    # features, "how it works", reliability + metrics
│   ├── cta.tsx  footer.tsx  header.tsx  mobile-nav.tsx
│   ├── auth-page.tsx           # sign-in screen
│   ├── ad-request-form.tsx     # targeting form -> serveAd()
│   ├── delivery-card.tsx       # winning decision, metrics, trace, pipeline
│   ├── recent-deliveries.tsx   # delivery history list
│   ├── logo.tsx                # Relay wordmark (radar mark)
│   └── ui/                     # shadcn primitives (button, card, select, ...)
└── lib/
    ├── types.ts                # AdRequest / DeliveryDecision / pipeline contract
    ├── mock.ts                 # deterministic auction + decisioning engine
    ├── api.ts                  # demo (localStorage) or connected (HTTP) client
    └── utils.ts                # cn() helper
```

## Getting started

Prerequisites: **Node 18+** and npm.

```bash
npm install      # install dependencies
npm run dev      # start the dev server at http://localhost:5173
```

Other scripts:

```bash
npm run build    # type-check (tsc -b) and build to dist/
npm run preview  # serve the production build locally
npm run lint     # run ESLint
```

## Configuration

Environment variables (Vite reads `VITE_`-prefixed vars; put them in `.env.local`):

| Variable        | Default | Effect                                                        |
| --------------- | ------- | ------------------------------------------------------------- |
| `VITE_API_URL`  | _unset_ | Unset → demo mode (local engine). Set → call a real backend.  |

Connected-mode backend contract:

| Method & path                | Body / returns                          |
| ---------------------------- | --------------------------------------- |
| `POST /api/serve`            | `AdRequest` → `DeliveryResponse`        |
| `GET  /api/deliveries`       | → `SavedDeliveryRecord[]`               |
| `GET  /api/deliveries/:id`   | → `SavedDeliveryRecord`                 |

## Routes

| Path    | Page                | Notes                                             |
| ------- | ------------------- | ------------------------------------------------- |
| `/`     | Landing             | Hero, features, how-it-works, reliability, CTA    |
| `/auth` | Sign in             | Social + email (UI only in the demo)              |
| `/app`  | Ad Delivery Console | The interactive decisioning + analytics surface   |
| `*`     | →  `/`              | Unknown routes redirect home                      |

## Design system

The theme is a restrained slate/neutral palette defined as CSS custom properties in
`src/index.css` (light + dark token sets), built on the `radix-nova` shadcn style. Marketing
sections reuse the @efferd block aesthetic — faded guide rails, corner "+" decor icons, and
full-width dividers — for a consistent, editorial look. Typography is Geist.

## License

MIT — see [LICENSE](LICENSE). Trademarks, advertiser names, and campaign copy in the demo
are fictional and used for illustration only.
