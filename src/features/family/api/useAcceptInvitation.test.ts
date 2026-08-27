import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";

import { acceptInvitation } from "./useAcceptInvitation";

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

describe("acceptInvitation", () => {
  const fetchMock = vi.fn<typeof fetch>();
  const originalCookieDescriptor = Object.getOwnPropertyDescriptor(
    Document.prototype,
    "cookie",
  );

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get: () => "",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalCookieDescriptor) {
      Object.defineProperty(document, "cookie", originalCookieDescriptor);
    }
  });

  it("POST /invitations/{token}/accept with url-encoded token", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(204));

    await expect(
      acceptInvitation({ token: "abc/def" }),
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain(
      `/invitations/${encodeURIComponent("abc/def")}/accept`,
    );
    expect((init as RequestInit)?.method).toBe("POST");
  });

  it("forwards X-XSRF-TOKEN header when cookie present", async () => {
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get: () => "XSRF-TOKEN=csrf-abc",
    });
    fetchMock.mockResolvedValueOnce(jsonResponse(204));

    await acceptInvitation({ token: "tok" });

    const [, init] = fetchMock.mock.calls[0]!;
    const headers = new Headers((init as RequestInit)?.headers);
    expect(headers.get("X-XSRF-TOKEN")).toBe("csrf-abc");
  });

  it("omits X-XSRF-TOKEN header when cookie absent", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(204));

    await acceptInvitation({ token: "tok" });

    const [, init] = fetchMock.mock.calls[0]!;
    const headers = new Headers((init as RequestInit)?.headers);
    expect(headers.get("X-XSRF-TOKEN")).toBeNull();
  });

  it("rejects with ApiError on 401 (session expired)", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { message: "Unauthenticated." }, "Unauthorized"),
    );

    await expect(acceptInvitation({ token: "tok" })).rejects.toSatisfy(
      (err) => ApiError.isApiError(err) && err.status === 401,
    );
  });

  it("rejects with ApiError on 410 (invitation expired)", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(410, { message: "Gone" }, "Gone"),
    );

    await expect(acceptInvitation({ token: "tok" })).rejects.toSatisfy(
      (err) => ApiError.isApiError(err) && err.status === 410,
    );
  });

  it("rejects with ApiError on 409 (already accepted)", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(409, { message: "Conflict" }, "Conflict"),
    );

    await expect(acceptInvitation({ token: "tok" })).rejects.toSatisfy(
      (err) => ApiError.isApiError(err) && err.status === 409,
    );
  });

  it("rejects with ApiError on 500", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(500, { message: "boom" }, "Server Error"),
    );

    await expect(acceptInvitation({ token: "tok" })).rejects.toMatchObject({
      status: 500,
    });
  });
});
