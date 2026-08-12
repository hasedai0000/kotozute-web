import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  SECTIONS,
  SECTION_ORDER,
  type SectionSlug,
} from "../constants/sections";

type SectionNavProps = {
  currentSlug: SectionSlug;
  className?: string;
};

export function SectionNav({ currentSlug, className }: SectionNavProps) {
  const index = SECTION_ORDER.indexOf(currentSlug);
  const prev = index > 0 ? SECTION_ORDER[index - 1] : undefined;
  const next =
    index >= 0 && index < SECTION_ORDER.length - 1
      ? SECTION_ORDER[index + 1]
      : undefined;

  return (
    <nav
      aria-label="セクション間の移動"
      className={cn("flex items-center justify-between gap-3", className)}
    >
      <div className="flex-1">
        {prev ? (
          <Link
            href={`/notebook/${prev}`}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors",
              "hover:bg-muted hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            )}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            <span>前へ：{SECTIONS[prev].label}</span>
          </Link>
        ) : null}
      </div>
      <div className="flex flex-1 justify-end">
        {next ? (
          <Link
            href={`/notebook/${next}`}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors",
              "hover:bg-muted hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            )}
          >
            <span>次へ：{SECTIONS[next].label}</span>
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
