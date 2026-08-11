"use client";

import { useMemo } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useNoteSummary } from "@/features/notebook/api/useNoteSummary";
import { SectionProgress } from "@/features/notebook/components/SectionProgress";
import { SECTION_ORDER } from "@/features/notebook/constants/sections";
import { computeSectionProgress } from "@/features/notebook/hooks/useSectionProgress";

export function DashboardGreeting() {
  const { user, isLoading: authLoading } = useAuth();
  const { data, isPending, isError } = useNoteSummary();

  const totals = useMemo(() => {
    if (!data) return { filled: 0, total: 0 };
    return SECTION_ORDER.reduce(
      (acc, slug) => {
        const s = data.perSection[slug];
        const p = computeSectionProgress({
          section: slug,
          filledFields: s?.filledFields,
          entryCountByCategory: s?.entryCountByCategory,
        });
        return { filled: acc.filled + p.filled, total: acc.total + p.total };
      },
      { filled: 0, total: 0 },
    );
  }, [data]);

  return (
    <section aria-label="全体の記入状況" className="flex flex-col gap-3">
      <div>
        {authLoading ? (
          <Skeleton className="h-7 w-64" />
        ) : (
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            {user?.name ? `${user.name} さん、こんにちは` : "こんにちは"}
          </h1>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          今日も、家族に残したいことを少しずつ書き足していきましょう。
        </p>
      </div>

      {isPending ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      ) : isError ? (
        <p className="text-sm text-muted-foreground">
          進捗を読み込めませんでした。
        </p>
      ) : (
        <SectionProgress
          filled={totals.filled}
          total={totals.total}
          label="全体の記入状況"
        />
      )}
    </section>
  );
}
