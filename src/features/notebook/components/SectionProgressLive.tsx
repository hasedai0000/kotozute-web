"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { useNoteSummary } from "../api/useNoteSummary";
import { type SectionSlug } from "../constants/sections";
import { useSectionProgress } from "../hooks/useSectionProgress";

import { SectionProgress } from "./SectionProgress";

type SectionProgressLiveProps = {
  slug: SectionSlug;
  className?: string;
};

export function SectionProgressLive({
  slug,
  className,
}: SectionProgressLiveProps) {
  const { data, isPending } = useNoteSummary();
  const s = data?.perSection[slug];
  const { filled, total } = useSectionProgress({
    section: slug,
    filledFields: s?.filledFields,
    entryCountByCategory: s?.entryCountByCategory,
  });

  if (isPending) {
    return (
      <div
        role="status"
        aria-label="進捗を読み込み中"
        className={cn("flex flex-col gap-1.5", className)}
      >
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
    );
  }

  return (
    <SectionProgress filled={filled} total={total} className={className} />
  );
}
