import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DecorIcon } from "@/components/decor-icon";
import { ArrowRightIcon } from "lucide-react";

export function CallToAction() {
  return (
    <div className="relative mx-auto flex w-full max-w-3xl flex-col justify-between gap-y-4 border-y px-4 py-8 dark:bg-[radial-gradient(35%_80%_at_25%_0%,--theme(--color-foreground/.08),transparent)]">
      <DecorIcon className="size-4" position="top-left" />
      <DecorIcon className="size-4" position="top-right" />
      <DecorIcon className="size-4" position="bottom-left" />
      <DecorIcon className="size-4" position="bottom-right" />

      <div className="pointer-events-none absolute -inset-y-6 -left-px w-px border-l" />
      <div className="pointer-events-none absolute -inset-y-6 -right-px w-px border-r" />

      <div className="absolute top-0 left-1/2 -z-10 h-full border-l border-dashed" />

      <h2 className="text-center font-semibold text-xl md:text-3xl">Start delivering in minutes</h2>
      <p className="text-balance text-center font-medium text-muted-foreground text-sm md:text-base">
        Open the live console — no account or API key required. Fire ad requests and watch decisions, latency, and
        analytics update in real time.
      </p>

      <div className="flex items-center justify-center gap-2">
        <Button asChild variant="outline">
          <Link to="/auth">Talk to sales</Link>
        </Button>
        <Button asChild>
          <Link to="/app">
            Open the console <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
