// Page chrome: mark, header, theme toggle, footer.

import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cx } from "@/lib/format";

export const SOURCE_URL = "https://github.com/mofchris/relay";
export const AUTHOR_URL = "https://mofchris.pages.dev";

/** An ad slot, two-thirds sold. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 20" aria-hidden="true" className={className}>
      <defs>
        <pattern id="relay-hatch" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="1" height="3" fill="currentColor" opacity="0.45" />
        </pattern>
      </defs>
      <rect x="1" y="1" width="26" height="18" fill="url(#relay-hatch)" stroke="currentColor" strokeWidth="2" />
      <rect x="1" y="1" width="17" height="18" fill="currentColor" />
      <rect x="18" y="1" width="2" height="18" fill="var(--spec)" />
    </svg>
  );
}

export function Wordmark({ suffix }: { suffix?: string }) {
  return (
    <Link to="/" className="group inline-flex items-center gap-2.5" aria-label="Relay, home">
      <Mark className="h-5 w-7 transition-transform duration-500 ease-(--ease-out) group-hover:-translate-y-0.5" />
      <span className="text-xl font-bold tracking-[-0.04em]">Relay</span>
      {suffix && <span className="text-sm font-medium text-muted">{suffix}</span>}
    </Link>
  );
}

export function ThemeToggle() {
  const [theme, toggle] = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      className="group grid size-11 place-items-center border-[1.5px] border-line transition-colors hover:border-ink"
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      {theme === "dark" ? (
        <Sun className="size-4 transition-transform duration-500 group-hover:rotate-90" />
      ) : (
        <Moon className="size-4 transition-transform duration-500 group-hover:-rotate-[20deg]" />
      )}
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

export function NavItem({ to, children }: { to: string; children: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cx(
          "relative px-2 py-3 text-[0.9375rem] font-semibold after:absolute after:inset-x-2 after:bottom-2 after:h-0.5 after:origin-left after:bg-spec after:transition-transform after:duration-300 hover:after:scale-x-100",
          isActive ? "after:scale-x-100" : "after:scale-x-0",
        )
      }
    >
      {children}
    </NavLink>
  );
}

export function SiteHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-[84rem] items-center justify-between gap-4 px-4 py-2 sm:px-8">
        <Wordmark />
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-3">
          {children}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-28 border-t border-line">
      <div className="mx-auto grid max-w-[84rem] gap-10 px-4 py-14 sm:px-8 md:grid-cols-12">
        <div className="md:col-span-6">
          <Wordmark />
          <p className="mt-5 max-w-md text-muted">
            A portfolio project by{" "}
            <a className="link inline-block py-0.5 text-ink" href={AUTHOR_URL}>
              Christopher Mofunanya
            </a>
            . The advertisers and their ads are made up. The auctions, accounts and history are real.
          </p>
        </div>
        <ul className="flex flex-col gap-1 md:col-span-3 md:col-start-10">
          {[
            { label: "Source on GitHub", href: SOURCE_URL },
            { label: "How it is built", href: `${SOURCE_URL}#architecture` },
          ].map((l) => (
            <li key={l.label}>
              <a className="inline-block py-1.5 font-semibold hover:text-spec" href={l.href}>
                {l.label}
              </a>
            </li>
          ))}
          <li>
            <Link className="inline-block py-1.5 font-semibold hover:text-spec" to="/console">
              Console
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
