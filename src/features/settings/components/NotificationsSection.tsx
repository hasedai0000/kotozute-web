"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { useNotifications } from "@/features/settings/api/useNotifications";
import { useUpdateNotifications } from "@/features/settings/api/useUpdateNotifications";
import {
  REMINDER_ENABLED_DEFAULT,
  notificationsSchema,
  type NotificationsInput,
} from "@/features/settings/schema/notifications";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

const GENERIC_ERROR_MESSAGE =
  "通信エラーが発生しました。時間をおいて再度お試しください";
const SUCCESS_MESSAGE = "通知設定を更新しました";
const SWITCH_ID = "settings-reminder-enabled";

export function NotificationsSection() {
  const { data, isPending } = useNotifications();
  const update = useUpdateNotifications();
  const [formError, setFormError] = useState<string | null>(null);

  const defaultValues = useMemo<NotificationsInput>(
    () => ({
      reminderEnabled: data?.reminderEnabled ?? REMINDER_ENABLED_DEFAULT,
    }),
    [data?.reminderEnabled],
  );

  const form = useForm<NotificationsInput>({
    resolver: zodResolver(notificationsSchema),
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
    } catch {
      toast.error(GENERIC_ERROR_MESSAGE);
      setFormError(GENERIC_ERROR_MESSAGE);
    }
  });

  const isSubmitting = update.isPending || form.formState.isSubmitting;

  if (isPending) {
    return (
      <div className="space-y-4" aria-busy="true">
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

        <p className="text-sm text-muted-foreground">
          年に一度、ノートの見直しを促すメールをお送りします。
        </p>

        <div className="flex items-center justify-between gap-4">
          <label
            htmlFor={SWITCH_ID}
            className="flex-1 text-sm font-medium leading-snug"
          >
            見直しリマインドを受け取る
          </label>
          <Controller
            control={form.control}
            name="reminderEnabled"
            render={({ field }) => (
              <Switch
                id={SWITCH_ID}
                aria-label="見直しリマインドを受け取る"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked)}
                disabled={isSubmitting}
                onBlur={field.onBlur}
                inputRef={field.ref}
              />
            )}
          />
        </div>

        <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? "保存中…" : "保存"}
        </Button>
      </form>
    </Form>
  );
}
