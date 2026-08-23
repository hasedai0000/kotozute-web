import { z } from "zod";

export const TIMING_VALUES = ["always", "posthumous"] as const;
export type TimingValue = (typeof TIMING_VALUES)[number];

export const GRACE_PERIOD_MIN = 3;
export const GRACE_PERIOD_MAX = 30;
export const GRACE_PERIOD_DEFAULT = 7;
export const DEFAULT_TIMING_DEFAULT: TimingValue = "always";

export const defaultTimingSchema = z.enum(TIMING_VALUES, {
  message: "公開タイミングを選択してください",
});

export const gracePeriodSchema = z
  .number({ message: "待機期間を入力してください" })
  .int({ message: "待機期間は整数で入力してください" })
  .min(GRACE_PERIOD_MIN, {
    message: `待機期間は${GRACE_PERIOD_MIN}日以上で指定してください`,
  })
  .max(GRACE_PERIOD_MAX, {
    message: `待機期間は${GRACE_PERIOD_MAX}日以下で指定してください`,
  });

export const notePreferencesSchema = z.object({
  defaultTiming: defaultTimingSchema,
  gracePeriodDays: gracePeriodSchema,
});

export type DefaultTimingInput = { defaultTiming: TimingValue };
export type GracePeriodInput = { gracePeriodDays: number };
export type NotePreferences = z.infer<typeof notePreferencesSchema>;
