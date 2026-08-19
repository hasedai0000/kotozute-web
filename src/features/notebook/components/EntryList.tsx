import { EmptyState } from "@/components/layout/EmptyState";

import {
  CATEGORIES,
  type CategoryDefinition,
  type CategorySlug,
} from "../constants/categories";

import type { NoteEntry } from "../api/useEntries";

import { EntryCard } from "./EntryCard";

type EntryListProps = {
  entries: readonly NoteEntry[];
  category: CategorySlug;
  readOnly?: boolean;
  onEdit?: (entry: NoteEntry) => void;
  onDelete?: (entry: NoteEntry) => void;
};

export function EntryList({
  entries,
  category,
  readOnly,
  onEdit,
  onDelete,
}: EntryListProps) {
  const def = CATEGORIES[category];

  if (entries.length === 0) {
    return (
      <EmptyState
        title="まだ登録がありません"
        description={`「追加」から${def.label}を登録してください。`}
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {entries.map((entry) => (
        <li key={entry.id}>
          <EntryCard
            title={formatEntryTitle(def, entry.values)}
            meta={formatEntryMeta(def, entry.values)}
            timing={entry.timing}
            readOnly={readOnly}
            onEdit={onEdit ? () => onEdit(entry) : undefined}
            onDelete={onDelete ? () => onDelete(entry) : undefined}
          />
        </li>
      ))}
    </ul>
  );
}

const UNSET_TITLE = "(名称未設定)";

export function formatEntryTitle(
  def: CategoryDefinition,
  values: Record<string, string>,
): string {
  const raw = values[def.primaryKey];
  return raw && raw.trim().length > 0 ? raw : UNSET_TITLE;
}

export function formatEntryMeta(
  def: CategoryDefinition,
  values: Record<string, string>,
): string | null {
  const parts: string[] = [];
  for (const key of def.metaKeys) {
    const raw = values[key];
    if (raw === undefined || raw === "") continue;
    const field = def.fields.find((f) => f.key === key);
    if (!field) continue;
    const label = field.label;
    const display =
      field.kind === "select"
        ? (field.options ?? []).find((o) => o.value === raw)?.label ?? raw
        : raw;
    parts.push(`${label}：${display}`);
  }
  return parts.length === 0 ? null : parts.join(" / ");
}
