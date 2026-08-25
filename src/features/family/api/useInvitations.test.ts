import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchInvitations, isExpired, type Invitation } from "./useInvitations";

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

describe("fetchInvitations", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns invitations on 200", async () => {
    const invitations: Invitation[] = [
      {
        id: 1,
        email: "a@b.c",
        expiresAt: "2030-01-01T00:00:00Z",
        status: "pending",
      },
    ];
    fetchMock.mockResolvedValueOnce(jsonResponse(200, invitations));

    await expect(fetchInvitations()).resolves.toEqual(invitations);
  });

  it("returns [] on 404 (endpoint not yet implemented)", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(404, { message: "Not Found" }, "Not Found"),
    );

    await expect(fetchInvitations()).resolves.toEqual([]);
  });

  it("rethrows other errors (e.g. 500)", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(500, { message: "boom" }, "Server Error"),
    );

    await expect(fetchInvitations()).rejects.toMatchObject({ status: 500 });
  });
});

describe("isExpired", () => {
  it("uses status when present (expired)", () => {
    expect(
      isExpired({
        id: 1,
        email: "a@b.c",
        expiresAt: "2999-01-01T00:00:00Z",
        status: "expired",
      }),
    ).toBe(true);
  });

  it("uses status when present (pending)", () => {
    expect(
      isExpired({
        id: 1,
        email: "a@b.c",
        expiresAt: "1999-01-01T00:00:00Z",
        status: "pending",
      }),
    ).toBe(false);
  });

  it("falls back to expiresAt comparison when status missing (past → expired)", () => {
    const now = new Date("2026-08-25T00:00:00Z");
    expect(
      isExpired(
        { id: 1, email: "a@b.c", expiresAt: "2026-08-24T00:00:00Z" },
        now,
      ),
    ).toBe(true);
  });

  it("falls back to expiresAt comparison when status missing (future → not expired)", () => {
    const now = new Date("2026-08-25T00:00:00Z");
    expect(
      isExpired(
        { id: 1, email: "a@b.c", expiresAt: "2026-08-26T00:00:00Z" },
        now,
      ),
    ).toBe(false);
  });
});
