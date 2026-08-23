import { describe, expect, it } from "vitest";

import {
  defaultTimingSchema,
  gracePeriodSchema,
  notePreferencesSchema,
} from "./notePreferences";

describe("defaultTimingSchema", () => {
  it("accepts 'always'", () => {
    expect(defaultTimingSchema.safeParse("always").success).toBe(true);
  });

  it("accepts 'posthumous'", () => {
    expect(defaultTimingSchema.safeParse("posthumous").success).toBe(true);
  });

  it("rejects other strings", () => {
    expect(defaultTimingSchema.safeParse("later").success).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(defaultTimingSchema.safeParse(1).success).toBe(false);
  });
});

describe("gracePeriodSchema", () => {
  it.each([3, 7, 15, 30])("accepts %i as an in-range integer", (n) => {
    expect(gracePeriodSchema.safeParse(n).success).toBe(true);
  });

  it("rejects 2 (below min)", () => {
    const r = gracePeriodSchema.safeParse(2);
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toContain("3日以上");
    }
  });

  it("rejects 31 (above max)", () => {
    const r = gracePeriodSchema.safeParse(31);
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toContain("30日以下");
    }
  });

  it("rejects non-integer values", () => {
    expect(gracePeriodSchema.safeParse(7.5).success).toBe(false);
  });

  it("rejects NaN", () => {
    expect(gracePeriodSchema.safeParse(Number.NaN).success).toBe(false);
  });
});

describe("notePreferencesSchema", () => {
  it("accepts the default combination", () => {
    expect(
      notePreferencesSchema.safeParse({
        defaultTiming: "always",
        gracePeriodDays: 7,
      }).success,
    ).toBe(true);
  });

  it("rejects when any field is invalid", () => {
    expect(
      notePreferencesSchema.safeParse({
        defaultTiming: "always",
        gracePeriodDays: 2,
      }).success,
    ).toBe(false);
  });
});
