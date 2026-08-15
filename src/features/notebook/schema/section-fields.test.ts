import { describe, expect, it } from "vitest";

import type { FieldDefinition } from "../constants/sections";

import {
  assertNoSensitiveKey,
  buildDefaultValues,
  buildSectionFieldsSchema,
} from "./section-fields";

describe("assertNoSensitiveKey", () => {
  it("throws for forbidden keys (password / pin / mynumber ...)", () => {
    for (const key of ["password", "pin", "mynumber", "credit_card", "secret"]) {
      expect(() => assertNoSensitiveKey(key)).toThrow(/機微情報/);
    }
  });

  it("accepts non-sensitive keys", () => {
    expect(() => assertNoSensitiveKey("full_name")).not.toThrow();
    expect(() => assertNoSensitiveKey("birthdate")).not.toThrow();
  });
});

describe("buildSectionFieldsSchema", () => {
  const fields: readonly FieldDefinition[] = [
    { key: "full_name", label: "氏名", kind: "text", maxLength: 60 },
    { key: "birthdate", label: "生年月日", kind: "date" },
    {
      key: "emergency_contact",
      label: "緊急連絡先",
      kind: "textarea",
      maxLength: 10,
    },
  ];

  it("enforces maxLength on text/textarea", () => {
    const schema = buildSectionFieldsSchema(fields);
    const result = schema.safeParse({
      full_name: "山田 太郎",
      birthdate: "1990-01-02",
      emergency_contact: "0123456789A", // 11 chars → over limit 10
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message).join(",");
      expect(messages).toContain("緊急連絡先");
      expect(messages).toContain("10");
    }
  });

  it("accepts YYYY-MM-DD for date fields and rejects malformed dates", () => {
    const schema = buildSectionFieldsSchema(fields);
    const ok = schema.safeParse({
      full_name: "",
      birthdate: "2000-12-31",
      emergency_contact: "",
    });
    expect(ok.success).toBe(true);

    const bad = schema.safeParse({
      full_name: "",
      birthdate: "2000/12/31",
      emergency_contact: "",
    });
    expect(bad.success).toBe(false);
  });

  it("treats empty strings as valid (未記入 OK)", () => {
    const schema = buildSectionFieldsSchema(fields);
    const result = schema.safeParse({
      full_name: "",
      birthdate: "",
      emergency_contact: "",
    });
    expect(result.success).toBe(true);
  });

  it("throws immediately when a forbidden key is included", () => {
    const bad: readonly FieldDefinition[] = [
      { key: "password", label: "パスワード", kind: "text" },
    ];
    expect(() => buildSectionFieldsSchema(bad)).toThrow(/機微情報/);
  });
});

describe("buildDefaultValues", () => {
  const fields: readonly FieldDefinition[] = [
    { key: "full_name", label: "氏名", kind: "text" },
    { key: "birthdate", label: "生年月日", kind: "date" },
  ];

  it("returns empty strings when no initial values are provided", () => {
    expect(buildDefaultValues(fields)).toEqual({
      full_name: "",
      birthdate: "",
    });
  });

  it("uses initial values when provided and falls back to empty string", () => {
    expect(buildDefaultValues(fields, { full_name: "太郎" })).toEqual({
      full_name: "太郎",
      birthdate: "",
    });
  });
});
