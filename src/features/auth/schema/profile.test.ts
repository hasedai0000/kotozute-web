import { describe, expect, it } from "vitest";

import { profileUpdateSchema } from "./profile";

const validInput = {
  name: "山田 太郎",
  email: "taro@example.com",
};

describe("profileUpdateSchema", () => {
  it("accepts a valid input", () => {
    const result = profileUpdateSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects when required fields are empty", () => {
    const result = profileUpdateSchema.safeParse({ name: "", email: "" });
    expect(result.success).toBe(false);
    if (result.success) return;
    const paths = result.error.issues.map((i) => i.path[0]);
    expect(paths).toContain("name");
    expect(paths).toContain("email");
  });

  it("rejects an invalid email format with the expected message", () => {
    const result = profileUpdateSchema.safeParse({
      ...validInput,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const emailIssue = result.error.issues.find((i) => i.path[0] === "email");
    expect(emailIssue?.message).toBe("メールアドレスの形式が正しくありません");
  });

  it("rejects name longer than 100 characters with the expected message", () => {
    const result = profileUpdateSchema.safeParse({
      ...validInput,
      name: "あ".repeat(101),
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const nameIssue = result.error.issues.find((i) => i.path[0] === "name");
    expect(nameIssue?.message).toBe("お名前は100文字以内で入力してください");
  });

  it("trims surrounding whitespace from the name", () => {
    const result = profileUpdateSchema.safeParse({
      ...validInput,
      name: "  山田 太郎  ",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.name).toBe("山田 太郎");
  });
});
