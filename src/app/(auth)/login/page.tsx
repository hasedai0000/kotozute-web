import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = {
  title: "ログイン | ことづて",
  description: "ことづてにログインします。",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-[calc(100dvh-4rem)] flex-1 items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-2xl border bg-background p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <Link
            href="/"
            className="inline-block text-xl font-semibold tracking-tight text-primary"
          >
            ことづて
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">ログイン</h1>
          <p className="text-sm text-muted-foreground">
            登録済みのメールアドレスでログインしてください。
          </p>
        </div>
        <Suspense fallback={<div aria-hidden="true" className="h-64" />}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
