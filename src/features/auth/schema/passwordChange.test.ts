import { describe, expect, it } from "vitest";

import { passwordChangeSchema } from "./passwordChange";

const validInput = {
  currentPassword: "current123",
  newPassword: "newpass123",
  newPasswordConfirmation: "newpass123",
};

describe("passwordChangeSchema", () => {
  it("accepts a valid input", () => {
    const result = passwordChangeSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects when required fields are empty", () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: "",
      newPassword: "",
      newPasswordConfirmation: "",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const paths = result.error.issues.map((i) => i.path[0]);
    expect(paths).toContain("currentPassword");
    expect(paths).toContain("newPassword");
    expect(paths).toContain("newPasswordConfirmation");
  });

  it("rejects a newPassword shorter than 8 characters with the expected message", () => {
    const result = passwordChangeSchema.safeParse({
      ...validInput,
      newPassword: "short7c",
      newPasswordConfirmation: "short7c",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const passwordIssue = result.error.issues.find(
      (i) => i.path[0] === "newPassword",
    );
    expect(passwordIssue?.message).toBe(
      "パスワードは8文字以上で入力してください",
    );
  });

  it("rejects when newPasswordConfirmation does not match newPassword, on the newPasswordConfirmation path", () => {
    const result = passwordChangeSchema.safeParse({
      ...validInput,
      newPasswordConfirmation: "differentPass1",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const mismatch = result.error.issues.find(
      (i) =>
        i.path[0] === "newPasswordConfirmation" &&
        i.message === "パスワードが一致しません",
    );
    expect(mismatch).toBeDefined();
  });

  it("does not enforce an 8-character minimum on currentPassword", () => {
    const result = passwordChangeSchema.safeParse({
      ...validInput,
      currentPassword: "short",
    });
    expect(result.success).toBe(true);
  });
});
