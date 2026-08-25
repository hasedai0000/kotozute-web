import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthUser } from "@/features/auth/api/useMe";
import { AuthContext, type AuthContextValue } from "@/providers/AuthProvider";

import { FamilyContent } from "./FamilyContent";

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const renderContent = (user: AuthUser | null) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const ctx: AuthContextValue = {
    user,
    isLoading: false,
    refetch: async () => undefined,
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={ctx}>{children}</AuthContext.Provider>
    </QueryClientProvider>
  );
  return render(<FamilyContent />, { wrapper });
};

const owner: AuthUser = { id: 1, name: "Taro", email: "a@b.c" };
const familyUser: AuthUser = {
  id: 2,
  name: "Hanako",
  email: "h@b.c",
  role: "family",
};

describe("FamilyContent", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("見出しと説明文を描画する", async () => {
    fetchMock.mockImplementation(async () => jsonResponse(200, []));
    renderContent(owner);
    expect(screen.getByRole("heading", { name: "家族・共有管理" })).toBeInTheDocument();
    expect(
      screen.getByText("ノートを共有する家族を招待します。"),
    ).toBeInTheDocument();
  });

  it("owner ロールでは『家族を招待』ボタンが描画される", async () => {
    fetchMock.mockImplementation(async () => jsonResponse(200, []));
    renderContent(owner);
    expect(
      screen.getByRole("button", { name: /家族を招待/ }),
    ).toBeInTheDocument();
  });

  it("family ロールでは『家族を招待』ボタンが描画されない", async () => {
    fetchMock.mockImplementation(async () => jsonResponse(200, []));
    renderContent(familyUser);
    expect(
      screen.queryByRole("button", { name: /家族を招待/ }),
    ).not.toBeInTheDocument();
  });

  it("メンバー一覧を描画し、owner 行には『権限を解除』ボタンが出ない（DoD）", async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.includes("/family/members")) {
        return jsonResponse(200, [
          {
            id: 1,
            name: "山田太郎",
            email: "taro@example.com",
            role: "owner",
            joinedAt: "2026-01-15T00:00:00Z",
          },
          {
            id: 2,
            name: "山田花子",
            email: "hanako@example.com",
            role: "family",
            joinedAt: "2026-02-10T00:00:00Z",
          },
        ]);
      }
      if (url.includes("/family/invitations")) return jsonResponse(200, []);
      return jsonResponse(404, { message: "Not Found" });
    });

    renderContent(owner);

    await waitFor(() => {
      expect(screen.getByText("山田太郎")).toBeInTheDocument();
    });
    expect(screen.getByText("山田花子")).toBeInTheDocument();

    // owner に対しては解除ボタンが 1 つも無い。family (山田花子) 行の 1 つだけ描画される。
    const revokeButtons = screen.getAllByRole("button", { name: /権限を解除/ });
    expect(revokeButtons).toHaveLength(1);
  });

  it("招待中一覧に『期限切れ』Badge が付く（DoD）", async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.includes("/family/members")) return jsonResponse(200, []);
      if (url.includes("/family/invitations")) {
        return jsonResponse(200, [
          {
            id: 1,
            email: "expired@example.com",
            expiresAt: "2000-01-01T00:00:00Z",
            status: "expired",
          },
          {
            id: 2,
            email: "still@example.com",
            expiresAt: "2999-01-01T00:00:00Z",
            status: "pending",
          },
        ]);
      }
      return jsonResponse(404, { message: "Not Found" });
    });

    renderContent(owner);

    await waitFor(() => {
      expect(screen.getByText("expired@example.com")).toBeInTheDocument();
    });
    expect(screen.getByText("期限切れ")).toBeInTheDocument();
    expect(screen.getByText(/有効期限:/)).toBeInTheDocument();
  });

  it("招待中が 0 件のとき EmptyState を表示する", async () => {
    fetchMock.mockImplementation(async () => jsonResponse(200, []));
    renderContent(owner);
    await waitFor(() => {
      expect(
        screen.getByText("まだ招待中の家族はいません"),
      ).toBeInTheDocument();
    });
  });
});
