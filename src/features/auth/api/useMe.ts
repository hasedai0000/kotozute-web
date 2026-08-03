import { useQuery } from "@tanstack/react-query";

import { ApiError, apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/queryKeys";

// TODO(#W1-08+): OpenAPI 側で /user が定義され次第、src/types/generated から差し替える。
export type AuthUser = {
  id: number | string;
  name: string;
  email: string;
};

export async function fetchMe(): Promise<AuthUser | null> {
  try {
    return await apiFetch<AuthUser>("/user");
  } catch (err) {
    if (ApiError.isApiError(err) && (err.status === 401 || err.status === 419)) {
      return null;
    }
    throw err;
  }
}

export function useMe() {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: fetchMe,
    retry: false,
    staleTime: 30_000,
  });
}
