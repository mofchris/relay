import { Link } from "react-router-dom";
import { SiteHeader, SkipLink } from "@/components/chrome";
import { useTitle } from "@/lib/useTitle";

export function NotFound() {
  useTitle("Page not found");
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="main" className="mx-auto max-w-7xl px-4 pt-16 pb-32 sm:px-8">
        
        <h1 className="display mt-6 max-w-4xl text-[clamp(3rem,9vw,7.5rem)]">This slot went unfilled.</h1>
        <p className="mt-8 max-w-lg text-lg text-muted">
          Nothing at this address cleared the floor. The page may have moved, or the link may be mistyped.
        </p>
        <div aria-hidden="true" className="mt-12 max-w-3xl">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2.5 border-l border-spec" />
            <span className="h-px flex-1 bg-spec" />
            <span className="spec">404 × 404 Unfilled</span>
            <span className="h-px flex-1 bg-spec" />
            <span className="h-2.5 border-l border-spec" />
          </div>
          <div className="hatch grid aspect-[728/90] place-items-center border border-line">
            <span className="bg-ground px-2 py-1 text-sm font-semibold">Unsold</span>
          </div>
        </div>
        <div className="mt-12 flex flex-wrap gap-3">
          <Link to="/" className="btn btn-solid">
            Back to the start
          </Link>
          <Link to="/console" className="btn">
            Open the console
          </Link>
        </div>
      </main>
    </>
  );
}
