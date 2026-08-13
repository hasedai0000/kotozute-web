import { z, type ZodTypeAny } from "zod";

import type { FieldDefinition } from "../constants/sections";

// CLAUDE.md セキュリティ: パスワード・暗証番号・マイナンバー等は入力させない。
// 「在りかのみ」の設計方針に反する key は buildSectionFieldsSchema で弾く。
const FORBIDDEN_KEYS: readonly string[] = [
  "password",
  "pass",
  "passwd",
  "pin",
  "pincode",
  "cvv",
  "cvc",
  "mynumber",
  "my_number",
  "social_security",
  "credit_card",
  "card_number",
  "secret",
];

export function assertNoSensitiveKey(key: string): void {
  if (FORBIDDEN_KEYS.includes(key)) {
    throw new Error(
      `[section-fields] "${key}" は機微情報のため単一項目としては受け付けません（CLAUDE.md セキュリティ）`,
    );
  }
}

// YYYY-MM-DD の緩い検証。厳密な日付整合性は保存側でも扱う。
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function buildFieldSchema(field: FieldDefinition): ZodTypeAny {
  const baseMessage = `${field.label}を入力してください`;
  let base: ZodTypeAny;

  switch (field.kind) {
    case "date":
      base = z
        .string()
        .refine((v) => v === "" || DATE_PATTERN.test(v), {
          message: `${field.label}は YYYY-MM-DD の形式で入力してください`,
        });
      break;
    case "text":
    case "textarea":
    default: {
      let s = z.string();
      if (field.maxLength !== undefined) {
        s = s.max(field.maxLength, {
          message: `${field.label}は${field.maxLength}文字以内で入力してください`,
        });
      }
      base = s;
      break;
    }
  }

  // 単一項目は原則すべて optional（未記入 OK）。空文字も許容する。
  void baseMessage;
  return base.optional().or(z.literal(""));
}

export function buildSectionFieldsSchema(
  fields: readonly FieldDefinition[],
): z.ZodObject<Record<string, ZodTypeAny>> {
  const shape: Record<string, ZodTypeAny> = {};
  for (const field of fields) {
    assertNoSensitiveKey(field.key);
    shape[field.key] = buildFieldSchema(field);
  }
  return z.object(shape);
}

// 初期値をフィールド定義から作る。API 応答（Record<string, string>）を上書きする土台。
export function buildDefaultValues(
  fields: readonly FieldDefinition[],
  initial?: Record<string, string>,
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of fields) {
    values[field.key] = initial?.[field.key] ?? "";
  }
  return values;
}
