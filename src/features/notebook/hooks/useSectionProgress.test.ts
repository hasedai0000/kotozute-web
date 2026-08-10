import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SECTIONS } from "../constants/sections";

import {
  computeSectionProgress,
  useSectionProgress,
} from "./useSectionProgress";

describe("useSectionProgress", () => {
  it("returns 0/0 with percent 0 when the section has no fields/categories and nothing is filled", () => {
    const { result } = renderHook(() =>
      useSectionProgress({ section: "basic" }),
    );
    const basic = SECTIONS.basic;
    expect(result.current.total).toBe(
      basic.fields.length + basic.entryCategories.length,
    );
    expect(result.current.filled).toBe(0);
    expect(result.current.percent).toBe(0);
  });

  it("reports 100% when all categories have at least one entry (money, all 4 categories)", () => {
    const { result } = renderHook(() =>
      useSectionProgress({
        section: "money",
        entryCountByCategory: {
          bank_account: 2,
          insurance: 1,
          property: 1,
          loan: 3,
        },
      }),
    );
    const money = SECTIONS.money;
    const expectedTotal = money.fields.length + money.entryCategories.length;
    expect(result.current.total).toBe(expectedTotal);
    expect(result.current.filled).toBe(expectedTotal);
    expect(result.current.percent).toBe(100);
  });

  it("reports partial progress when only some categories have entries", () => {
    const { result } = renderHook(() =>
      useSectionProgress({
        section: "money",
        entryCountByCategory: {
          bank_account: 1,
          insurance: 0,
          property: 5,
        },
      }),
    );
    const money = SECTIONS.money;
    expect(result.current.total).toBe(money.entryCategories.length);
    expect(result.current.filled).toBe(2);
    expect(result.current.percent).toBeGreaterThan(0);
    expect(result.current.percent).toBeLessThan(100);
  });

  it("clamps filledFields to the number of defined fields for the section", () => {
    const result = computeSectionProgress({
      section: "money",
      filledFields: 999,
    });
    expect(result.filled).toBeLessThanOrEqual(result.total);
  });

  it("ignores categories not defined for the section", () => {
    const result = computeSectionProgress({
      section: "pet",
      entryCountByCategory: {
        pet: 1,
        bank_account: 10,
      },
    });
    const pet = SECTIONS.pet;
    expect(result.total).toBe(pet.entryCategories.length);
    expect(result.filled).toBe(1);
  });

  it("hook and pure function produce the same result for the same input", () => {
    const input = {
      section: "digital" as const,
      entryCountByCategory: { account: 3, subscription: 0 },
    };
    const { result } = renderHook(() => useSectionProgress(input));
    expect(result.current).toEqual(computeSectionProgress(input));
  });
});
