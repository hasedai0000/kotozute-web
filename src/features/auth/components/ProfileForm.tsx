"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useUpdateProfile } from "@/features/auth/api/useUpdateProfile";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  profileUpdateSchema,
  type ProfileUpdateInput,
} from "@/features/auth/schema/profile";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";

const GENERIC_ERROR_MESSAGE =
  "通信エラーが発生しました。時間をおいて再度お試しください";
const SUCCESS_MESSAGE = "プロフィールを更新しました";

const API_FIELD_TO_FORM_FIELD: Record<string, keyof ProfileUpdateInput> = {
  name: "name",
  email: "email",
};

export function ProfileForm() {
  const { user, isLoading } = useAuth();
  const update = useUpdateProfile();
  const [formError, setFormError] = useState<string | null>(null);

  const defaultValues = useMemo<ProfileUpdateInput>(
    () => ({ name: user?.name ?? "", email: user?.email ?? "" }),
    [user?.name, user?.email],
  );

  const form = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues,
    mode: "onSubmit",
  });

  const { reset, formState } = form;
  useEffect(() => {
    if (!formState.isDirty) reset(defaultValues);
  }, [defaultValues, formState.isDirty, reset]);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await update.mutateAsync(values);
      toast.success(SUCCESS_MESSAGE);
      form.reset(values);
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

  const isSubmitting = update.isPending || form.formState.isSubmitting;

  if (isLoading || !user) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-24" />
      </div>
    );
  }

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

        <Button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? "保存中…" : "保存"}
        </Button>
      </form>
    </Form>
  );
}
