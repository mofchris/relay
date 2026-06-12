// Shared domain types for Relay — the real-time ad delivery & analytics platform.
//
// These mirror the request/response contract a decisioning service would expose
// (e.g. POST /api/serve) so the frontend and a Go/Python backend agree on shape.
// The console runs against these types in demo mode (deterministic local engine)
// or against a real backend when VITE_API_URL is set.

export const PLACEMENTS = ["feed", "sidebar", "banner", "interstitial", "video"] as const;
export type Placement = (typeof PLACEMENTS)[number];

export const DEVICES = ["mobile", "desktop", "tablet", "ctv"] as const;
export type Device = (typeof DEVICES)[number];

export const SEGMENTS = ["tech", "fitness", "finance", "travel", "shopping", "gaming", "general"] as const;
export type Segment = (typeof SEGMENTS)[number];

export const COUNTRIES = ["US", "UK", "CA", "DE", "IN", "BR", "AU", "JP"] as const;
export type Country = (typeof COUNTRIES)[number];

/** What the console submits to the decisioning engine. */
export interface AdRequest {
  placement: Placement;
  country: Country;
  device: Device;
  segment: Segment;
  /** Optional free-text interest signal that can nudge targeting. */
  interests?: string;
}

/** The decision returned by the real-time auction for a single ad request. */
export interface DeliveryDecision {
  request_id: string;
  /** Whether an eligible paid campaign won the auction (vs. a house/no-fill). */
  filled: boolean;
  campaign_id: string | null;
  advertiser: string;
  headline: string;
  /** Winning bid in CPM (cost per mille / 1,000 impressions), USD. */
  bid_cpm: number;
  /** Second-price clearing CPM actually charged, USD. */
  clearing_price_cpm: number;
  /** Predicted click-through rate, 0..1. */
  predicted_ctr: number;
  /** End-to-end decision latency in milliseconds. */
  latency_ms: number;
  /** True when the winning campaign directly targets the request segment. */
  segment_match: boolean;
  /** How many eligible campaigns entered the auction. */
  candidates_considered: number;
  /** Human-readable explanation of why this ad was served. */
  reasons: string[];
}

/** Which downstream pipelines processed this delivery event. */
export interface PipelineStatus {
  redis_cached: boolean;
  kafka_streamed: boolean;
  bigquery_logged: boolean;
}

/** Response from POST /api/serve. */
export interface DeliveryResponse {
  request_id: string;
  status: string;
  decision: DeliveryDecision;
  pipeline: PipelineStatus;
}

/** A persisted delivery as returned by GET /api/deliveries. */
export interface SavedDeliveryRecord {
  id: string;
  created_at: string;
  request: AdRequest;
  decision: DeliveryDecision;
  pipeline: PipelineStatus;
}

// Human-readable labels for enum values.

export const PLACEMENT_LABELS: Record<Placement, string> = {
  feed: "In-feed",
  sidebar: "Sidebar",
  banner: "Banner",
  interstitial: "Interstitial",
  video: "Video pre-roll",
};

export const DEVICE_LABELS: Record<Device, string> = {
  mobile: "Mobile",
  desktop: "Desktop",
  tablet: "Tablet",
  ctv: "Connected TV",
};

export const SEGMENT_LABELS: Record<Segment, string> = {
  tech: "Tech & Developers",
  fitness: "Health & Fitness",
  finance: "Finance",
  travel: "Travel",
  shopping: "Shopping & Retail",
  gaming: "Gaming",
  general: "General / Run of network",
};

export const COUNTRY_LABELS: Record<Country, string> = {
  US: "United States",
  UK: "United Kingdom",
  CA: "Canada",
  DE: "Germany",
  IN: "India",
  BR: "Brazil",
  AU: "Australia",
  JP: "Japan",
};
