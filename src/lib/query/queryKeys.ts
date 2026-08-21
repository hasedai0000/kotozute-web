import type { SectionSlug } from "@/features/notebook/constants/sections";

// feature 側ではこの集約からキーを引く（例: queryKeys.notebook.fields(section)）。
export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  notebook: {
    summary: ["notebook", "summary"] as const,
    fields: (section: SectionSlug) =>
      ["notebook", "fields", section] as const,
    entries: (section: SectionSlug) =>
      ["notebook", "entries", section] as const,
  },
  family: {
    members: ["family", "members"] as const,
  },
  messages: {
    list: ["messages", "list"] as const,
  },
} as const;
