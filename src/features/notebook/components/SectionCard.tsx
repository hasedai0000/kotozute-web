import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { SECTIONS, type SectionSlug } from "../constants/sections";
import { useSectionProgress } from "../hooks/useSectionProgress";

import { SectionProgress } from "./SectionProgress";

type SectionCardProps = {
  slug: SectionSlug;
  filledFields?: number;
  entryCountByCategory?: Partial<Record<string, number>>;
  className?: string;
};

export function SectionCard({
  slug,
  filledFields,
  entryCountByCategory,
  className,
}: SectionCardProps) {
  const def = SECTIONS[slug];
  const { filled, total } = useSectionProgress({
    section: slug,
    filledFields,
    entryCountByCategory,
  });

  return (
    <Link
      href={`/notebook/${slug}`}
      aria-label={`${def.label} を開く（${filled}/${total} 記入済み）`}
      className={cn(
        "group block rounded-xl outline-none transition-shadow",
        "focus-visible:ring-2 focus-visible:ring-ring/50",
        className,
      )}
    >
      <Card className="h-full transition-shadow group-hover:ring-foreground/20 group-focus-visible:ring-foreground/30">
        <CardHeader>
          <CardTitle>{def.label}</CardTitle>
          <CardDescription className="line-clamp-2">
            {def.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SectionProgress filled={filled} total={total} />
        </CardContent>
      </Card>
    </Link>
  );
}
