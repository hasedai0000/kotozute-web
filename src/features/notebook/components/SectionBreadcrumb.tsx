import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type SectionBreadcrumbProps = {
  sectionLabel: string;
  className?: string;
};

export function SectionBreadcrumb({
  sectionLabel,
  className,
}: SectionBreadcrumbProps) {
  return (
    <nav aria-label="パンくず" className={cn("text-sm", className)}>
      <ol className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
        <li>
          <Link
            href="/notebook"
            className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            マイノート
          </Link>
        </li>
        <li aria-hidden="true" className="flex items-center">
          <ChevronRight className="size-4" />
        </li>
        <li>
          <span aria-current="page" className="text-foreground">
            {sectionLabel}
          </span>
        </li>
      </ol>
    </nav>
  );
}
