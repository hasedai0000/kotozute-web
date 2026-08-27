"use client";

import { TimingBadge } from "@/features/notebook/components/TimingBadge";

import type { Message } from "../schema/message";

type Props = {
  message: Message;
};

export function MessageView({ message }: Props) {
  return (
    <section className="mx-auto flex w-full max-w-prose flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-heading text-2xl leading-snug break-words">
          {message.recipient}
        </h1>
        <TimingBadge variant={message.timing} />
      </div>
      <p className="whitespace-pre-wrap text-base leading-loose">
        {message.body}
      </p>
    </section>
  );
}
