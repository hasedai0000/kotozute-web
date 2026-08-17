"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import {
  CATEGORIES,
  type CategorySlug,
} from "../constants/categories";

import { EntryDialog } from "./EntryDialog";

// #22 の受け皿。#23 で useEntries / useAddEntry を差し込み、
// onSubmit を mutation に置き換える。それまでは開閉制御と
// EntryDialog のマウントだけを担う薄いホスト。
type SectionEntriesProps = {
  categories: readonly CategorySlug[];
  sensitive?: boolean;
};

export function SectionEntries({ categories, sensitive }: SectionEntriesProps) {
  const [openCategory, setOpenCategory] = useState<CategorySlug | null>(null);

  if (categories.length === 0) return null;

  return (
    <section
      aria-label="リスト項目の追加"
      className="flex flex-col gap-3"
    >
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <Button
            key={c}
            type="button"
            variant="outline"
            onClick={() => setOpenCategory(c)}
          >
            <Plus aria-hidden="true" />
            {CATEGORIES[c].label} を追加
          </Button>
        ))}
      </div>
      {openCategory ? (
        <EntryDialog
          open={openCategory !== null}
          onOpenChange={(open) => {
            if (!open) setOpenCategory(null);
          }}
          category={openCategory}
          sensitive={sensitive}
          // TODO(#23): useAddEntry(section, category).mutate(values) に差し替える。
          // それまでは受け取った値を破棄する（ダイアログ閉じは EntryDialog 側で行う）。
          onSubmit={() => undefined}
        />
      ) : null}
    </section>
  );
}
