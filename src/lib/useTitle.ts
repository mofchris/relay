import { useEffect } from "react";

const BASE = "Relay";

/** Set the document title for a page; null gives the home title. */
export function useTitle(page: string | null) {
  useEffect(() => {
    document.title = page ? `${page} · ${BASE}` : `${BASE}: an ad server you can watch think`;
  }, [page]);
}
