import { describe, expect, it } from "vitest";

import { accountDeletionSchema } from "./accountDeletion";

describe("accountDeletionSchema", () => {
  it("accepts a non-empty password", () => {
    expect(
      accountDeletionSchema.safeParse({ currentPassword: "password123" })
        .success,
    ).toBe(true);
  });

  it("rejects an empty password", () => {
    const r = accountDeletionSchema.safeParse({ currentPassword: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toContain(
        "現在のパスワードを入力してください",
      );
    }
  });

  it("rejects missing field", () => {
    expect(accountDeletionSchema.safeParse({}).success).toBe(false);
  });
});
