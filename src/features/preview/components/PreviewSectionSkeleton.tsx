import { Skeleton } from "@/components/ui/skeleton";

export function PreviewSectionSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="読み込み中">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
