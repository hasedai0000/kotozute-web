import { useQuery } from "@tanstack/react-query";

import { ApiError, apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/queryKeys";

// TODO(#31+): OpenAPI に /family/members が定義され次第、src/types/generated から型を差し替える。
export type FamilyMemberRole = "owner" | "family";
export type FamilyMember = {
  id: number | string;
  name: string;
  email: string;
  role: FamilyMemberRole;
  joinedAt: string;
};

export async function fetchFamilyMembers(): Promise<FamilyMember[]> {
  try {
    return await apiFetch<FamilyMember[]>("/family/members");
  } catch (err) {
    if (ApiError.isApiError(err) && err.status === 404) {
      return [];
    }
    throw err;
  }
}

export function useFamilyMembers() {
  return useQuery({
    queryKey: queryKeys.family.members,
    queryFn: fetchFamilyMembers,
    retry: false,
    staleTime: 30_000,
  });
}
