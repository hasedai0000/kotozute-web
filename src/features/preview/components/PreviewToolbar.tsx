"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const TOGGLE_ID = "preview-show-unfilled";

type PreviewToolbarProps = {
  showUnfilled: boolean;
  onShowUnfilledChange: (next: boolean) => void;
};

export function PreviewToolbar({
  showUnfilled,
  onShowUnfilledChange,
}: PreviewToolbarProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between print:hidden"
      aria-label="プレビュー操作"
    >
      <div className="flex items-center gap-3">
        <Switch
          id={TOGGLE_ID}
          checked={showUnfilled}
          onCheckedChange={onShowUnfilledChange}
          aria-label="未記入も表示"
        />
        <label htmlFor={TOGGLE_ID} className="text-sm font-medium">
          未記入も表示
        </label>
      </div>
      <Button type="button" onClick={handlePrint} aria-label="PDF を保存（印刷）">
        <Printer aria-hidden="true" />
        PDF を保存（印刷）
      </Button>
    </div>
  );
}
