import { describe, expect, it } from "vitest";

import {
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
});
