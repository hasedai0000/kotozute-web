"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { useNotePreferences } from "@/features/settings/api/useNotePreferences";
import { useUpdateDefaultTiming } from "@/features/settings/api/useUpdateDefaultTiming";
import {
  DEFAULT_TIMING_DEFAULT,
  defaultTimingSchema,
  type DefaultTimingInput,
  type TimingValue,
} from "@/features/settings/schema/notePreferences";
import { TimingBadge } from "@/features/notebook/components/TimingBadge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";

const GENERIC_ERROR_MESSAGE =
  "通信エラーが発生しました。時間をおいて再度お試しください";
const SUCCESS_MESSAGE = "公開タイミングの既定を更新しました";

const formSchema = z.object({ defaultTiming: defaultTimingSchema });

const OPTIONS: { value: TimingValue; description: string }[] = [
  {
    value: "always",
    description: "家族がいつでも見られます。",
  },
  {
    value: "posthumous",
    description: "解放されるまで家族には見えません。",
  },
];

export function DefaultTimingSection() {
  const { data, isPending } = useNotePreferences();
  const update = useUpdateDefaultTiming();
  const [formError, setFormError] = useState<string | null>(null);

  const defaultValues = useMemo<DefaultTimingInput>(
    () => ({ defaultTiming: data?.defaultTiming ?? DEFAULT_TIMING_DEFAULT }),
    [data?.defaultTiming],
  );

  const form = useForm<DefaultTimingInput>({
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
        err.fields?.default_timing?.[0]
      ) {
        form.setError("defaultTiming", {
          message: err.fields.default_timing[0],
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

        <p className="text-sm text-muted-foreground">
          新しく追加する項目の公開タイミングの既定値です。項目ごとに個別で変更できます。
        </p>

        <FormField
          control={form.control}
          name="defaultTiming"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <RadioGroup
                  value={field.value}
                  onValueChange={(v) => field.onChange(v)}
                  aria-label="公開タイミングの既定"
                  className="gap-3"
                >
                  {OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex cursor-pointer items-start gap-3"
                    >
                      <RadioGroupItem
                        value={opt.value}
                        className="mt-1"
                        disabled={isSubmitting}
                      />
                      <div className="flex flex-col gap-1">
                        <TimingBadge variant={opt.value} />
                        <p className="text-sm text-muted-foreground">
                          {opt.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
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
