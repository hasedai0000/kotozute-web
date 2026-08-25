import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { revokeInvite } from "./useRevokeInvite";

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

describe("revokeInvite", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("DELETE /family/invitations/{id} resolves on 204", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(204));

    await expect(revokeInvite({ id: 3 })).resolves.toBeUndefined();

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("/family/invitations/3");
    expect((init as RequestInit)?.method).toBe("DELETE");
  });

  it("rejects on 500", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(500, { message: "boom" }, "Server Error"),
    );
    await expect(revokeInvite({ id: 3 })).rejects.toMatchObject({
      status: 500,
    });
  });
});
