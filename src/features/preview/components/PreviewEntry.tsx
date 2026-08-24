import { TimingBadge } from "@/features/notebook/components/TimingBadge";
import {
  CATEGORIES,
  type CategorySlug,
} from "@/features/notebook/constants/categories";
import type { NoteEntry } from "@/features/notebook/api/useEntries";

const UNFILLED_LABEL = "（未記入）";

type PreviewEntryProps = {
  entry: NoteEntry;
};

function resolveDisplay(
  category: CategorySlug,
  key: string,
  value: string | undefined,
): string | undefined {
  if (value === undefined || value === "") return undefined;
  const field = CATEGORIES[category].fields.find((f) => f.key === key);
  if (field?.kind === "select" && field.options) {
    return field.options.find((o) => o.value === value)?.label ?? value;
  }
  return value;
}

export function PreviewEntry({ entry }: PreviewEntryProps) {
  const def = CATEGORIES[entry.category];
  const titleValue = resolveDisplay(
    entry.category,
    def.primaryKey,
    entry.values[def.primaryKey],
  );
  const title = titleValue ?? UNFILLED_LABEL;
  const otherFields = def.fields.filter((f) => f.key !== def.primaryKey);

  return (
    <article className="rounded-md border border-border bg-card px-4 py-3">
      <header className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-foreground">
          <span className="mr-2 text-xs font-normal text-muted-foreground">
            {def.label}
          </span>
          {title}
        </h3>
        <TimingBadge variant={entry.timing} />
      </header>
      {otherFields.length > 0 && (
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-[10rem_1fr] sm:gap-x-6 sm:gap-y-2">
          {otherFields.map((f) => {
            const display = resolveDisplay(
              entry.category,
              f.key,
              entry.values[f.key],
            );
            const filled = display !== undefined;
            return (
              <div key={f.key} className="contents">
                <dt className="text-sm font-medium text-muted-foreground">
                  {f.label}
                </dt>
                <dd
                  className={
                    filled
                      ? "whitespace-pre-wrap text-sm text-foreground"
                      : "text-sm italic text-muted-foreground"
                  }
                >
                  {filled ? display : UNFILLED_LABEL}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </article>
  );
}
