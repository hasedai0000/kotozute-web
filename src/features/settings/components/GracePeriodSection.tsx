"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { useNotePreferences } from "@/features/settings/api/useNotePreferences";
import { useUpdateGracePeriod } from "@/features/settings/api/useUpdateGracePeriod";
import {
  GRACE_PERIOD_DEFAULT,
  GRACE_PERIOD_MAX,
  GRACE_PERIOD_MIN,
  gracePeriodSchema,
  type GracePeriodInput,
} from "@/features/settings/schema/notePreferences";
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
import { Slider } from "@/components/ui/slider";
import { ApiError } from "@/lib/api";

const GENERIC_ERROR_MESSAGE =
  "通信エラーが発生しました。時間をおいて再度お試しください";
const SUCCESS_MESSAGE = "待機期間を更新しました";
const DESCRIPTION =
  "ご家族が死後開示を発動してから、実際に公開されるまでの猶予期間です。この間にご本人が取り消せます。";

const formSchema = z.object({ gracePeriodDays: gracePeriodSchema });

const clamp = (n: number): number => {
  if (Number.isNaN(n)) return GRACE_PERIOD_DEFAULT;
  return Math.min(GRACE_PERIOD_MAX, Math.max(GRACE_PERIOD_MIN, Math.round(n)));
};

export function GracePeriodSection() {
  const { data, isPending } = useNotePreferences();
  const update = useUpdateGracePeriod();
  const [formError, setFormError] = useState<string | null>(null);

  const defaultValues = useMemo<GracePeriodInput>(
    () => ({ gracePeriodDays: data?.gracePeriodDays ?? GRACE_PERIOD_DEFAULT }),
    [data?.gracePeriodDays],
  );

  const form = useForm<GracePeriodInput>({
    resolver: zodResolver(formSchema),
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
      if (
        ApiError.isApiError(err) &&
        err.status === 422 &&
        err.fields?.grace_period_days?.[0]
      ) {
        form.setError("gracePeriodDays", {
          message: err.fields.grace_period_days[0],
        });
        return;
      }
      toast.error(GENERIC_ERROR_MESSAGE);
      setFormError(GENERIC_ERROR_MESSAGE);
    }
  });

  const isSubmitting = update.isPending || form.formState.isSubmitting;

  if (isPending) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-8 w-full" />
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

        <p className="text-sm text-muted-foreground">{DESCRIPTION}</p>

        <FormField
          control={form.control}
          name="gracePeriodDays"
          render={({ field }) => {
            const current = clamp(field.value);
            return (
              <FormItem>
                <FormLabel htmlFor="grace-period-input">
                  待機期間（{GRACE_PERIOD_MIN}〜{GRACE_PERIOD_MAX} 日）
                </FormLabel>
                <div className="flex items-center gap-4">
                  <FormControl>
                    <Slider
                      className="max-w-md flex-1"
                      min={GRACE_PERIOD_MIN}
                      max={GRACE_PERIOD_MAX}
                      value={[current]}
                      onValueChange={(v) => {
                        const next = Array.isArray(v) ? v[0] : v;
                        if (typeof next === "number") field.onChange(next);
                      }}
                      disabled={isSubmitting}
                      aria-label="待機期間（日）"
                    />
                  </FormControl>
                  <Input
                    id="grace-period-input"
                    type="number"
                    inputMode="numeric"
                    min={GRACE_PERIOD_MIN}
                    max={GRACE_PERIOD_MAX}
                    step={1}
                    className="w-24"
                    value={Number.isFinite(field.value) ? field.value : ""}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        field.onChange(Number.NaN);
                        return;
                      }
                      const parsed = Number(raw);
                      field.onChange(parsed);
                    }}
                    onBlur={field.onBlur}
                    disabled={isSubmitting}
                    aria-label="待機期間（日、数値入力）"
                  />
                  <span className="text-sm text-muted-foreground">日</span>
                </div>
                <FormMessage />
              </FormItem>
            );
          }}
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
