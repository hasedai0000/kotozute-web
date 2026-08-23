"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useChangePassword } from "@/features/auth/api/useChangePassword";
import {
  passwordChangeSchema,
  type PasswordChangeInput,
} from "@/features/auth/schema/passwordChange";
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
const SUCCESS_MESSAGE = "パスワードを変更しました";

const EMPTY_VALUES: PasswordChangeInput = {
  currentPassword: "",
  newPassword: "",
  newPasswordConfirmation: "",
};

const API_FIELD_TO_FORM_FIELD: Record<string, keyof PasswordChangeInput> = {
  current_password: "currentPassword",
  password: "newPassword",
  password_confirmation: "newPasswordConfirmation",
};

export function PasswordChangeForm() {
  const change = useChangePassword();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<PasswordChangeInput>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: EMPTY_VALUES,
    mode: "onSubmit",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await change.mutateAsync(values);
      toast.success(SUCCESS_MESSAGE);
      form.reset(EMPTY_VALUES);
    } catch (err) {
      if (ApiError.isApiError(err) && err.status === 422 && err.fields) {
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
      toast.error(GENERIC_ERROR_MESSAGE);
      setFormError(GENERIC_ERROR_MESSAGE);
    }
  });

  const isSubmitting = change.isPending || form.formState.isSubmitting;

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
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>現在のパスワード</FormLabel>
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

        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>新しいパスワード</FormLabel>
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
                8文字以上でご設定ください。
              </p>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="newPasswordConfirmation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>新しいパスワード（確認）</FormLabel>
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
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? "変更中…" : "パスワードを変更する"}
        </Button>
      </form>
    </Form>
  );
}
