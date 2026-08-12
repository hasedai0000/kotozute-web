"use client";

import Link from "next/link";
import { Mail } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MessagesCardProps = {
  messagesCount: number;
  className?: string;
};

export function MessagesCard({ messagesCount, className }: MessagesCardProps) {
  return (
    <Link
      href="/messages"
      aria-label={`大切な人へ を開く（${messagesCount} 通）`}
      className={cn(
        "group block rounded-xl outline-none transition-shadow",
        "focus-visible:ring-2 focus-visible:ring-ring/50",
        className,
      )}
    >
      <Card className="h-full transition-shadow group-hover:ring-foreground/20 group-focus-visible:ring-foreground/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="size-4 text-muted-foreground" aria-hidden="true" />
            大切な人へ
          </CardTitle>
          <CardDescription className="line-clamp-2">
            言葉を残す場所。宛先を決めて、伝えたいことを綴ります。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            <span className="tabular-nums text-foreground">
              {messagesCount}
            </span>{" "}
            通
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
