import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthUser } from "@/features/auth/api/useMe";
import { AuthContext, type AuthContextValue } from "@/providers/AuthProvider";

import { MessagesList } from "./MessagesList";

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const ownerUser: AuthUser = {
  id: 1,
  name: "Taro",
  email: "a@b.c",
  role: "owner",
};

const familyUser: AuthUser = {
  id: 2,
  name: "Hanako",
  email: "h@b.c",
  role: "family",
};

const renderList = (user: AuthUser | null = ownerUser) => {
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
  return render(<MessagesList />, { wrapper });
};

describe("MessagesList", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("空配列のとき EmptyState と『手紙を書く』CTA を描画する", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { messages: [] }));

    renderList();

    await waitFor(() => {
      expect(screen.getByText("まだ手紙がありません")).toBeInTheDocument();
    });
    // CTA が /messages/new への Link として存在する（ヘッダ + EmptyState の 2 箇所）
    const ctas = screen.getAllByRole("link", { name: /手紙を書く/ });
    expect(ctas.length).toBeGreaterThanOrEqual(1);
    for (const cta of ctas) {
      expect(cta).toHaveAttribute("href", "/messages/new");
    }
  });

  it("404 のとき EmptyState にフォールバックする（バック未実装時）", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(404, { message: "Not Found" }),
    );

    renderList();

    await waitFor(() => {
      expect(screen.getByText("まだ手紙がありません")).toBeInTheDocument();
    });
  });

  it("複数のメッセージがある場合、宛先とバッジが描画される", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        messages: [
          { id: "m1", recipient: "妻へ", body: "ありがとう。", timing: "posthumous" },
          { id: "m2", recipient: "息子へ", body: "頼みます。", timing: "always" },
        ],
      }),
    );

    renderList();

    await waitFor(() => {
      expect(screen.getByText("妻へ")).toBeInTheDocument();
    });
    expect(screen.getByText("息子へ")).toBeInTheDocument();
    expect(screen.getByText("常時共有")).toBeInTheDocument();
    expect(screen.getByText("死後開示")).toBeInTheDocument();

    // カードごとに詳細画面への Link が張られている
    expect(screen.getByRole("link", { name: "妻へ を読む" })).toHaveAttribute(
      "href",
      "/messages/m1",
    );
    expect(
      screen.getByRole("link", { name: "息子へ を読む" }),
    ).toHaveAttribute("href", "/messages/m2");
  });

  it("family ロールでは『手紙を書く』CTA を描画しない", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        messages: [
          { id: "m1", recipient: "妻へ", body: "ありがとう。", timing: "always" },
        ],
      }),
    );

    renderList(familyUser);

    await waitFor(() => {
      expect(screen.getByText("妻へ")).toBeInTheDocument();
    });
    expect(screen.queryByRole("link", { name: /手紙を書く/ })).toBeNull();
  });

  it("family ロールで空のとき、CTA なしの EmptyState を描画する", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { messages: [] }));

    renderList(familyUser);

    await waitFor(() => {
      expect(
        screen.getByText("共有されている手紙はまだありません"),
      ).toBeInTheDocument();
    });
    expect(screen.queryByRole("link", { name: /手紙を書く/ })).toBeNull();
  });

  it("500 エラー時、EmptyState と再試行ボタンが描画される", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { message: "boom" }));

    renderList();

    await waitFor(() => {
      expect(screen.getByText("読み込めませんでした")).toBeInTheDocument();
    });
    const retry = screen.getByRole("button", { name: "再試行" });
    expect(retry).toBeInTheDocument();

    // 再試行を押すと再度 fetch が呼ばれる
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { messages: [] }));
    fireEvent.click(retry);
    await waitFor(() => {
      expect(screen.getByText("まだ手紙がありません")).toBeInTheDocument();
    });
  });
});
