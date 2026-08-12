"use client";

import { FamilyStatusCard } from "@/features/family/components/FamilyStatusCard";
import { SectionGrid } from "@/features/notebook/components/SectionGrid";

export default function NotebookIndexPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">マイノート</h1>
        <p className="text-sm text-muted-foreground">
          7 つの領域と「大切な人へ」を分けて残せます。気になるところから書きはじめましょう。
        </p>
      </div>
      <SectionGrid />
      <FamilyStatusCard />
    </div>
  );
}
