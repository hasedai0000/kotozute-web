import { Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type TimingVariant = "always" | "posthumous";

type TimingBadgeProps = {
  variant: TimingVariant;
  className?: string;
};

const LABEL: Record<TimingVariant, string> = {
  always: "常時共有",
  posthumous: "死後開示",
};

export function TimingBadge({ variant, className }: TimingBadgeProps) {
  const isPosthumous = variant === "posthumous";
  return (
    <Badge
      className={cn(
        "border-transparent",
        variant === "always" &&
          "bg-timing-always text-timing-always-foreground",
        isPosthumous &&
          "bg-timing-posthumous text-timing-posthumous-foreground",
        className,
      )}
      aria-label={LABEL[variant]}
    >
      {isPosthumous ? <Lock aria-hidden="true" /> : null}
      <span>{LABEL[variant]}</span>
    </Badge>
  );
}
