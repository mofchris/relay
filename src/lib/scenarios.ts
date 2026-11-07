import type { AdRequest } from "@shared/contract.ts";

/** Starting points offered to first-time visitors in the console. */
export const SCENARIOS: { label: string; detail: string; request: AdRequest }[] = [
  {
    label: "A gamer on their phone",
    detail: "Gaming, in-feed, United States",
    request: { segment: "gaming", device: "mobile", placement: "feed", country: "US", interests: "" },
  },
  {
    label: "A finance reader in Japan",
    detail: "Finance, sidebar, desktop, Japan",
    request: { segment: "finance", device: "desktop", placement: "sidebar", country: "JP", interests: "" },
  },
  {
    label: "A shopper watching TV",
    detail: "Shopping, video pre-roll, UK, likes travel",
    request: { segment: "shopping", device: "ctv", placement: "video", country: "UK", interests: "travel" },
  },
];
