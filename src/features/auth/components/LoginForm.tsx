"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useLogin } from "@/features/auth/api/useLogin";
import { sanitizeRedirect } from "@/features/auth/lib/redirect";
import { loginSchema, type LoginInput } from "@/features/auth/schema/login";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";

const CREDENTIALS_ERROR_MESSAGE =
  "メールアドレスまたはパスワードが正しくありません";
const GENERIC_ERROR_MESSAGE =
  "通信エラーが発生しました。時間をおいて再度お試しください";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = useMemo(
    () => sanitizeRedirect(searchParams.get("redirect")) ?? "/dashboard",
    [searchParams],
  );

  const [formError, setFormError] = useState<string | null>(null);
  const login = useLogin();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login.mutateAsync(values);
      router.push(redirectTo);
    } catch (err) {
      // 401 / 422 は認証失敗として扱い、フィールド別ではなく全体エラーに集約する
      // （どちらが誤りか明かさない — screen_spec §5）。
      if (ApiError.isApiError(err)) {
        if (err.status === 401 || err.status === 422 || err.status === 419) {
          setFormError(CREDENTIALS_ERROR_MESSAGE);
          return;
        }
      }
      toast.error(GENERIC_ERROR_MESSAGE);
    }
  });

  const isSubmitting = login.isPending || form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {formError}
          </div>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>メールアドレス</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>パスワード</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? "ログイン中…" : "ログイン"}
        </Button>

        <div className="flex flex-col items-center gap-2 pt-2 text-sm">
          <Link
            href="/register"
            className="text-primary underline-offset-4 hover:underline"
          >
            新規登録はこちら
          </Link>
          <span
            aria-disabled="true"
            className="cursor-not-allowed text-muted-foreground"
            title="準備中"
          >
            パスワードをお忘れの方（準備中）
          </span>
        </div>
      </form>
    </Form>
  );
}
