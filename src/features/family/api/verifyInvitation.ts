import { ApiError, apiFetch } from "@/lib/api";

// TODO(#34+): OpenAPI に GET /invitations/{token}/verify が定義され次第、src/types/generated から型を差し替える。

export type InvitationVerificationStatus =
  | "valid"
  | "expired"
  | "used"
  | "not_found";

export type InvitationVerificationResult =
  | {
      status: "valid";
      // 招待者名・家族名・招待メールは valid のときのみ返す。無効ケースでは絶対に含めない
      // （screen_spec §6：期限切れ・使用済み・不正は「何のノートか／誰の招待か」を漏らさない）。
      // invitedEmail は #35 のアカウント違い警告で使う（無ければ safe default で警告を出さない）。
      inviterName: string;
      familyName?: string;
      invitedEmail?: string;
    }
  | { status: "expired" }
  | { status: "used" }
  | { status: "not_found" };

type VerifyBody = {
  status?: unknown;
  inviterName?: unknown;
  familyName?: unknown;
  invitedEmail?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseBody = (raw: unknown): InvitationVerificationResult | null => {
  if (!isRecord(raw)) return null;
  const body = raw as VerifyBody;
  const status = body.status;
  if (status === "expired" || status === "used" || status === "not_found") {
    return { status };
  }
  if (status === "valid") {
    const inviterName =
      typeof body.inviterName === "string" ? body.inviterName : "";
    const familyName =
      typeof body.familyName === "string" ? body.familyName : undefined;
    const invitedEmail =
      typeof body.invitedEmail === "string" ? body.invitedEmail : undefined;
    return { status: "valid", inviterName, familyName, invitedEmail };
  }
  return null;
};

export type VerifyInvitationOptions = {
  // SSR から Sanctum セッションを転送するための Cookie ヘッダ文字列（`name=value; ...`）。
  // 未ログインでも招待トークンで検証できる想定なので、無くても動く。
  cookieHeader?: string;
};

export async function verifyInvitation(
  token: string,
  opts: VerifyInvitationOptions = {},
): Promise<InvitationVerificationResult> {
  const path = `/invitations/${encodeURIComponent(token)}/verify`;

  try {
    const body = await apiFetch<unknown>(path, {
      method: "GET",
      headers: opts.cookieHeader ? { Cookie: opts.cookieHeader } : undefined,
      cache: "no-store",
    });
    const parsed = parseBody(body);
    if (parsed) return parsed;
    // status が識別できない or レスポンスが空: 安全側に倒して not_found
    return { status: "not_found" };
  } catch (err) {
    if (ApiError.isApiError(err)) {
      // バック実装が HTTP コードで意味を運ぶ場合のフォールバック
      if (err.status === 404) return { status: "not_found" };
      if (err.status === 410) return { status: "expired" };
      if (err.status === 409) return { status: "used" };
    }
    throw err;
  }
}
