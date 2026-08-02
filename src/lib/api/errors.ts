// アプリ共通の API エラー。openapi-fetch と自前 apiFetch の両方で共有する。
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fields?: Record<string, string[]>;

  constructor(params: {
    status: number;
    message: string;
    code?: string;
    fields?: Record<string, string[]>;
  }) {
    super(params.message);
    this.name = "ApiError";
    this.status = params.status;
    this.code = params.code;
    this.fields = params.fields;
  }

  static isApiError(err: unknown): err is ApiError {
    return err instanceof ApiError;
  }

  static networkError(cause: unknown): ApiError {
    const err = new ApiError({
      status: 0,
      message: "ネットワークに接続できませんでした",
    });
    if (cause !== undefined) {
      (err as Error & { cause?: unknown }).cause = cause;
    }
    return err;
  }
}

type LaravelErrorBody = {
  message?: unknown;
  code?: unknown;
  errors?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseFields = (
  errors: unknown,
): Record<string, string[]> | undefined => {
  if (!isRecord(errors)) return undefined;
  const result: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(errors)) {
    if (Array.isArray(value)) {
      result[key] = value.map((v) => String(v));
    } else if (typeof value === "string") {
      result[key] = [value];
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
};

export function errorFromParsed(
  status: number,
  body: unknown,
  fallbackMessage = "Request failed",
): ApiError {
  const parsed = (isRecord(body) ? body : {}) as LaravelErrorBody;

  const message =
    typeof parsed.message === "string" && parsed.message.length > 0
      ? parsed.message
      : fallbackMessage;
  const code = typeof parsed.code === "string" ? parsed.code : undefined;
  const fields = parseFields(parsed.errors);

  return new ApiError({ status, message, code, fields });
}

export async function fromResponse(res: Response): Promise<ApiError> {
  const fallbackMessage = res.statusText || "Request failed";
  const contentType = res.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return new ApiError({ status: res.status, message: fallbackMessage });
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    return new ApiError({ status: res.status, message: fallbackMessage });
  }

  return errorFromParsed(res.status, body, fallbackMessage);
}
