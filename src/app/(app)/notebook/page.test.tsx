import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthUser } from "@/features/auth/api/useMe";
import { AuthContext, type AuthContextValue } from "@/providers/AuthProvider";

import NotebookIndexPage from "./page";

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const emptySummary = {
  perSection: {
    basic: { filledFields: 0, entryCountByCategory: {} },
    medical: { filledFields: 0, entryCountByCategory: {} },
    money: { filledFields: 0, entryCountByCategory: {} },
    digital: { filledFields: 0, entryCountByCategory: {} },
    funeral: { filledFields: 0, entryCountByCategory: {} },
    pet: { filledFields: 0, entryCountByCategory: {} },
    other: { filledFields: 0, entryCountByCategory: {} },
  },
  messagesCount: 0,
};

const renderPage = (user: AuthUser | null) => {
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
  return render(<NotebookIndexPage />, { wrapper });
};

describe("NotebookIndexPage", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("見出し「マイノート」が描画される", async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.includes("/family/members")) return jsonResponse(200, []);
      return jsonResponse(200, emptySummary);
    });

    renderPage({ id: 1, name: "Taro", email: "a@b.c" });

    expect(
      screen.getByRole("heading", { level: 1, name: "マイノート" }),
    ).toBeInTheDocument();
  });

  it("成功時に 7 セクション + 大切な人へ の 8 リンクが並び、money カードは /notebook/money へリンクする", async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.includes("/family/members")) return jsonResponse(200, []);
      return jsonResponse(200, emptySummary);
    });

    renderPage({ id: 1, name: "Taro", email: "a@b.c" });

    await waitFor(() => {
      expect(screen.getByText("お金のこと")).toBeInTheDocument();
    });
    expect(screen.getByText("大切な人へ")).toBeInTheDocument();
    const moneyLink = screen.getByRole("link", { name: /お金のこと を開く/ });
    expect(moneyLink).toHaveAttribute("href", "/notebook/money");
  });

  it("note-summary がエラーのとき EmptyState と再試行ボタンが描画される", async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.includes("/family/members")) return jsonResponse(200, []);
      return jsonResponse(500, { message: "Internal Server Error" });
    });

    renderPage({ id: 1, name: "Taro", email: "a@b.c" });

    await waitFor(() => {
      expect(
        screen.getByText("ノート情報を読み込めませんでした"),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "再試行" })).toBeInTheDocument();
  });
});
