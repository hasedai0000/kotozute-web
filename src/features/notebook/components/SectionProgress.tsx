import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type SectionProgressProps = {
  filled: number;
  total: number;
  label?: string;
  className?: string;
};

export function SectionProgress({
  filled,
  total,
  label,
  className,
}: SectionProgressProps) {
  const safeTotal = Math.max(0, total);
  const safeFilled = Math.max(0, Math.min(filled, safeTotal));
  const percent = safeTotal === 0 ? 0 : (safeFilled / safeTotal) * 100;

  const ariaLabel = label
    ? `${label} の進捗 ${safeFilled}/${safeTotal}`
    : `進捗 ${safeFilled}/${safeTotal}`;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between text-sm">
        {label ? (
          <span className="font-medium text-foreground">{label}</span>
        ) : (
          <span className="sr-only">進捗</span>
        )}
        <span className="tabular-nums text-muted-foreground">
          {safeFilled}/{safeTotal}
        </span>
      </div>
      <Progress
        value={percent}
        aria-label={ariaLabel}
        className="w-full gap-0"
      />
    </div>
  );
}
