"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "@/components/layout/ConfirmDialog";
import { Button } from "@/components/ui/button";

import { useAddEntry } from "../api/useAddEntry";
import { useDeleteEntry } from "../api/useDeleteEntry";
import { useEntries, type NoteEntry } from "../api/useEntries";
import { useUpdateEntry } from "../api/useUpdateEntry";
import {
  CATEGORIES,
  type CategorySlug,
} from "../constants/categories";
import type { SectionSlug } from "../constants/sections";

import { EntryDialog } from "./EntryDialog";
import { EntryList, formatEntryTitle } from "./EntryList";

type SectionEntriesProps = {
  section: SectionSlug;
  categories: readonly CategorySlug[];
  sensitive?: boolean;
};

export function SectionEntries({
  section,
  categories,
  sensitive,
}: SectionEntriesProps) {
  const { data } = useEntries(section);
  const add = useAddEntry(section);
  const update = useUpdateEntry(section);
  const remove = useDeleteEntry(section);

  const [openCategory, setOpenCategory] = useState<CategorySlug | null>(null);
  const [editing, setEditing] = useState<NoteEntry | null>(null);
  const [deleting, setDeleting] = useState<NoteEntry | null>(null);

  if (categories.length === 0) return null;

  const entriesByCategory = groupByCategory(data?.entries ?? []);

  const activeCategory = editing?.category ?? openCategory;
  const dialogOpen = activeCategory !== null;

  const closeDialog = () => {
    setOpenCategory(null);
    setEditing(null);
  };

  return (
    <section aria-label="リスト項目" className="flex flex-col gap-8">
      {categories.map((c) => (
        <div key={c} className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-medium">{CATEGORIES[c].label}</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpenCategory(c)}
            >
              <Plus aria-hidden="true" />
              {CATEGORIES[c].label} を追加
            </Button>
          </div>
          <EntryList
            entries={entriesByCategory[c] ?? []}
            category={c}
            onEdit={(entry) => setEditing(entry)}
            onDelete={(entry) => setDeleting(entry)}
          />
        </div>
      ))}

      {dialogOpen && activeCategory ? (
        <EntryDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            if (!open) closeDialog();
          }}
          category={activeCategory}
          sensitive={sensitive}
          mode={editing ? "edit" : "create"}
          initial={editing?.values}
          onSubmit={(values) => {
            if (editing) {
              update.mutate({ id: editing.id, values });
            } else {
              add.mutate({ category: activeCategory, values });
            }
          }}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          open={deleting !== null}
          onOpenChange={(open) => {
            if (!open) setDeleting(null);
          }}
          title="この項目を削除しますか"
          description={`「${formatEntryTitle(
            CATEGORIES[deleting.category],
            deleting.values,
          )}」を削除します。この操作は取り消せません。`}
          variant="destructive"
          confirmLabel="削除する"
          onConfirm={async () => {
            // onError で toast + ロールバックが走るので、reject は握りつぶしてダイアログは閉じる。
            try {
              await remove.mutateAsync({ id: deleting.id });
            } catch {
              /* handled by mutation onError */
            }
          }}
        />
      ) : null}
    </section>
  );
}

function groupByCategory(
  entries: readonly NoteEntry[],
): Partial<Record<CategorySlug, NoteEntry[]>> {
  const acc: Partial<Record<CategorySlug, NoteEntry[]>> = {};
  for (const e of entries) {
    const bucket = acc[e.category] ?? [];
    bucket.push(e);
    acc[e.category] = bucket;
  }
  return acc;
}
