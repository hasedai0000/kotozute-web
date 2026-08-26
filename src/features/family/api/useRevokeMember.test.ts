import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { revokeMember } from "./useRevokeMember";

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

describe("revokeMember", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("DELETE /family/members/{id} resolves on 204", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(204));

    await expect(revokeMember({ id: 7 })).resolves.toBeUndefined();

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("/family/members/7");
    expect((init as RequestInit)?.method).toBe("DELETE");
  });

  it("rejects on 500", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(500, { message: "boom" }, "Server Error"),
    );
    await expect(revokeMember({ id: 7 })).rejects.toMatchObject({
      status: 500,
    });
  });
});
