"use client";

import { useState } from "react";

import { ConfirmDialog } from "@/components/layout/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FamilyMember } from "@/features/family/api/useFamilyMembers";
import { useRevokeMember } from "@/features/family/api/useRevokeMember";

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
  const canRevoke = canManage && !isOwner;

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
        {canRevoke ? <RevokeMemberAction member={member} /> : null}
      </div>
    </li>
  );
}

function RevokeMemberAction({ member }: { member: FamilyMember }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const revoke = useRevokeMember();

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={revoke.isPending}
        aria-busy={revoke.isPending}
        onClick={() => setConfirmOpen(true)}
      >
        {revoke.isPending ? "解除中…" : "権限を解除"}
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`${member.name} さんの権限を解除しますか？`}
        description="解除すると、この方はすぐにノートを閲覧できなくなります。元に戻すには、あらためて招待し直す必要があります。"
        confirmLabel="解除する"
        variant="destructive"
        onConfirm={async () => {
          await revoke.mutateAsync({ id: member.id });
        }}
      />
    </>
  );
}
