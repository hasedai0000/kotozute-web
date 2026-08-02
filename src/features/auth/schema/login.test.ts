import { describe, it, expect } from "vitest";
import { loginSchema } from "./login";

describe("loginSchema", () => {
  it("accepts valid email and password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "secret",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email format", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "secret",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailIssue = result.error.issues.find((issue) =>
        issue.path.includes("email")
      );
      expect(emailIssue?.message).toBe("メールアドレスの形式が正しくありません");
    }
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const passwordIssue = result.error.issues.find((issue) =>
        issue.path.includes("password")
      );
      expect(passwordIssue?.message).toBe("パスワードを入力してください");
    }
  });
});
