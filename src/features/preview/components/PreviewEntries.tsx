import type { NoteEntry } from "@/features/notebook/api/useEntries";

import { PreviewEntry } from "./PreviewEntry";

const EMPTY_LABEL = "（登録がありません）";

type PreviewEntriesProps = {
  entries: readonly NoteEntry[];
  showUnfilled: boolean;
};

export function PreviewEntries({ entries, showUnfilled }: PreviewEntriesProps) {
  if (entries.length === 0) {
    if (!showUnfilled) return null;
    return (
      <p className="text-sm italic text-muted-foreground">{EMPTY_LABEL}</p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry) => (
        <PreviewEntry key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
