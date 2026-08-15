import { describe, expect, it } from "vitest";

import {
  FIELD_KEY_PATTERN,
  SECTIONS,
  SECTION_ORDER,
  SECTION_SLUGS,
  type SectionSlug,
} from "./sections";

describe("sections constants", () => {
  it("exposes 7 notebook sections in a stable order", () => {
    expect(SECTION_SLUGS).toEqual([
      "basic",
      "medical",
      "money",
      "digital",
      "funeral",
      "pet",
      "other",
    ]);
    expect(SECTION_ORDER).toEqual(SECTION_SLUGS);
  });

  it("has a definition for every slug whose .slug matches the map key", () => {
    for (const slug of SECTION_SLUGS) {
      const def = SECTIONS[slug];
      expect(def).toBeDefined();
      expect(def.slug).toBe<SectionSlug>(slug);
      expect(def.label.length).toBeGreaterThan(0);
      expect(def.description.length).toBeGreaterThan(0);
    }
  });

  it("marks only money and digital as sensitive", () => {
    const sensitive = SECTION_SLUGS.filter((slug) => SECTIONS[slug].sensitive);
    expect(sensitive.sort()).toEqual(["digital", "money"]);
  });

  it("defines 4 single-item fields on basic (氏名/生年月日/血液型/緊急連絡先)", () => {
    const keys = SECTIONS.basic.fields.map((f) => f.key);
    expect(keys).toEqual([
      "full_name",
      "birthdate",
      "blood_type",
      "emergency_contact",
    ]);
  });

  it("keeps all field keys within the safe pattern", () => {
    for (const slug of SECTION_SLUGS) {
      for (const field of SECTIONS[slug].fields) {
        expect(field.key).toMatch(FIELD_KEY_PATTERN);
      }
    }
  });

  it("never exposes sensitive input keys (password / pin / mynumber ...)", () => {
    const forbidden = ["password", "pin", "mynumber", "credit_card"];
    for (const slug of SECTION_SLUGS) {
      for (const field of SECTIONS[slug].fields) {
        expect(forbidden).not.toContain(field.key);
      }
    }
  });
});
