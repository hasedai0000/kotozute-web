import { describe, expect, it } from "vitest";

import {
  BODY_MAX,
  RECIPIENT_MAX,
  messageInputSchema,
} from "./message";

describe("messageInputSchema", () => {
  it("accepts empty recipient / body (書き途中を許容)", () => {
    const result = messageInputSchema.safeParse({
      recipient: "",
      body: "",
      timing: "posthumous",
    });
    expect(result.success).toBe(true);
  });

  it("accepts recipient at max length", () => {
    const result = messageInputSchema.safeParse({
      recipient: "あ".repeat(RECIPIENT_MAX),
      body: "本文",
      timing: "always",
    });
    expect(result.success).toBe(true);
  });

  it("rejects recipient over max length", () => {
    const result = messageInputSchema.safeParse({
      recipient: "あ".repeat(RECIPIENT_MAX + 1),
      body: "本文",
      timing: "posthumous",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["recipient"]);
    }
  });

  it("accepts body at max length", () => {
    const result = messageInputSchema.safeParse({
      recipient: "妻へ",
      body: "本".repeat(BODY_MAX),
      timing: "posthumous",
    });
    expect(result.success).toBe(true);
  });

  it("rejects body over max length", () => {
    const result = messageInputSchema.safeParse({
      recipient: "妻へ",
      body: "本".repeat(BODY_MAX + 1),
      timing: "posthumous",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["body"]);
    }
  });

  it("rejects unknown timing value", () => {
    const result = messageInputSchema.safeParse({
      recipient: "妻へ",
      body: "本文",
      timing: "someday",
    });
    expect(result.success).toBe(false);
  });

  it("accepts both timing enum values", () => {
    for (const timing of ["always", "posthumous"] as const) {
      const result = messageInputSchema.safeParse({
        recipient: "妻へ",
        body: "本文",
        timing,
      });
      expect(result.success).toBe(true);
    }
  });
});
