import { describe, expect, it } from "vitest";

import { FORBIDDEN_KEYS } from "../schema/sensitive-keys";

import {
  CATEGORIES,
  CATEGORY_SLUGS,
  type CategorySlug,
} from "./categories";
import { FIELD_KEY_PATTERN } from "./sections";

describe("categories constants", () => {
  it("exposes 7 categories in a stable order", () => {
    expect(CATEGORY_SLUGS).toEqual([
      "bank_account",
      "insurance",
      "property",
      "loan",
      "account",
      "subscription",
      "pet",
    ]);
  });

  it("has a definition for every slug whose .slug matches the map key", () => {
    for (const slug of CATEGORY_SLUGS) {
      const def = CATEGORIES[slug];
      expect(def).toBeDefined();
      expect(def.slug).toBe<CategorySlug>(slug);
      expect(def.label.length).toBeGreaterThan(0);
      expect(def.fields.length).toBeGreaterThan(0);
    }
  });

  it("keeps all field keys within FIELD_KEY_PATTERN", () => {
    for (const slug of CATEGORY_SLUGS) {
      for (const field of CATEGORIES[slug].fields) {
        expect(field.key).toMatch(FIELD_KEY_PATTERN);
      }
    }
  });

  // DoD 直結: パスワード・暗証番号・マイナンバー入力欄が構造上存在しない。
  // FORBIDDEN_KEYS を全部列挙して漏れなく検証する。
  it("never exposes any FORBIDDEN key (password / pin / mynumber / credit_card ...)", () => {
    for (const slug of CATEGORY_SLUGS) {
      for (const field of CATEGORIES[slug].fields) {
        expect(FORBIDDEN_KEYS).not.toContain(field.key);
      }
    }
  });

  it("has at least one required field per category", () => {
    for (const slug of CATEGORY_SLUGS) {
      const required = CATEGORIES[slug].fields.filter((f) => f.required);
      expect(required.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("declares primaryKey / metaKeys that actually exist in fields", () => {
    for (const slug of CATEGORY_SLUGS) {
      const def = CATEGORIES[slug];
      const keys = new Set(def.fields.map((f) => f.key));
      expect(keys.has(def.primaryKey)).toBe(true);
      for (const metaKey of def.metaKeys) {
        expect(keys.has(metaKey)).toBe(true);
      }
    }
  });

  it("stores the account number field as digits4 (フル桁を書ける枠が存在しない)", () => {
    const last4 = CATEGORIES.bank_account.fields.find((f) => f.key === "last4");
    expect(last4?.kind).toBe("digits4");
  });

  it("warns about not writing PINs / passwords in money & digital category helpers", () => {
    // 「暗証番号」「パスワード」など、書いてはいけないものへの言及が
    // money / digital 系カテゴリの helperText に存在すること（DoD「注意文が定義済み」）。
    const groups: readonly CategorySlug[] = [
      "bank_account",
      "account",
      "subscription",
    ];
    for (const slug of groups) {
      const helpers = CATEGORIES[slug].fields
        .map((f) => f.helperText ?? "")
        .join("\n");
      expect(helpers).toMatch(/(暗証番号|パスワード)/);
    }
  });

  it("provides select options for account_type and aftermath", () => {
    const accountType = CATEGORIES.bank_account.fields.find(
      (f) => f.key === "account_type",
    );
    expect(accountType?.kind).toBe("select");
    expect(accountType?.options?.map((o) => o.value)).toEqual([
      "futsu",
      "toza",
    ]);

    const aftermath = CATEGORIES.account.fields.find(
      (f) => f.key === "aftermath",
    );
    expect(aftermath?.kind).toBe("select");
    expect(aftermath?.options?.map((o) => o.value)).toEqual([
      "delete",
      "keep",
      "memorial",
    ]);
  });
});
