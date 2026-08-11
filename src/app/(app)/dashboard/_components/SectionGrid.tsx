"use client";

import { EmptyState } from "@/components/layout/EmptyState";
import { Button } from "@/components/ui/button";
import { useNoteSummary } from "@/features/notebook/api/useNoteSummary";
import { SectionCard } from "@/features/notebook/components/SectionCard";
import { SectionCardSkeleton } from "@/features/notebook/components/SectionCardSkeleton";
import { SECTION_ORDER } from "@/features/notebook/constants/sections";

import { MessagesCard } from "./MessagesCard";

const SKELETON_COUNT = SECTION_ORDER.length + 1; // 7 sections + messages

export function SectionGrid() {
  const { data, isPending, isError, refetch } = useNoteSummary();

  if (isPending) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <SectionCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        title="ノート情報を読み込めませんでした"
        description="通信を確認してから、もう一度お試しください。"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void refetch();
            }}
          >
            再試行
          </Button>
        }
      />
    );
  }

  const perSection = data?.perSection;
  const messagesCount = data?.messagesCount ?? 0;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      {SECTION_ORDER.map((slug) => {
        const s = perSection?.[slug];
        return (
          <SectionCard
            key={slug}
            slug={slug}
            filledFields={s?.filledFields}
            entryCountByCategory={s?.entryCountByCategory}
          />
        );
      })}
      <MessagesCard messagesCount={messagesCount} />
    </div>
  );
}
