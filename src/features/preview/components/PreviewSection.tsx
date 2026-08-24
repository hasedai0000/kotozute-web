"use client";

import { useEntries } from "@/features/notebook/api/useEntries";
import { useNoteFields } from "@/features/notebook/api/useNoteFields";
import {
  SECTIONS,
  type SectionSlug,
} from "@/features/notebook/constants/sections";
import { cn } from "@/lib/utils";

import { PreviewEntries } from "./PreviewEntries";
import { PreviewFields } from "./PreviewFields";
import { PreviewSectionSkeleton } from "./PreviewSectionSkeleton";

const UNFILLED_MARK = "（未記入）";

type PreviewSectionProps = {
  slug: SectionSlug;
  showUnfilled: boolean;
  isFirst?: boolean;
};

function countFilled(values: Record<string, string> | undefined): number {
  if (!values) return 0;
  return Object.values(values).filter((v) => typeof v === "string" && v.trim().length > 0).length;
}

export function PreviewSection({
  slug,
  showUnfilled,
  isFirst = false,
}: PreviewSectionProps) {
  const def = SECTIONS[slug];
  const fieldsQuery = useNoteFields(slug);
  const entriesQuery = useEntries(slug);

  const isPending = fieldsQuery.isPending || entriesQuery.isPending;
  const fieldValues = fieldsQuery.data?.fields ?? {};
  const entries = entriesQuery.data?.entries ?? [];
  const filledFieldCount = countFilled(fieldValues);
  const isEmpty = filledFieldCount === 0 && entries.length === 0;

  const showFields = def.fields.length > 0 && (showUnfilled || filledFieldCount > 0);
  const showEntries =
    def.entryCategories.length > 0 && (showUnfilled || entries.length > 0);

  return (
    <section
      aria-labelledby={`preview-section-${slug}`}
      className={cn(
        "flex flex-col gap-4",
        !isFirst && "print:break-before-page",
      )}
    >
      <header className="flex flex-col gap-1">
        <h2
          id={`preview-section-${slug}`}
          className="text-xl font-semibold text-foreground"
        >
          {def.label}
          {isEmpty && !showUnfilled && !isPending && (
            <span className="ml-2 text-sm font-normal italic text-muted-foreground">
              {UNFILLED_MARK}
            </span>
          )}
        </h2>
        <p className="text-sm text-muted-foreground">{def.description}</p>
      </header>

      {isPending ? (
        <PreviewSectionSkeleton />
      ) : (
        <div className="flex flex-col gap-4">
          {showFields && (
            <PreviewFields
              fields={def.fields}
              values={fieldValues}
              showUnfilled={showUnfilled}
            />
          )}
          {showEntries && (
            <PreviewEntries entries={entries} showUnfilled={showUnfilled} />
          )}
        </div>
      )}
    </section>
  );
}
