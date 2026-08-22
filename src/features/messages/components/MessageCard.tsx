import Link from "next/link";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import {
  TimingBadge,
  type TimingVariant,
} from "@/features/notebook/components/TimingBadge";

type MessageCardProps = {
  id: string;
  recipient: string;
  body: string;
  timing: TimingVariant;
  className?: string;
};

export function MessageCard({
  id,
  recipient,
  body,
  timing,
  className,
}: MessageCardProps) {
  return (
    <Link
      href={`/messages/${id}`}
      aria-label={`${recipient} を読む`}
      className={cn(
        "group block rounded-xl outline-none transition-shadow",
        "focus-visible:ring-2 focus-visible:ring-ring/50",
        className,
      )}
    >
      <Card
        className={cn(
          "mx-auto w-full max-w-prose gap-4 px-6 py-6 sm:px-8 sm:py-8",
          "transition-shadow group-hover:ring-foreground/20 group-focus-visible:ring-foreground/30",
        )}
      >
        <CardHeader className="grid-cols-[1fr_auto] items-start gap-3">
          <CardTitle className="font-heading text-lg leading-snug break-words">
            {recipient}
          </CardTitle>
          <TimingBadge variant={timing} />
        </CardHeader>
        <CardContent>
          <p className="line-clamp-3 text-base leading-loose whitespace-pre-wrap text-foreground">
            {body}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
