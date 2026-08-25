"use client";

import { UserPlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/useAuth";

import { InvitationsCard } from "./InvitationsCard";
import { InviteDialog } from "./InviteDialog";
import { MembersCard } from "./MembersCard";

export function FamilyContent() {
  const { user } = useAuth();
  // role が未定義の場合は owner 扱い（Week 4 で招待受諾フロー導入時に family 判定を差し込む）
  const canManage = user?.role !== "family";
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">家族・共有管理</h1>
          <p className="text-sm text-muted-foreground">
            ノートを共有する家族を招待します。
          </p>
        </div>
        {canManage ? (
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus />
            家族を招待
          </Button>
        ) : null}
      </header>

      <MembersCard canManage={canManage} />
      <InvitationsCard canManage={canManage} />

      {canManage ? (
        <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      ) : null}
    </div>
  );
}
