import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthUser } from "@/features/auth/api/useMe";
import { AuthContext, type AuthContextValue } from "@/providers/AuthProvider";

import DashboardPage from "./page";

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
  return render(<DashboardPage />, { wrapper });
};

describe("DashboardPage", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("未招待時（members=[]）に「家族を招待しませんか」CTA が描画される", async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.includes("/note-summary")) {
        return jsonResponse(200, emptySummary);
      }
      if (url.includes("/family/members")) {
        return jsonResponse(200, []);
      }
      return jsonResponse(404, { message: "Not Found" });
    });

    renderPage({ id: 1, name: "Taro", email: "a@b.c" });

    await waitFor(() => {
      expect(screen.getByText("家族を招待しませんか")).toBeInTheDocument();
    });
  });

  it("owner ロール（既定）では「次にやること」が描画される", async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.includes("/family/members")) return jsonResponse(200, []);
      return jsonResponse(200, emptySummary);
    });

    renderPage({ id: 1, name: "Taro", email: "a@b.c" });

    await waitFor(() => {
      expect(screen.getByText("次にやること")).toBeInTheDocument();
    });
  });

  it("家族ロール（role='family'）では「次にやること」が描画されない", async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.includes("/family/members")) return jsonResponse(200, []);
      return jsonResponse(200, emptySummary);
    });

    renderPage({ id: 2, name: "Hanako", email: "h@b.c", role: "family" });

    await waitFor(() => {
      expect(screen.getByText("Hanako さん、こんにちは")).toBeInTheDocument();
    });
    expect(screen.queryByText("次にやること")).not.toBeInTheDocument();
  });
});
