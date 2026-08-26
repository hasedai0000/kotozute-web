import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { verifyInvitation } from "@/features/family/api/verifyInvitation";
import { hasSessionCookieFromCookies } from "@/lib/auth/session-cookie";
import { Button, buttonVariants } from "@/components/ui/button";

type Params = { token: string };

export const metadata: Metadata = {
  // token を title に含めない（検索エンジン等への漏洩防止）
  title: "招待の受諾 | ことづて",
  robots: { index: false, follow: false },
};

const buildCookieHeader = (
  jar: readonly { name: string; value: string }[],
): string | undefined => {
  if (jar.length === 0) return undefined;
  return jar.map((c) => `${c.name}=${c.value}`).join("; ");
};

const CardShell = ({ children }: { children: React.ReactNode }) => (
  <main className="flex min-h-[calc(100dvh-4rem)] flex-1 items-center justify-center bg-muted/30 px-4 py-12">
    <div className="w-full max-w-md space-y-6 rounded-2xl border bg-background p-8 shadow-sm">
      <div className="space-y-2 text-center">
        <Link
          href="/"
          className="inline-block text-xl font-semibold tracking-tight text-primary"
        >
          ことづて
        </Link>
      </div>
      {children}
    </div>
  </main>
);

export default async function InvitationAcceptPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { token } = await params;

  const jar = await cookies();
  const allCookies = jar.getAll();
  const isLoggedIn = hasSessionCookieFromCookies(allCookies);
  const cookieHeader = buildCookieHeader(allCookies);

  let result: Awaited<ReturnType<typeof verifyInvitation>> | null = null;
  let hadError = false;
  try {
    result = await verifyInvitation(token, { cookieHeader });
  } catch {
    hadError = true;
  }

  if (hadError) {
    return (
      <CardShell>
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            一時的なエラー
          </h1>
          <p className="text-sm text-muted-foreground">
            時間をおいてもう一度お試しください。
          </p>
          <Link
            href={`/invitations/${encodeURIComponent(token)}`}
            className={buttonVariants({ size: "lg", className: "w-full" })}
          >
            再試行
          </Link>
        </div>
      </CardShell>
    );
  }

  // 無効ケース（expired / used / not_found）はすべて同一の文言でまとめる。
  // screen_spec §6：「何のノートか・誰の招待かは明かさない。再送を依頼する案内を出す」
  if (
    result &&
    (result.status === "expired" ||
      result.status === "used" ||
      result.status === "not_found")
  ) {
    return (
      <CardShell>
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            招待リンクが無効です
          </h1>
          <p className="text-sm text-muted-foreground">
            この招待リンクは有効期限が切れているか、既に使用されているか、正しくありません。招待した方に再送を依頼してください。
          </p>
          <Link
            href="/"
            className={buttonVariants({
              variant: "outline",
              size: "lg",
              className: "w-full",
            })}
          >
            ホームへ戻る
          </Link>
        </div>
      </CardShell>
    );
  }

  const redirectPath = `/invitations/${encodeURIComponent(token)}`;
  const redirectParam = encodeURIComponent(redirectPath);

  // 有効 + 未ログイン：ログイン／登録に招待トークンを保持したまま誘導する。
  if (!isLoggedIn) {
    return (
      <CardShell>
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            招待の受諾
          </h1>
          <p className="text-sm text-muted-foreground">
            ノートの共有に招待されています。ログインまたは新規登録をして、招待を受け取ってください。
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Link
              href={`/login?redirect=${redirectParam}`}
              className={buttonVariants({ size: "lg", className: "w-full" })}
            >
              ログイン
            </Link>
            <Link
              href={`/register?redirect=${redirectParam}`}
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                className: "w-full",
              })}
            >
              新規登録
            </Link>
          </div>
        </div>
      </CardShell>
    );
  }

  // 有効 + ログイン済み：#35 で「参加する」ボタン + useAcceptInvitation を実装予定。
  // 本 Issue では最小プレースホルダに留める。
  return (
    <CardShell>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">招待の受諾</h1>
        <p className="text-sm text-muted-foreground">
          招待を受け取る準備ができています。
        </p>
        <Button
          size="lg"
          className="w-full"
          disabled
          data-testid="accept-invitation"
        >
          参加する（準備中）
        </Button>
      </div>
    </CardShell>
  );
}
