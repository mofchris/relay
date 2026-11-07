import { Link } from "react-router-dom";
import { Roll, SiteHeader, SkipLink } from "@/components/chrome";
import { useTitle } from "@/lib/useTitle";

export function NotFound() {
  useTitle("Page not found");
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="main" className="mx-auto max-w-7xl px-4 pt-16 pb-32 sm:px-8">
        <p className="font-mono text-sm text-muted">404</p>
        <h1 className="display mt-6 max-w-4xl text-[clamp(3rem,9vw,7.5rem)]">This slot went unfilled.</h1>
        <p className="mt-8 max-w-lg text-lg text-muted">
          Nothing at this address cleared the floor. The page may have moved, or the link may be mistyped.
        </p>
        <div aria-hidden="true" className="mt-12 max-w-2xl space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="hatch h-4 rounded-[3px]" style={{ width: `${100 - i * 22}%` }} />
          ))}
        </div>
        <div className="mt-12 flex flex-wrap gap-3">
          <Link to="/" className="btn btn-primary">
            <Roll>Back to the start</Roll>
          </Link>
          <Link to="/console" className="btn btn-ghost">
            <Roll>Open the console</Roll>
          </Link>
        </div>
      </main>
    </>
  );
}
