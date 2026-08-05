import type { ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { TimingBadge, type TimingVariant } from "./TimingBadge";

type EntryCardProps = {
  title: string;
  meta?: ReactNode;
  timing: TimingVariant;
  onEdit?: () => void;
  onDelete?: () => void;
  readOnly?: boolean;
  className?: string;
};

export function EntryCard({
  title,
  meta,
  timing,
  onEdit,
  onDelete,
  readOnly = false,
  className,
}: EntryCardProps) {
  const showActions = !readOnly && (onEdit || onDelete);

  return (
    <Card size="sm" className={cn("gap-2", className)}>
      <CardHeader className="grid-cols-[1fr_auto] items-start gap-2">
        <CardTitle className="min-w-0 break-words">{title}</CardTitle>
        <TimingBadge variant={timing} />
      </CardHeader>
      {(meta || showActions) && (
        <CardContent className="flex flex-col gap-3">
          {meta ? (
            <div className="text-sm text-muted-foreground">{meta}</div>
          ) : null}
          {showActions ? (
            <div className="flex justify-end gap-2">
              {onEdit ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onEdit}
                  aria-label={`${title} を編集`}
                >
                  <Pencil aria-hidden="true" />
                  編集
                </Button>
              ) : null}
              {onDelete ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onDelete}
                  aria-label={`${title} を削除`}
                >
                  <Trash2 aria-hidden="true" />
                  削除
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      )}
    </Card>
  );
}
