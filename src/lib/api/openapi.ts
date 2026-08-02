import createClient from "openapi-fetch";

import type { paths } from "@/types/generated/api";

import { ApiError, errorFromParsed } from "./errors";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export const apiClient = createClient<paths>({
  baseUrl: BASE_URL,
  credentials: "include",
  headers: {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

type OpenApiResult<T> =
  | { data: T; error?: never; response: Response }
  | { data?: never; error: unknown; response: Response };

// openapi-fetch は成功時 { data } / 失敗時 { error } を返すが、features 側は throw で扱う。
// TanStack Query の queryFn / mutationFn は必ずこの unwrap を通すこと。
export async function unwrap<T>(
  promise: Promise<OpenApiResult<T>>,
): Promise<T> {
  let result: OpenApiResult<T>;
  try {
    result = await promise;
  } catch (cause) {
    throw ApiError.networkError(cause);
  }

  if (result.error !== undefined) {
    throw errorFromParsed(
      result.response.status,
      result.error,
      result.response.statusText || "Request failed",
    );
  }

  return result.data as T;
}
