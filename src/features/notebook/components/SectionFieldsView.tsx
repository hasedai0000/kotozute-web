"use client";

import { Skeleton } from "@/components/ui/skeleton";

import { useNoteFields } from "../api/useNoteFields";
import type { FieldDefinition, SectionSlug } from "../constants/sections";

type Props = {
  slug: SectionSlug;
  fields: readonly FieldDefinition[];
  label: string;
};

export function SectionFieldsView({ slug, fields, label }: Props) {
  const query = useNoteFields(slug);

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        {fields.map((f) => (
          <div key={f.key} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    );
  }

  const values = query.data?.fields ?? {};

  return (
    <section aria-label={`${label}の単一項目`} className="flex flex-col gap-4">
      <dl className="flex flex-col gap-4">
        {fields.map((f) => {
          const v = values[f.key];
          const filled = typeof v === "string" && v.length > 0;
          return (
            <div key={f.key} className="flex flex-col gap-1">
              <dt className="text-sm font-medium">{f.label}</dt>
              <dd
                className={
                  filled
                    ? "whitespace-pre-wrap text-base leading-relaxed"
                    : "text-base text-muted-foreground"
                }
              >
                {filled ? v : "未記入"}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
