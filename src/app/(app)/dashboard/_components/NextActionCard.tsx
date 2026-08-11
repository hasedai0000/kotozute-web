"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNoteSummary } from "@/features/notebook/api/useNoteSummary";
import {
  SECTIONS,
  SECTION_ORDER,
  type SectionSlug,
} from "@/features/notebook/constants/sections";
import { computeSectionProgress } from "@/features/notebook/hooks/useSectionProgress";

function pickNextSection(
  perSection: Record<
    SectionSlug,
    { filledFields: number; entryCountByCategory: Partial<Record<string, number>> }
  >,
): SectionSlug {
  let bestSlug: SectionSlug = SECTION_ORDER[0];
  let bestPercent = Number.POSITIVE_INFINITY;
  for (const slug of SECTION_ORDER) {
    const s = perSection[slug];
    const { total, percent } = computeSectionProgress({
      section: slug,
      filledFields: s?.filledFields,
      entryCountByCategory: s?.entryCountByCategory,
    });
    if (total === 0) continue;
    if (percent < bestPercent) {
      bestPercent = percent;
      bestSlug = slug;
    }
  }
  return bestSlug;
}

export function NextActionCard() {
  const { data, isPending, isError } = useNoteSummary();

  const next = useMemo<SectionSlug | null>(() => {
    if (!data) return null;
    return pickNextSection(data.perSection);
  }, [data]);

  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-2 h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !next) return null;

  const def = SECTIONS[next];

  return (
    <Card>
      <CardHeader>
        <CardDescription>次にやること</CardDescription>
        <CardTitle>「{def.label}」を書き足しましょう</CardTitle>
      </CardHeader>
      <CardContent>
        <Button
          size="sm"
          render={
            <Link href={`/notebook/${next}`}>
              このセクションへ
              <ArrowRight />
            </Link>
          }
        />
      </CardContent>
    </Card>
  );
}
