import { useQuery } from "@tanstack/react-query";

import { ApiError, apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/queryKeys";

// TODO(#W1-08+): OpenAPI 側で /user が定義され次第、src/types/generated から差し替える。
// role はサーバー側で未実装のため optional。未定義時は owner 扱い（Week 4 #34/#35 で family 判定を導入予定）。
export type AuthRole = "owner" | "family";
export type AuthUser = {
  id: number | string;
  name: string;
  email: string;
  role?: AuthRole;
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
