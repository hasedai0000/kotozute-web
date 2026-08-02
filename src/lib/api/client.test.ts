import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { apiFetch } from "./client";
import { ApiError } from "./errors";

const jsonResponse = (
  status: number,
  body: unknown,
  statusText = "",
): Response =>
  new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { "Content-Type": "application/json" },
  });

describe("apiFetch", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns parsed JSON on success", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true, id: 42 }));

    const result = await apiFetch<{ ok: boolean; id: number }>("/me");

    expect(result).toEqual({ ok: true, id: 42 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("forces credentials to 'include' even if caller passes 'omit'", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));

    await apiFetch("/me", { credentials: "omit" });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.credentials).toBe("include");
  });

  it("attaches X-Requested-With and Accept headers by default", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));

    await apiFetch("/me");

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get("X-Requested-With")).toBe("XMLHttpRequest");
    expect(headers.get("Accept")).toBe("application/json");
  });

  it("serializes the json option and sets Content-Type", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));

    await apiFetch("/login", { method: "POST", json: { email: "a@b.c" } });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ email: "a@b.c" }));
  });

  it("throws ApiError with fields on 422", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(422, {
        message: "The given data was invalid.",
        errors: { email: ["required"] },
      }),
    );

    await expect(apiFetch("/login", { method: "POST" })).rejects.toSatisfy(
      (err) =>
        ApiError.isApiError(err) &&
        err.status === 422 &&
        err.fields?.email?.[0] === "required",
    );
  });

  it("wraps network failures in ApiError.networkError", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(apiFetch("/me")).rejects.toSatisfy(
      (err) => ApiError.isApiError(err) && err.status === 0,
    );
  });

  it("returns undefined for 204 responses", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const result = await apiFetch("/logout", { method: "POST" });

    expect(result).toBeUndefined();
  });
});
