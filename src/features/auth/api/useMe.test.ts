import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchMe } from "./useMe";

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

describe("fetchMe", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the user on 200", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { id: 1, name: "Taro", email: "a@b.c" }),
    );

    await expect(fetchMe()).resolves.toEqual({
      id: 1,
      name: "Taro",
      email: "a@b.c",
    });
  });

  it("returns null on 401 (unauthenticated)", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { message: "Unauthenticated." }, "Unauthorized"),
    );

    await expect(fetchMe()).resolves.toBeNull();
  });

  it("returns null on 419 (CSRF token mismatch / session expired)", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(419, { message: "CSRF token mismatch." }),
    );

    await expect(fetchMe()).resolves.toBeNull();
  });

  it("rethrows other errors (e.g. 500)", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(500, { message: "boom" }, "Server Error"),
    );

    await expect(fetchMe()).rejects.toMatchObject({ status: 500 });
  });
});
