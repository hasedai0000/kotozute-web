import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type SectionCardSkeletonProps = {
  className?: string;
};

export function SectionCardSkeleton({ className }: SectionCardSkeletonProps) {
  return (
    <Card
      role="status"
      aria-label="読み込み中"
      className={cn("h-full", className)}
    >
      <CardHeader>
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="mt-2 h-4 w-full" />
        <Skeleton className="mt-1 h-4 w-4/5" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="mt-1.5 h-2 w-full rounded-full" />
      </CardContent>
    </Card>
  );
}
