"use client";

import { Check, Loader2, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { AutoSaveStatus } from "../hooks/useAutoSave";

type SavingIndicatorProps = {
  status: AutoSaveStatus;
  onRetry?: () => void;
  className?: string;
};

export function SavingIndicator({
  status,
  onRetry,
  className,
}: SavingIndicatorProps) {
  if (status === "idle") {
    return <span className={cn("h-5 min-w-1", className)} aria-hidden="true" />;
  }

  if (status === "saving") {
    return (
      <span
        role="status"
        aria-live="polite"
        className={cn(
          "inline-flex items-center gap-1 text-sm text-muted-foreground",
          className,
        )}
      >
        <Loader2
          aria-hidden="true"
          className="size-4 motion-safe:animate-spin"
        />
        保存中…
      </span>
    );
  }

  if (status === "saved") {
    return (
      <span
        role="status"
        aria-live="polite"
        className={cn(
          "inline-flex items-center gap-1 text-sm text-muted-foreground",
          className,
        )}
      >
        <Check aria-hidden="true" className="size-4 text-primary" />
        保存しました
      </span>
    );
  }

  // status === "error"
  return (
    <span
      role="alert"
      aria-live="assertive"
      className={cn(
        "inline-flex items-center gap-2 text-sm text-destructive",
        className,
      )}
    >
      保存できませんでした
      {onRetry ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onRetry}
          className="h-7"
        >
          <RotateCw aria-hidden="true" className="size-3" />
          再試行
        </Button>
      ) : null}
    </span>
  );
}
