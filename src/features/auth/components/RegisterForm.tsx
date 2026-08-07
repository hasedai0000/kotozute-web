"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useRegister } from "@/features/auth/api/useRegister";
import { sanitizeRedirect } from "@/features/auth/lib/redirect";
import {
  registerSchema,
  type RegisterInput,
} from "@/features/auth/schema/register";
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

const GENERIC_ERROR_MESSAGE =
  "通信エラーが発生しました。時間をおいて再度お試しください";

// API のフィールド名（snake_case）を RHF のフィールド名（camelCase）に変換する。
const API_FIELD_TO_FORM_FIELD: Record<string, keyof RegisterInput> = {
  name: "name",
  email: "email",
  password: "password",
  password_confirmation: "passwordConfirmation",
};

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = useMemo(
    () => sanitizeRedirect(searchParams.get("redirect")) ?? "/dashboard",
    [searchParams],
  );

  const [formError, setFormError] = useState<string | null>(null);
  const register = useRegister();

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      passwordConfirmation: "",
    },
    mode: "onSubmit",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await register.mutateAsync(values);
      router.push(redirectTo);
    } catch (err) {
      if (ApiError.isApiError(err)) {
        if (err.status === 422 && err.fields) {
          let matched = false;
          for (const [apiField, messages] of Object.entries(err.fields)) {
            const formField = API_FIELD_TO_FORM_FIELD[apiField];
            const message = messages[0];
            if (formField && message) {
              form.setError(formField, { message });
              matched = true;
            }
          }
          if (matched) return;
        }
      }
      toast.error(GENERIC_ERROR_MESSAGE);
      setFormError(GENERIC_ERROR_MESSAGE);
    }
  });

  const isSubmitting = register.isPending || form.formState.isSubmitting;

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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>お名前</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  autoComplete="name"
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>メールアドレス</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
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
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground">
                8文字以上でご設定ください。銀行の暗証番号やマイナンバー番号は保存しません。
              </p>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="passwordConfirmation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>パスワード（確認）</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
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
          {isSubmitting ? "登録中…" : "登録する"}
        </Button>

        <div className="flex flex-col items-center gap-2 pt-2 text-sm">
          <Link
            href="/login"
            className="text-primary underline-offset-4 hover:underline"
          >
            既にアカウントをお持ちの方はこちら
          </Link>
        </div>
      </form>
    </Form>
  );
}
