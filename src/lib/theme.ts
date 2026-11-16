// Light / dark theme. index.html applies the stored choice before first paint;
// this hook keeps <html class="dark"> and storage in sync afterwards.

import { useCallback, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";
const KEY = "relay.theme";
const listeners = new Set<() => void>();

function current(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTheme(): [Theme, () => void] {
  const theme = useSyncExternalStore(subscribe, current, () => "light" as Theme);
  const toggle = useCallback(() => {
    const next: Theme = current() === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Not persisted; the toggle still applies to this visit.
    }
    listeners.forEach((l) => l());
  }, []);
  return [theme, toggle];
}
