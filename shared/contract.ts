// The request/response contract shared by the API (api/) and the web app (src/).
// Everything the console shows comes from these shapes; nothing is computed
// on the client that the server did not decide.

export const PLACEMENTS = ["feed", "sidebar", "banner", "interstitial", "video"] as const;
export type Placement = (typeof PLACEMENTS)[number];

export const DEVICES = ["mobile", "desktop", "tablet", "ctv"] as const;
export type Device = (typeof DEVICES)[number];

export const SEGMENTS = ["tech", "fitness", "finance", "travel", "shopping", "gaming", "general"] as const;
export type Segment = (typeof SEGMENTS)[number];

export const COUNTRIES = ["US", "UK", "CA", "DE", "IN", "BR", "AU", "JP"] as const;
export type Country = (typeof COUNTRIES)[number];

export const INTERESTS_MAX_LENGTH = 120;

/** Words in the free-text interests field that count as a match for a segment. */
export const INTEREST_KEYWORDS: Record<Segment, string[]> = {
  tech: ["tech", "code", "coding", "developer", "devops", "cloud", "kubernetes", "software", "ai"],
  fitness: ["fitness", "running", "gym", "yoga", "health", "workout", "cycling"],
  finance: ["finance", "investing", "stocks", "money", "budget", "credit", "savings"],
  travel: ["travel", "flights", "hotels", "holiday", "vacation", "backpacking"],
  shopping: ["shopping", "deals", "fashion", "sneakers", "retail", "sale"],
  gaming: ["gaming", "games", "esports", "console", "streaming", "rpg"],
  general: [],
};

/** One ad slot that needs filling: where it is, who is looking, and what they are into. */
export interface AdRequest {
  placement: Placement;
  device: Device;
  country: Country;
  segment: Segment;
  /** Optional free-text interests, e.g. "esports, streaming". */
  interests: string;
}

/** A fictional advertiser's standing bid. */
export interface Campaign {
  id: string;
  advertiser: string;
  headline: string;
  /** The audience segment the campaign targets. */
  segment: Segment;
  /** What the advertiser bids per 1,000 impressions, in USD. */
  bid_cpm: number;
  /** The click-through rate the campaign normally gets, 0..1. */
  base_ctr: number;
  /** Countries the campaign buys, or "all". */
  geos: "all" | Country[];
}

/** "capped": the campaign already won another slot on the same page view. */
export type BidderStatus = "won" | "runner_up" | "outbid" | "below_floor" | "geo_excluded" | "capped";

/** How strongly a campaign matched the request. */
export type MatchKind = "segment" | "interest" | "broad";

/** One campaign's line in an auction. */
export interface Bidder {
  campaign_id: string;
  advertiser: string;
  headline: string;
  segment: Segment;
  bid_cpm: number;
  match: MatchKind;
  /** Predicted click-through rate for this slot, 0..1. */
  predicted_ctr: number;
  /** predicted_ctr ÷ the campaign's normal CTR. Above 1 means this slot suits it. */
  relevance: number;
  /** Rank score = bid × relevance, in USD per 1,000 impressions. Highest wins. */
  score: number;
  status: BidderStatus;
}

/** Why the winner paid what it paid. */
export type PriceBasis = "runner_up" | "floor" | "none";

/** The full, explainable outcome of one auction. */
export interface AuctionResult {
  filled: boolean;
  /** Lowest score that can win a slot, in USD CPM. */
  floor_cpm: number;
  /** What the winner pays per 1,000 impressions, in USD. 0 when unfilled. */
  clearing_price_cpm: number;
  price_basis: PriceBasis;
  winner_id: string | null;
  runner_up_id: string | null;
  /** Every campaign, ranked: competitors by score, then excluded ones. */
  bidders: Bidder[];
}

/** A recorded delivery: the request, the auction, and how long the server took. */
export interface Delivery {
  id: string;
  created_at: string;
  request: AdRequest;
  auction: AuctionResult;
  /** Milliseconds the API spent on this request, database write included. */
  server_ms: number;
}

export interface DeliveryTotals {
  count: number;
  filled: number;
  /** Sum of clearing prices for one impression each, in USD. */
  spend: number;
  avg_server_ms: number | null;
}

export interface DeliveriesPage {
  deliveries: Delivery[];
  totals: DeliveryTotals;
}

/** Where the country used for a page auction came from. */
export type CountrySource = "visitor" | "chosen" | "default";

/** Public, unrecorded auctions for every placement on one page, for one visitor. */
export interface PageAuctionResponse {
  request: Omit<AdRequest, "placement" | "interests">;
  country_source: CountrySource;
  slots: { placement: Placement; auction: AuctionResult }[];
}

export type AccountKind = "member" | "guest" | "demo";

export interface User {
  id: number;
  email: string | null;
  name: string | null;
  kind: AccountKind;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}

// Human-readable labels.

export const PLACEMENT_LABELS: Record<Placement, string> = {
  feed: "In-feed",
  sidebar: "Sidebar",
  banner: "Banner",
  interstitial: "Interstitial",
  video: "Video pre-roll",
};

export const DEVICE_LABELS: Record<Device, string> = {
  mobile: "Phone",
  desktop: "Desktop",
  tablet: "Tablet",
  ctv: "Connected TV",
};

export const SEGMENT_LABELS: Record<Segment, string> = {
  tech: "Tech",
  fitness: "Fitness",
  finance: "Finance",
  travel: "Travel",
  shopping: "Shopping",
  gaming: "Gaming",
  general: "General",
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
