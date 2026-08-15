import { z, type ZodTypeAny } from "zod";

import {
  CATEGORIES,
  type CategoryFieldDefinition,
  type CategorySlug,
} from "../constants/categories";

import { assertNoSensitiveKey } from "./sensitive-keys";

function buildFieldSchema(field: CategoryFieldDefinition): ZodTypeAny {
  const requiredMessage = `${field.label}を入力してください`;
  const required = field.required === true;

  switch (field.kind) {
    case "digits4": {
      // 「口座番号は下 4 桁のみ」を Zod でも二重にロック。
      // 型（kind='digits4'）で構造的に、Zod で値も規制する。
      const digits = z
        .string()
        .regex(/^\d{4}$/u, `${field.label}は半角数字 4 桁で入力してください`);
      if (required) return digits;
      return z.union([z.literal(""), digits]);
    }
    case "select": {
      const values = (field.options ?? []).map((o) => o.value);
      if (values.length === 0) {
        throw new Error(
          `[entry-fields] "${field.key}" は select ですが options が空です`,
        );
      }
      const enumSchema = z.enum(values as [string, ...string[]], {
        message: `${field.label}を選択してください`,
      });
      if (required) return enumSchema;
      return z.union([z.literal(""), enumSchema]);
    }
    case "text":
    case "textarea":
    default: {
      let base = z.string();
      if (field.maxLength !== undefined) {
        base = base.max(field.maxLength, {
          message: `${field.label}は${field.maxLength}文字以内で入力してください`,
        });
      }
      if (required) {
        return base.min(1, { message: requiredMessage });
      }
      // 未記入 OK（空文字許容）。RHF の defaultValues と揃える。
      return base.optional().or(z.literal(""));
    }
  }
}

export function buildEntryFieldsSchema(
  fields: readonly CategoryFieldDefinition[],
): z.ZodObject<Record<string, ZodTypeAny>> {
  const shape: Record<string, ZodTypeAny> = {};
  for (const field of fields) {
    assertNoSensitiveKey(field.key);
    shape[field.key] = buildFieldSchema(field);
  }
  return z.object(shape);
}

export function buildEntrySchema(
  category: CategorySlug,
): z.ZodObject<Record<string, ZodTypeAny>> {
  const def = CATEGORIES[category];
  return buildEntryFieldsSchema(def.fields);
}

// RHF の defaultValues 用。未指定は空文字で初期化する。
// buildDefaultValues（section-fields）と同じ流儀。
export function buildEntryDefaultValues(
  category: CategorySlug,
  initial?: Record<string, string>,
): Record<string, string> {
  const def = CATEGORIES[category];
  const values: Record<string, string> = {};
  for (const field of def.fields) {
    values[field.key] = initial?.[field.key] ?? "";
  }
  return values;
}
