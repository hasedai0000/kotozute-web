import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { verifyInvitation } from "./verifyInvitation";

const jsonResponse = (
  status: number,
  body: unknown = null,
  statusText = "",
): Response =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    statusText,
    headers: body === null ? undefined : { "Content-Type": "application/json" },
  });

describe("verifyInvitation", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("hits GET /invitations/{token}/verify with url-encoded token", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { status: "valid", inviterName: "太郎" }),
    );

    await verifyInvitation("abc/def?x=1");

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain(
      `/invitations/${encodeURIComponent("abc/def?x=1")}/verify`,
    );
    expect((init as RequestInit)?.method).toBe("GET");
  });

  it("returns valid with inviterName and familyName", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        status: "valid",
        inviterName: "山田 太郎",
        familyName: "山田家",
      }),
    );

    await expect(verifyInvitation("tok")).resolves.toEqual({
      status: "valid",
      inviterName: "山田 太郎",
      familyName: "山田家",
      invitedEmail: undefined,
    });
  });

  it("returns valid with invitedEmail when provided", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        status: "valid",
        inviterName: "山田 太郎",
        invitedEmail: "family@example.com",
      }),
    );

    await expect(verifyInvitation("tok")).resolves.toEqual({
      status: "valid",
      inviterName: "山田 太郎",
      familyName: undefined,
      invitedEmail: "family@example.com",
    });
  });

  it("returns expired without leaking inviter info", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        status: "expired",
        // サーバが誤って情報を混ぜても、フロントの型で落とす
        inviterName: "should-not-appear",
        invitedEmail: "should-not-appear@example.com",
      }),
    );

    const res = await verifyInvitation("tok");
    expect(res).toEqual({ status: "expired" });
    expect(res).not.toHaveProperty("inviterName");
    expect(res).not.toHaveProperty("invitedEmail");
  });

  it("returns used", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { status: "used" }));
    await expect(verifyInvitation("tok")).resolves.toEqual({ status: "used" });
  });

  it("returns not_found for explicit body status", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { status: "not_found" }),
    );
    await expect(verifyInvitation("tok")).resolves.toEqual({
      status: "not_found",
    });
  });

  it("falls back to not_found on 404", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(404));
    await expect(verifyInvitation("tok")).resolves.toEqual({
      status: "not_found",
    });
  });

  it("falls back to expired on 410", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(410));
    await expect(verifyInvitation("tok")).resolves.toEqual({
      status: "expired",
    });
  });

  it("falls back to used on 409", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(409));
    await expect(verifyInvitation("tok")).resolves.toEqual({ status: "used" });
  });

  it("rethrows on 500", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(500, { message: "boom" }, "Server Error"),
    );
    await expect(verifyInvitation("tok")).rejects.toMatchObject({
      status: 500,
    });
  });

  it("returns not_found when body has an unknown status", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { status: "mystery" }));
    await expect(verifyInvitation("tok")).resolves.toEqual({
      status: "not_found",
    });
  });

  it("forwards Cookie header when cookieHeader is provided", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { status: "valid", inviterName: "太郎" }),
    );

    await verifyInvitation("tok", {
      cookieHeader: "laravel_session=abc; XSRF-TOKEN=xyz",
    });

    const [, init] = fetchMock.mock.calls[0]!;
    const headers = new Headers((init as RequestInit)?.headers);
    expect(headers.get("Cookie")).toBe(
      "laravel_session=abc; XSRF-TOKEN=xyz",
    );
  });

  it("omits Cookie header when cookieHeader is absent", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { status: "valid", inviterName: "太郎" }),
    );

    await verifyInvitation("tok");

    const [, init] = fetchMock.mock.calls[0]!;
    const headers = new Headers((init as RequestInit)?.headers);
    expect(headers.get("Cookie")).toBeNull();
  });
});
