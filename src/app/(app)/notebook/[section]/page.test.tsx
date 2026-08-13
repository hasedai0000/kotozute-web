import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import NotebookSectionPage from "./page";

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

const renderSection = async (section: string) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const jsx = await NotebookSectionPage({
    params: Promise.resolve({ section }),
  });
  return render(jsx, { wrapper });
};

describe("NotebookSectionPage", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => jsonResponse(200, emptySummary));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("basic: 見出し・説明文・パンくず末尾が『基本のこと』で描画され、機微注意は出ない", async () => {
    await renderSection("basic");

    expect(
      screen.getByRole("heading", { level: 1, name: "基本のこと" }),
    ).toBeInTheDocument();
    const current = screen.getByText("基本のこと", {
      selector: "[aria-current='page']",
    });
    expect(current).toBeInTheDocument();
    expect(
      screen.getByText(/氏名・生年月日・血液型・緊急連絡先/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("money: 機微情報の注意が描画される", async () => {
    await renderSection("money");
    expect(
      screen.getByRole("heading", { level: 1, name: "お金のこと" }),
    ).toBeInTheDocument();
    const note = screen.getByRole("note");
    expect(note).toHaveTextContent(/暗証番号/);
  });

  it("digital: 機微情報の注意が描画される", async () => {
    await renderSection("digital");
    expect(screen.getByRole("note")).toHaveTextContent(/パスワード/);
  });

  it("other: 機微情報の注意は描画されない", async () => {
    await renderSection("other");
    expect(
      screen.getByRole("heading", { level: 1, name: "その他" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("無効な slug は notFound() を呼ぶ (throws NEXT_HTTP_ERROR_FALLBACK;404)", async () => {
    await expect(
      NotebookSectionPage({ params: Promise.resolve({ section: "invalid" }) }),
    ).rejects.toThrow();
  });
});
