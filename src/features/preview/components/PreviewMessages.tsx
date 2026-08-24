"use client";

import { useMessages } from "@/features/messages/api/useMessages";
import { TimingBadge } from "@/features/notebook/components/TimingBadge";
import { cn } from "@/lib/utils";

import { PreviewSectionSkeleton } from "./PreviewSectionSkeleton";

const UNFILLED_MARK = "（未記入）";
const EMPTY_LABEL = "（登録がありません）";
const UNTITLED_RECIPIENT = "（宛先未入力）";
const EMPTY_BODY = "（本文未入力）";

type PreviewMessagesProps = {
  showUnfilled: boolean;
};

export function PreviewMessages({ showUnfilled }: PreviewMessagesProps) {
  const query = useMessages();
  const messages = query.data?.messages ?? [];
  const isEmpty = messages.length === 0;

  return (
    <section
      aria-labelledby="preview-messages"
      className={cn("flex flex-col gap-4", "print:break-before-page")}
    >
      <header className="flex flex-col gap-1">
        <h2
          id="preview-messages"
          className="text-xl font-semibold text-foreground"
        >
          大切な人へ
          {isEmpty && !showUnfilled && !query.isPending && (
            <span className="ml-2 text-sm font-normal italic text-muted-foreground">
              {UNFILLED_MARK}
            </span>
          )}
        </h2>
        <p className="text-sm text-muted-foreground">
          言葉を残す場所。宛先を決めて、伝えたいことを綴ります。
        </p>
      </header>

      {query.isPending ? (
        <PreviewSectionSkeleton />
      ) : messages.length === 0 ? (
        showUnfilled ? (
          <p className="text-sm italic text-muted-foreground">{EMPTY_LABEL}</p>
        ) : null
      ) : (
        <div className="flex flex-col gap-4">
          {messages.map((m) => {
            const hasRecipient = m.recipient.trim().length > 0;
            const hasBody = m.body.trim().length > 0;
            return (
              <article
                key={m.id}
                className="rounded-md border border-border bg-card px-4 py-4"
              >
                <header className="mb-3 flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold text-foreground">
                    {hasRecipient ? m.recipient : UNTITLED_RECIPIENT}
                  </h3>
                  <TimingBadge variant={m.timing} />
                </header>
                <p
                  className={
                    hasBody
                      ? "whitespace-pre-wrap text-base leading-relaxed text-foreground"
                      : "text-sm italic text-muted-foreground"
                  }
                >
                  {hasBody ? m.body : EMPTY_BODY}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
