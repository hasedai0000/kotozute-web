import { useMemo } from "react";

import { SECTIONS, type SectionSlug } from "../constants/sections";

export type SectionProgressInput = {
  section: SectionSlug;
  filledFields?: number;
  entryCountByCategory?: Partial<Record<string, number>>;
};

export type SectionProgress = {
  filled: number;
  total: number;
  percent: number;
};

export function computeSectionProgress(
  input: SectionProgressInput,
): SectionProgress {
  const { section, filledFields = 0, entryCountByCategory } = input;
  const def = SECTIONS[section];

  const fieldTotal = def.fields.length;
  const categoryTotal = def.entryCategories.length;
  const total = fieldTotal + categoryTotal;

  const clampedFilledFields = Math.max(
    0,
    Math.min(Math.floor(filledFields), fieldTotal),
  );
  const filledCategories = def.entryCategories.reduce((acc, category) => {
    const count = entryCountByCategory?.[category] ?? 0;
    return count > 0 ? acc + 1 : acc;
  }, 0);

  const filled = clampedFilledFields + filledCategories;
  const percent = total === 0 ? 0 : (filled / total) * 100;

  return { filled, total, percent };
}

export function useSectionProgress(
  input: SectionProgressInput,
): SectionProgress {
  const { section, filledFields, entryCountByCategory } = input;
  return useMemo(
    () =>
      computeSectionProgress({ section, filledFields, entryCountByCategory }),
    [section, filledFields, entryCountByCategory],
  );
}
