import type React from "react";
import { Radar } from "lucide-react";
import { cn } from "@/lib/utils";

/** Standalone mark (radar sweep — real-time targeting). Sized by height via className. */
export const LogoIcon = ({ className, ...props }: React.ComponentProps<"svg">) => (
  <Radar className={cn("text-primary", className)} {...props} />
);

/** Full wordmark: radar mark + "Relay". Sized by height via className. */
export const Logo = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    className={cn("inline-flex items-center gap-1.5 font-semibold tracking-tight text-foreground", className)}
    {...props}
  >
    <Radar className="h-full w-auto shrink-0 text-primary" aria-hidden="true" />
    <span className="whitespace-nowrap text-[1.05rem] leading-none">Relay</span>
  </div>
);
