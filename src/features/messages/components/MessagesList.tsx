"use client";

import { Mail, Plus } from "lucide-react";

import { EmptyState } from "@/components/layout/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { useMessages } from "../api/useMessages";

import { MessageCard } from "./MessageCard";

const SKELETON_COUNT = 3;

export function MessagesList() {
  const { data, isPending, isError, refetch } = useMessages();

  // TODO(#26): MessageDialog を開くための onClick を配線する。
  const openCreateDialog = () => {
    /* noop */
  };

  return (
    <section className="mx-auto flex w-full max-w-prose flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl leading-snug">大切な人へ</h1>
          <p className="text-sm text-muted-foreground">
            言葉を残す場所。宛先を決めて、伝えたいことを綴ります。
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus aria-hidden="true" />
          手紙を書く
        </Button>
      </header>

      {isPending ? (
        <div className="flex flex-col gap-4" role="status" aria-label="読み込み中">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <Skeleton key={i} className="mx-auto h-40 w-full max-w-prose rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title="読み込めませんでした"
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
      ) : data.messages.length === 0 ? (
        <EmptyState
          icon={<Mail className="size-6" aria-hidden="true" />}
          title="まだ手紙がありません"
          description="宛先を決めて、伝えたいことを綴りましょう。"
          action={
            <Button onClick={openCreateDialog}>
              <Plus aria-hidden="true" />
              手紙を書く
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {data.messages.map((m) => (
            <li key={m.id}>
              <MessageCard
                recipient={m.recipient}
                body={m.body}
                timing={m.timing}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
