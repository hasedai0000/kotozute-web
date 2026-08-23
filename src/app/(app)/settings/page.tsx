"use client";

import { PasswordChangeForm } from "@/features/auth/components/PasswordChangeForm";
import { ProfileForm } from "@/features/auth/components/ProfileForm";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { DefaultTimingSection } from "@/features/settings/components/DefaultTimingSection";
import { GracePeriodSection } from "@/features/settings/components/GracePeriodSection";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const { user } = useAuth();
  // role が未定義の場合は owner 扱い（Week 4 で招待受諾フロー導入時に family 判定を差し込む）
  const isFamilyRole = user?.role === "family";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold">設定</h1>
      </header>

      <section
        aria-labelledby="profile-heading"
        className="flex flex-col gap-4"
      >
        <h2 id="profile-heading" className="text-lg font-medium">
          プロフィール
        </h2>
        <ProfileForm />
      </section>

      <Separator />

      <section
        aria-labelledby="password-heading"
        className="flex flex-col gap-4"
      >
        <h2 id="password-heading" className="text-lg font-medium">
          パスワード変更
        </h2>
        <PasswordChangeForm />
      </section>

      {isFamilyRole ? null : (
        <>
          <Separator />

          <section
            aria-labelledby="default-timing-heading"
            className="flex flex-col gap-4"
          >
            <h2 id="default-timing-heading" className="text-lg font-medium">
              公開タイミングの既定
            </h2>
            <DefaultTimingSection />
          </section>

          <Separator />

          <section
            aria-labelledby="grace-period-heading"
            className="flex flex-col gap-4"
          >
            <h2 id="grace-period-heading" className="text-lg font-medium">
              待機期間
            </h2>
            <GracePeriodSection />
          </section>
        </>
      )}
    </div>
  );
}
