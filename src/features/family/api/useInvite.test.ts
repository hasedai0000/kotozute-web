import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";

import { inviteFamily } from "./useInvite";

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

describe("inviteFamily", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POST /family/invitations with email JSON body", async () => {
    const created = {
      id: 42,
      email: "new@example.com",
      expiresAt: "2030-01-01T00:00:00Z",
      status: "pending" as const,
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(201, created));

    await expect(inviteFamily({ email: "new@example.com" })).resolves.toEqual(
      created,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("/family/invitations");
    expect((init as RequestInit)?.method).toBe("POST");
    expect((init as RequestInit)?.body).toBe(
      JSON.stringify({ email: "new@example.com" }),
    );
  });

  it("rejects with ApiError on 422 including field errors", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        422,
        {
          message: "The given data was invalid.",
          errors: { email: ["この招待は既に送信されています"] },
        },
        "Unprocessable Entity",
      ),
    );

    await expect(inviteFamily({ email: "x@y.z" })).rejects.toSatisfy(
      (err) =>
        ApiError.isApiError(err) &&
        err.status === 422 &&
        err.fields?.email?.[0] === "この招待は既に送信されています",
    );
  });

  it("rejects with ApiError on 500", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(500, { message: "boom" }, "Server Error"),
    );

    await expect(inviteFamily({ email: "x@y.z" })).rejects.toMatchObject({
      status: 500,
    });
  });
});
