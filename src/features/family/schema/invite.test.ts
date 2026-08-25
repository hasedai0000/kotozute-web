import { describe, expect, it } from "vitest";

import { inviteSchema } from "./invite";

describe("inviteSchema", () => {
  it("空文字は『メールアドレスを入力してください』", () => {
    const r = inviteSchema.safeParse({ email: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe(
        "メールアドレスを入力してください",
      );
    }
  });

  it("形式不正は『メールアドレスの形式が正しくありません』", () => {
    const r = inviteSchema.safeParse({ email: "foo" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe(
        "メールアドレスの形式が正しくありません",
      );
    }
  });

  it("前後の空白は trim されて有効", () => {
    const r = inviteSchema.safeParse({ email: "  foo@bar.com  " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("foo@bar.com");
  });

  it("有効なアドレスは parse 成功", () => {
    const r = inviteSchema.safeParse({ email: "foo@bar.com" });
    expect(r.success).toBe(true);
  });
});
