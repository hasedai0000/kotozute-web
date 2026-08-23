import { PasswordChangeForm } from "@/features/auth/components/PasswordChangeForm";
import { ProfileForm } from "@/features/auth/components/ProfileForm";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
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
    </div>
  );
}
