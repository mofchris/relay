export const usd = (n: number) => `$${n.toFixed(2)}`;

/** Spend is fractions of a cent per impression, so show enough digits to be true. */
export const usdSmall = (n: number) =>
  n === 0 ? "$0" : n < 0.01 ? `$${n.toFixed(5)}` : n < 1 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`;

export const percent = (n: number, digits = 2) => `${(n * 100).toFixed(digits)}%`;

const NBSP = String.fromCharCode(0xa0);

export const ms = (n: number) => `${Math.round(n)}${NBSP}ms`;

export const shortId = (id: string) => id.slice(0, 8);

export const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function relativeDay(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return clock(iso);
  return `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${clock(iso)}`;
}

export function listAnd(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");
