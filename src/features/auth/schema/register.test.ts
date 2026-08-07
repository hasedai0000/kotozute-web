import { describe, expect, it } from "vitest";

import { registerSchema } from "./register";

const validInput = {
  name: "山田 太郎",
  email: "taro@example.com",
  password: "password123",
  passwordConfirmation: "password123",
};

describe("registerSchema", () => {
  it("accepts a valid input", () => {
    const result = registerSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects when required fields are empty", () => {
    const result = registerSchema.safeParse({
      name: "",
      email: "",
      password: "",
      passwordConfirmation: "",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const issues = result.error.issues;
    const paths = issues.map((i) => i.path[0]);
    expect(paths).toContain("name");
    expect(paths).toContain("email");
    expect(paths).toContain("password");
    expect(paths).toContain("passwordConfirmation");
  });

  it("rejects passwords shorter than 8 characters with the expected message", () => {
    const result = registerSchema.safeParse({
      ...validInput,
      password: "short7c",
      passwordConfirmation: "short7c",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const passwordIssue = result.error.issues.find(
      (i) => i.path[0] === "password",
    );
    expect(passwordIssue?.message).toBe(
      "パスワードは8文字以上で入力してください",
    );
  });

  it("rejects when passwordConfirmation does not match password, on the passwordConfirmation path", () => {
    const result = registerSchema.safeParse({
      ...validInput,
      passwordConfirmation: "differentPass1",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const mismatch = result.error.issues.find(
      (i) =>
        i.path[0] === "passwordConfirmation" &&
        i.message === "パスワードが一致しません",
    );
    expect(mismatch).toBeDefined();
  });
});
