"use client";

import { useAuth } from "@/features/auth/hooks/useAuth";

import { DashboardGreeting } from "./_components/DashboardGreeting";
import { FamilyStatusCard } from "./_components/FamilyStatusCard";
import { NextActionCard } from "./_components/NextActionCard";
import { SectionGrid } from "./_components/SectionGrid";

export default function DashboardPage() {
  const { user } = useAuth();
  // role が未定義の場合は owner 扱い（Week 4 で招待受諾フロー導入時に family 判定を差し込む）
  const isFamilyRole = user?.role === "family";

  return (
    <div className="flex flex-col gap-8">
      <DashboardGreeting />
      {isFamilyRole ? null : <NextActionCard />}
      <SectionGrid />
      <FamilyStatusCard />
    </div>
  );
}
