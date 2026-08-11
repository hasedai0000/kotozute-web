import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchFamilyMembers } from "./useFamilyMembers";

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

describe("fetchFamilyMembers", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns members on 200", async () => {
    const members = [
      {
        id: 1,
        name: "Taro",
        email: "a@b.c",
        role: "owner",
        joinedAt: "2026-01-01T00:00:00Z",
      },
    ];
    fetchMock.mockResolvedValueOnce(jsonResponse(200, members));

    await expect(fetchFamilyMembers()).resolves.toEqual(members);
  });

  it("returns [] on 404 (endpoint not yet implemented)", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(404, { message: "Not Found" }, "Not Found"),
    );

    await expect(fetchFamilyMembers()).resolves.toEqual([]);
  });

  it("rethrows other errors (e.g. 500)", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(500, { message: "boom" }, "Server Error"),
    );

    await expect(fetchFamilyMembers()).rejects.toMatchObject({ status: 500 });
  });
});
