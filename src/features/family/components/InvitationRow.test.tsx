import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Invitation } from "@/features/family/api/useInvitations";

import { InvitationRow } from "./InvitationRow";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const pending: Invitation = {
  id: 1,
  email: "invited@example.com",
  expiresAt: "2999-01-01T00:00:00Z",
  status: "pending",
};

const expired: Invitation = {
  id: 2,
  email: "old@example.com",
  expiresAt: "2000-01-01T00:00:00Z",
  status: "expired",
};

const jsonResponse = (
  status: number,
  body: unknown = null,
): Response =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: body === null ? undefined : { "Content-Type": "application/json" },
  });

const renderRow = (invitation: Invitation, canManage: boolean) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <ul>{children}</ul>
    </QueryClientProvider>
  );
  return render(
    <InvitationRow invitation={invitation} canManage={canManage} />,
    { wrapper },
  );
};

describe("InvitationRow", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("status='expired' で『期限切れ』Badge が付く（DoD）", () => {
    renderRow(expired, true);
    expect(screen.getByText("期限切れ")).toBeInTheDocument();
  });

  it("status='pending' で有効期限が表示される", () => {
    renderRow(pending, true);
    expect(screen.getByText(/有効期限:/)).toBeInTheDocument();
    expect(screen.queryByText("期限切れ")).not.toBeInTheDocument();
  });

  it("owner 閲覧時に『再送』『取り消し』ボタンが描画される", () => {
    renderRow(pending, true);
    expect(screen.getByRole("button", { name: "再送" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "取り消し" }),
    ).toBeInTheDocument();
  });

  it("family 閲覧時（canManage=false）は再送・取り消しが描画されない", () => {
    renderRow(pending, false);
    expect(
      screen.queryByRole("button", { name: "再送" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "取り消し" }),
    ).not.toBeInTheDocument();
  });

  it("『再送』クリックで POST /family/invitations/{id}/resend が飛ぶ", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        ...pending,
        expiresAt: "2999-12-31T00:00:00Z",
      }),
    );

    renderRow(pending, true);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "再送" }));
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("/family/invitations/1/resend");
    expect((init as RequestInit)?.method).toBe("POST");
  });

  it("『取り消し』クリックで DELETE /family/invitations/{id} が飛ぶ", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(204));

    renderRow(pending, true);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "取り消し" }));
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("/family/invitations/1");
    expect((init as RequestInit)?.method).toBe("DELETE");
  });
});
