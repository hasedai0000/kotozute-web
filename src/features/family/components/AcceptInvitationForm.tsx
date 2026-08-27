"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAcceptInvitation } from "@/features/family/api/useAcceptInvitation";
import { useMe } from "@/features/auth/api/useMe";
import { useLogout } from "@/features/auth/api/useLogout";
import { ApiError } from "@/lib/api";

export type AcceptInvitationFormProps = {
  token: string;
  inviterName: string;
  familyName?: string;
  invitedEmail?: string;
};

export function AcceptInvitationForm({
  token,
  inviterName,
  familyName,
  invitedEmail,
}: AcceptInvitationFormProps) {
  const router = useRouter();
  const me = useMe();
  const accept = useAcceptInvitation();
  const logout = useLogout();

  const currentEmail = me.data?.email;
  // me が未取得（読み込み中 / エラー）や invitedEmail が無い場合は safe default で警告を出さない。
  const hasMismatch =
    !!invitedEmail && !!currentEmail && currentEmail !== invitedEmail;

  const redirectPath = `/invitations/${encodeURIComponent(token)}`;

  const handleAccept = () => {
    accept.mutate(
      { token },
      {
        onSuccess: () => {
          router.push("/dashboard");
        },
        onError: (err) => {
          if (ApiError.isApiError(err)) {
            if (err.status === 401 || err.status === 419) {
              // セッション失効。ログイン画面に戻し、成功後に招待受諾ページへ戻す。
              router.push(
                `/login?redirect=${encodeURIComponent(redirectPath)}`,
              );
              return;
            }
            if (err.status === 409) {
              // 既に参加済み。dashboard に着地させる。
              toast.info("既に参加しています。");
              router.push("/dashboard");
              return;
            }
            if (err.status === 410) {
              // 招待が失効した。verify を再走させて無効表示に落とす。
              toast.error("この招待は無効になりました。");
              router.refresh();
              return;
            }
          }
          // useAcceptInvitation 側でも generic な error toast を出しているため、ここでは追加しない。
        },
      },
    );
  };

  const handleSwitchAccount = async () => {
    try {
      await logout.mutateAsync();
    } catch {
      // ログアウト失敗しても、そのまま /login に遷移して手動で切り替えを促す。
    }
    router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
  };

  const isBusy = accept.isPending || logout.isPending;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">招待の受諾</h1>
      <p className="text-sm text-muted-foreground">
        {inviterName}さんからノートの共有に招待されています。
      </p>
      {familyName && (
        <p className="text-sm text-muted-foreground">「{familyName}」</p>
      )}

      {hasMismatch && (
        <div
          role="alert"
          aria-live="polite"
          className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100"
        >
          <p>
            招待メール（<span className="font-medium">{invitedEmail}</span>
            ）と現在ログイン中のアカウント（
            <span className="font-medium">{currentEmail}</span>
            ）が異なります。
          </p>
          <button
            type="button"
            onClick={handleSwitchAccount}
            disabled={isBusy}
            className="underline underline-offset-4 hover:no-underline disabled:cursor-not-allowed disabled:opacity-60"
          >
            別のアカウントでログインし直す
          </button>
        </div>
      )}

      <Button
        type="button"
        size="lg"
        className="w-full"
        onClick={handleAccept}
        disabled={isBusy}
        aria-busy={isBusy}
        data-testid="accept-invitation"
      >
        {accept.isPending ? "参加中…" : "参加する"}
      </Button>
    </div>
  );
}
