import type { FieldDefinition } from "@/features/notebook/constants/sections";

const UNFILLED_LABEL = "（未記入）";

type PreviewFieldsProps = {
  fields: readonly FieldDefinition[];
  values: Record<string, string>;
  showUnfilled: boolean;
};

function isFilled(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function PreviewFields({
  fields,
  values,
  showUnfilled,
}: PreviewFieldsProps) {
  const visible = showUnfilled
    ? fields
    : fields.filter((f) => isFilled(values[f.key]));

  if (visible.length === 0) {
    return null;
  }

  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-[10rem_1fr] sm:gap-x-6 sm:gap-y-3">
      {visible.map((f) => {
        const value = values[f.key];
        const filled = isFilled(value);
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
              {filled ? value : UNFILLED_LABEL}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
