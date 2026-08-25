import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resendInvite } from "./useResendInvite";

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

describe("resendInvite", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POST /family/invitations/{id}/resend and returns updated invitation with new expiresAt (DoD)", async () => {
    const updated = {
      id: 7,
      email: "family@example.com",
      expiresAt: "2030-12-31T00:00:00Z",
      status: "pending" as const,
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(200, updated));

    await expect(resendInvite({ id: 7 })).resolves.toEqual(updated);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("/family/invitations/7/resend");
    expect((init as RequestInit)?.method).toBe("POST");
  });

  it("rejects on 500", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(500, { message: "boom" }, "Server Error"),
    );
    await expect(resendInvite({ id: 1 })).rejects.toMatchObject({
      status: 500,
    });
  });
});
