import { describe, expect, it } from "vitest";

import { notificationsSchema } from "./notifications";

describe("notificationsSchema", () => {
  it("accepts { reminderEnabled: true }", () => {
    expect(
      notificationsSchema.safeParse({ reminderEnabled: true }).success,
    ).toBe(true);
  });

  it("accepts { reminderEnabled: false }", () => {
    expect(
      notificationsSchema.safeParse({ reminderEnabled: false }).success,
    ).toBe(true);
  });

  it("rejects non-boolean values", () => {
    expect(
      notificationsSchema.safeParse({ reminderEnabled: "yes" }).success,
    ).toBe(false);
  });

  it("rejects missing field", () => {
    expect(notificationsSchema.safeParse({}).success).toBe(false);
  });
});
