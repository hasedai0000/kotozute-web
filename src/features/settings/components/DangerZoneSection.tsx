"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import { DeleteAccountDialog } from "./DeleteAccountDialog";

type DangerZoneSectionProps = {
  role: "owner" | "family";
};

export function DangerZoneSection({ role }: DangerZoneSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        アカウントを削除すると、ご自身の情報だけでなく、共有していた家族からもノートは見えなくなります。この操作は取り消せません。
      </p>
      <Button
        type="button"
        variant="destructive"
        onClick={() => setOpen(true)}
      >
        アカウントを削除する
      </Button>
      <DeleteAccountDialog open={open} onOpenChange={setOpen} role={role} />
    </div>
  );
}
