import { notFound } from "next/navigation";

import { SectionBreadcrumb } from "@/features/notebook/components/SectionBreadcrumb";
import { SectionNav } from "@/features/notebook/components/SectionNav";
import { SectionProgressLive } from "@/features/notebook/components/SectionProgressLive";
import { SectionSensitiveNotice } from "@/features/notebook/components/SectionSensitiveNotice";
import {
  SECTIONS,
  SECTION_SLUGS,
  type SectionSlug,
} from "@/features/notebook/constants/sections";

type Params = { section: string };

export function generateStaticParams(): Array<{ section: SectionSlug }> {
  return SECTION_SLUGS.map((section) => ({ section }));
}

function isSectionSlug(value: string): value is SectionSlug {
  return (SECTION_SLUGS as readonly string[]).includes(value);
}

export default async function NotebookSectionPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { section } = await params;
  if (!isSectionSlug(section)) {
    notFound();
  }
  const def = SECTIONS[section];

  return (
    <div className="flex flex-col gap-6">
      <SectionBreadcrumb sectionLabel={def.label} />
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">{def.label}</h1>
        <SectionProgressLive slug={section} />
      </div>
      <p className="text-sm text-muted-foreground">{def.description}</p>
      {def.sensitive ? <SectionSensitiveNotice /> : null}
      <SectionNav currentSlug={section} />
    </div>
  );
}
