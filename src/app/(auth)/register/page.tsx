import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { RegisterForm } from "@/features/auth/components/RegisterForm";

export const metadata: Metadata = {
  title: "新規登録 | ことづて",
  description: "ことづての新規登録を行います。",
};

export default function RegisterPage() {
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
          <h1 className="text-2xl font-semibold tracking-tight">新規登録</h1>
          <p className="text-sm text-muted-foreground">
            メールアドレスとパスワードでアカウントを作成します。
          </p>
        </div>
        <Suspense fallback={<div aria-hidden="true" className="h-64" />}>
          <RegisterForm />
        </Suspense>
      </div>
    </main>
  );
}
