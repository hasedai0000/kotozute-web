"use client";

import { Mail, Plus } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/layout/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsOwner } from "@/features/auth/hooks/useIsOwner";

import { useMessages } from "../api/useMessages";

import { MessageCard } from "./MessageCard";

const SKELETON_COUNT = 3;

const NewMessageLink = () => (
  <Button
    render={
      <Link href="/messages/new">
        <Plus aria-hidden="true" />
        手紙を書く
      </Link>
    }
  />
);

export function MessagesList() {
  const { data, isPending, isError, refetch } = useMessages();
  const isOwner = useIsOwner();

  return (
    <section className="mx-auto flex w-full max-w-prose flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl leading-snug">大切な人へ</h1>
          <p className="text-sm text-muted-foreground">
            {isOwner
              ? "言葉を残す場所。宛先を決めて、伝えたいことを綴ります。"
              : "共有されている手紙をご覧いただけます。"}
          </p>
        </div>
        {isOwner ? <NewMessageLink /> : null}
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
          title={isOwner ? "まだ手紙がありません" : "共有されている手紙はまだありません"}
          description={
            isOwner
              ? "宛先を決めて、伝えたいことを綴りましょう。"
              : undefined
          }
          action={isOwner ? <NewMessageLink /> : undefined}
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {data.messages.map((m) => (
            <li key={m.id}>
              <MessageCard
                id={m.id}
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
