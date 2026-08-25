"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useResendInvite } from "@/features/family/api/useResendInvite";
import { useRevokeInvite } from "@/features/family/api/useRevokeInvite";
import { isExpired, type Invitation } from "@/features/family/api/useInvitations";

type InvitationRowProps = {
  invitation: Invitation;
  canManage: boolean;
};

const jaDate = new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" });

function formatExpiresAt(iso: string): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return jaDate.format(new Date(t));
}

export function InvitationRow({ invitation, canManage }: InvitationRowProps) {
  const expired = isExpired(invitation);
  const resend = useResendInvite();
  const revoke = useRevokeInvite();
  const busy = resend.isPending || revoke.isPending;
  const isOptimistic =
    typeof invitation.id === "string" && invitation.id.startsWith("temp-");

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="truncate text-sm font-medium text-foreground">
          {invitation.email}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isOptimistic ? (
            <span>送信中…</span>
          ) : expired ? (
            <Badge variant="destructive">期限切れ</Badge>
          ) : invitation.expiresAt ? (
            <span>有効期限: {formatExpiresAt(invitation.expiresAt)}</span>
          ) : null}
        </div>
      </div>
      {canManage ? (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busy || isOptimistic}
            aria-busy={resend.isPending}
            onClick={() => resend.mutate({ id: invitation.id })}
          >
            {resend.isPending ? "再送中…" : "再送"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy || isOptimistic}
            aria-busy={revoke.isPending}
            onClick={() => revoke.mutate({ id: invitation.id })}
          >
            {revoke.isPending ? "取り消し中…" : "取り消し"}
          </Button>
        </div>
      ) : null}
    </li>
  );
}
