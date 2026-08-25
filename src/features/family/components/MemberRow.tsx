"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FamilyMember } from "@/features/family/api/useFamilyMembers";

type MemberRowProps = {
  member: FamilyMember;
  canManage: boolean;
};

const jaDate = new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" });

function formatJoinedAt(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return jaDate.format(new Date(t));
}

export function MemberRow({ member, canManage }: MemberRowProps) {
  const isOwner = member.role === "owner";
  const roleLabel = isOwner ? "本人" : "家族";

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="truncate text-sm font-medium text-foreground">
          {member.name}
        </p>
        <p className="truncate text-xs text-muted-foreground">{member.email}</p>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <Badge variant={isOwner ? "secondary" : "outline"}>{roleLabel}</Badge>
        <span aria-label="参加日">{formatJoinedAt(member.joinedAt)}</span>
        {canManage && !isOwner ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // TODO(#33): useRevokeMember を接続する
            }}
          >
            権限を解除
          </Button>
        ) : null}
      </div>
    </li>
  );
}
