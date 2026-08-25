"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isExpired, type Invitation } from "@/features/family/api/useInvitations";

type InvitationRowProps = {
  invitation: Invitation;
  canManage: boolean;
};

const jaDate = new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" });

function formatExpiresAt(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return jaDate.format(new Date(t));
}

export function InvitationRow({ invitation, canManage }: InvitationRowProps) {
  const expired = isExpired(invitation);

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="truncate text-sm font-medium text-foreground">
          {invitation.email}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {expired ? (
            <Badge variant="destructive">期限切れ</Badge>
          ) : (
            <span>有効期限: {formatExpiresAt(invitation.expiresAt)}</span>
          )}
        </div>
      </div>
      {canManage ? (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // TODO(#32): useResendInvite を接続する
            }}
          >
            再送
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // TODO(#32): useRevokeInvite を接続する
            }}
          >
            取り消し
          </Button>
        </div>
      ) : null}
    </li>
  );
}
