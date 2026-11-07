// Shared page chrome: wordmark, rolling button labels, theme toggle, header, footer.

import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cx } from "@/lib/format";

export const SOURCE_URL = "https://github.com/mofchris/relay";
export const AUTHOR_URL = "https://mofchris.pages.dev";

/** Three bars of a bid ladder, the first one leading. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <rect x="2" y="3" width="20" height="4.5" rx="1" fill="var(--accent)" />
      <rect x="2" y="9.75" width="13" height="4.5" rx="1" fill="currentColor" />
      <rect x="2" y="16.5" width="8" height="4.5" rx="1" fill="currentColor" opacity="0.45" />
    </svg>
  );
}

export function Wordmark({ to = "/", suffix }: { to?: string; suffix?: string }) {
  return (
    <Link to={to} className="group inline-flex items-center gap-2 rounded-sm" aria-label="Relay, home">
      <Mark className="size-6 transition-transform duration-500 ease-(--ease-lock) group-hover:-translate-y-0.5" />
      <span className="text-lg font-extrabold tracking-[-0.03em] [font-stretch:125%]">Relay</span>
      {suffix && <span className="hidden text-sm font-medium text-muted sm:inline">{suffix}</span>}
    </Link>
  );
}

/** A label that rolls to an identical copy on hover (see .roll in index.css). */
export function Roll({ children }: { children: string }) {
  return (
    <span className="roll">
      <span>{children}</span>
      <span aria-hidden="true">{children}</span>
    </span>
  );
}

export function ThemeToggle() {
  const [theme, toggle] = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      className="grid size-11 place-items-center rounded-full border border-line transition-colors hover:border-ink"
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

export function SkipLink() {
  return (
    <a href="#main" className="skip-link">
      Skip to content
    </a>
  );
}

export function SiteHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
      <Wordmark />
      <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
        {children}
        <ThemeToggle />
      </nav>
    </header>
  );
}

export function NavItem({ to, children }: { to: string; children: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cx("hidden rounded-full px-3 py-2 text-sm font-semibold sm:inline-flex", isActive ? "text-ink" : "text-muted hover:text-ink")
      }
    >
      <Roll>{children}</Roll>
    </NavLink>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-8 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="display text-[clamp(3.5rem,14vw,10rem)] leading-[0.8]" aria-hidden="true">
            Relay
          </p>
          <p className="mt-6 max-w-md text-sm text-muted">
            A portfolio project by{" "}
            <a className="font-semibold text-ink underline" href={AUTHOR_URL}>
              Christopher Mofunanya
            </a>
            . The advertisers and their bids are made up; the auction, accounts and history are real.
          </p>
        </div>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
          <li>
            <a className="text-muted underline-offset-4 hover:text-ink hover:underline" href={SOURCE_URL}>
              Source on GitHub
            </a>
          </li>
          <li>
            <Link className="text-muted underline-offset-4 hover:text-ink hover:underline" to="/console">
              Console
            </Link>
          </li>
          <li>
            <a className="text-muted underline-offset-4 hover:text-ink hover:underline" href={`${SOURCE_URL}#readme`}>
              How it's built
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
