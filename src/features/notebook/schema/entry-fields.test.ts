import { describe, expect, it } from "vitest";

import { CATEGORY_SLUGS } from "../constants/categories";

import { buildEntryDefaultValues, buildEntrySchema } from "./entry-fields";

describe("buildEntrySchema", () => {
  it("builds a schema for every category slug", () => {
    for (const slug of CATEGORY_SLUGS) {
      const schema = buildEntrySchema(slug);
      // shape が空でないことだけ確認（各カテゴリに最低 1 field ある前提）。
      expect(Object.keys(schema.shape).length).toBeGreaterThan(0);
    }
  });

  describe("bank_account", () => {
    it("requires bank_name", () => {
      const schema = buildEntrySchema("bank_account");
      const result = schema.safeParse({
        bank_name: "",
        branch: "",
        account_type: "",
        last4: "",
        memo: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message).join(",");
        expect(messages).toContain("銀行名");
      }
    });

    it("rejects last4 with more than 4 digits (口座番号は下 4 桁のみ)", () => {
      const schema = buildEntrySchema("bank_account");
      const result = schema.safeParse({
        bank_name: "◯◯銀行",
        branch: "",
        account_type: "",
        last4: "12345",
        memo: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message).join(",");
        expect(messages).toContain("4 桁");
      }
    });

    it("rejects last4 that contains non-digit characters", () => {
      const schema = buildEntrySchema("bank_account");
      const result = schema.safeParse({
        bank_name: "◯◯銀行",
        branch: "",
        account_type: "",
        last4: "12a4",
        memo: "",
      });
      expect(result.success).toBe(false);
    });

    it("accepts last4 with exactly 4 digits", () => {
      const schema = buildEntrySchema("bank_account");
      const result = schema.safeParse({
        bank_name: "◯◯銀行",
        branch: "",
        account_type: "",
        last4: "1234",
        memo: "",
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty last4 (未記入 OK)", () => {
      const schema = buildEntrySchema("bank_account");
      const result = schema.safeParse({
        bank_name: "◯◯銀行",
        branch: "",
        account_type: "",
        last4: "",
        memo: "",
      });
      expect(result.success).toBe(true);
    });

    it("enforces select options on account_type", () => {
      const schema = buildEntrySchema("bank_account");
      const bad = schema.safeParse({
        bank_name: "◯◯銀行",
        branch: "",
        account_type: "unknown",
        last4: "",
        memo: "",
      });
      expect(bad.success).toBe(false);

      const good = schema.safeParse({
        bank_name: "◯◯銀行",
        branch: "",
        account_type: "futsu",
        last4: "",
        memo: "",
      });
      expect(good.success).toBe(true);
    });
  });

  describe("account", () => {
    it("only accepts delete / keep / memorial for aftermath", () => {
      const schema = buildEntrySchema("account");
      const bad = schema.safeParse({
        service_name: "SNS",
        account_id: "",
        aftermath: "burn",
      });
      expect(bad.success).toBe(false);

      for (const value of ["delete", "keep", "memorial", ""]) {
        const good = schema.safeParse({
          service_name: "SNS",
          account_id: "",
          aftermath: value,
        });
        expect(good.success).toBe(true);
      }
    });
  });

  describe("maxLength", () => {
    it("rejects text values that exceed maxLength", () => {
      const schema = buildEntrySchema("insurance");
      const long = "a".repeat(61);
      const result = schema.safeParse({
        insurer: long,
        insurance_kind: "",
        policy_number: "",
        contact: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message).join(",");
        expect(messages).toContain("60");
      }
    });
  });
});

describe("buildEntryDefaultValues", () => {
  it("returns empty strings for every field in the category", () => {
    const defaults = buildEntryDefaultValues("bank_account");
    expect(defaults).toEqual({
      bank_name: "",
      branch: "",
      account_type: "",
      last4: "",
      memo: "",
    });
  });

  it("uses initial values when provided and falls back to empty string", () => {
    const defaults = buildEntryDefaultValues("insurance", {
      insurer: "◯◯生命",
    });
    expect(defaults).toEqual({
      insurer: "◯◯生命",
      insurance_kind: "",
      policy_number: "",
      contact: "",
    });
  });
});
