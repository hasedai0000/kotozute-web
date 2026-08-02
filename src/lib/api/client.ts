// Sanctum クッキー送信を強制する薄い fetch ラッパー。openapi-fetch と併存し、
// エラーは共通の ApiError に整形して throw する。CSRF cookie の取得は呼び出し側の責務。
import { ApiError, fromResponse } from "./errors";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export type ApiRequestInit = Omit<RequestInit, "headers" | "body"> & {
  headers?: HeadersInit;
  body?: BodyInit | null;
  json?: unknown;
  baseUrl?: string;
};

const isAbsoluteUrl = (path: string): boolean => /^https?:\/\//i.test(path);

const resolveUrl = (path: string, baseUrl: string): string => {
  if (isAbsoluteUrl(path)) return path;
  if (!baseUrl) return path;
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
};

export async function apiFetch<T = unknown>(
  path: string,
  init: ApiRequestInit = {},
): Promise<T> {
  const { json, baseUrl, headers, body, ...rest } = init;

  const mergedHeaders = new Headers(headers);
  if (!mergedHeaders.has("Accept")) {
    mergedHeaders.set("Accept", "application/json");
  }
  if (!mergedHeaders.has("X-Requested-With")) {
    mergedHeaders.set("X-Requested-With", "XMLHttpRequest");
  }

  let finalBody: BodyInit | null | undefined = body;
  if (json !== undefined) {
    finalBody = JSON.stringify(json);
    if (!mergedHeaders.has("Content-Type")) {
      mergedHeaders.set("Content-Type", "application/json");
    }
  }

  const url = resolveUrl(path, baseUrl ?? BASE_URL);

  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: mergedHeaders,
      body: finalBody,
      // Sanctum クッキー必須のため上書き禁止
      credentials: "include",
    });
  } catch (cause) {
    throw ApiError.networkError(cause);
  }

  if (!res.ok) {
    throw await fromResponse(res);
  }

  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }

  return undefined as T;
}
