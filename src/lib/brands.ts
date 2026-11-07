// Look and feel for the six fictional advertisers' ads. Purely cosmetic: who
// wins and what they pay always comes from the server's auction.

import type { Placement } from "@shared/contract.ts";

export type MarkShape = "hex" | "helix" | "arc" | "pulse" | "wave" | "tag";

export interface Brand {
  bg: string;
  fg: string;
  accent: string;
  /** Text colour on the accent-coloured call-to-action. */
  ctaFg: string;
  mark: MarkShape;
  cta: string;
  upper: boolean;
  italic: boolean;
}

const FALLBACK: Brand = { bg: "#1b1b1f", fg: "#ffffff", accent: "#d6006f", ctaFg: "#ffffff", mark: "hex", cta: "Learn more", upper: false, italic: false };

export const BRANDS: Record<string, Brand> = {
  cmp_nova: { bg: "#120f3a", fg: "#ffffff", accent: "#79f2ff", ctaFg: "#120f3a", mark: "hex", cta: "Deploy now", upper: false, italic: false },
  cmp_helix: { bg: "#c8ff1a", fg: "#0a0a0b", accent: "#0a0a0b", ctaFg: "#c8ff1a", mark: "helix", cta: "Play free", upper: true, italic: true },
  cmp_lumen: { bg: "#0f3b2c", fg: "#f3e8c9", accent: "#e6bd5f", ctaFg: "#0f3b2c", mark: "arc", cta: "Check your rate", upper: true, italic: false },
  cmp_pulse: { bg: "#d1382a", fg: "#ffffff", accent: "#ffe1dc", ctaFg: "#a3221a", mark: "pulse", cta: "Start running", upper: false, italic: false },
  cmp_drift: { bg: "#bfe4f3", fg: "#0b2a3a", accent: "#ff7a2f", ctaFg: "#0b2a3a", mark: "wave", cta: "See the deals", upper: false, italic: false },
  cmp_bytemart: { bg: "#ffd60a", fg: "#111111", accent: "#e3121b", ctaFg: "#ffffff", mark: "tag", cta: "Shop the sale", upper: true, italic: false },
};

export const brandOf = (campaignId: string | null | undefined): Brand => (campaignId && BRANDS[campaignId]) || FALLBACK;

/** Standard sizes for each placement, as ad-ops spec sheets name them. */
export const SLOT_SPECS: Record<Placement, { name: string; size: string; ratio: string }> = {
  banner: { name: "Leaderboard", size: "728 × 90", ratio: "728 / 90" },
  sidebar: { name: "Medium rectangle", size: "300 × 250", ratio: "300 / 250" },
  feed: { name: "Native in-feed", size: "1200 × 628", ratio: "1200 / 628" },
  interstitial: { name: "Interstitial", size: "1024 × 576", ratio: "1024 / 576" },
  video: { name: "Video pre-roll", size: "640 × 360", ratio: "640 / 360" },
};
