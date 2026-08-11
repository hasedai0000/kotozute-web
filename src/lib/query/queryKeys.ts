// feature 側ではこの集約からキーを引く（例: queryKeys.notebook(familyId, section)）。
export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  notebook: {
    summary: ["notebook", "summary"] as const,
  },
  family: {
    members: ["family", "members"] as const,
  },
} as const;
