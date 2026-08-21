import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MessagesList } from "./MessagesList";

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const renderList = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
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
    // ヘッダ + EmptyState の 2 箇所
    expect(
      screen.getAllByRole("button", { name: /手紙を書く/ }).length,
    ).toBeGreaterThanOrEqual(1);
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
