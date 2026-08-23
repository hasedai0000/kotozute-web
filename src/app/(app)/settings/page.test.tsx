import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthRole, AuthUser } from "@/features/auth/api/useMe";
import { queryKeys } from "@/lib/query/queryKeys";
import { AuthContext, type AuthContextValue } from "@/providers/AuthProvider";

import SettingsPage from "./page";

import type { NotePreferences } from "@/features/settings/schema/notePreferences";

const renderPage = (role?: AuthRole) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const user: AuthUser = {
    id: 1,
    name: "Taro",
    email: "taro@example.com",
    ...(role ? { role } : {}),
  };
  client.setQueryData(["auth", "me"], user);
  client.setQueryData<NotePreferences>(queryKeys.settings.notePreferences, {
    defaultTiming: "always",
    gracePeriodDays: 7,
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
  return render(<SettingsPage />, { wrapper });
};

describe("SettingsPage", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("owner ロールでは公開タイミング既定と待機期間のセクションが表示される", () => {
    renderPage("owner");

    expect(screen.getByText("公開タイミングの既定")).toBeInTheDocument();
    expect(screen.getByText("待機期間")).toBeInTheDocument();
  });

  it("role 未指定（owner 扱い）でも両セクションが表示される", () => {
    renderPage();

    expect(screen.getByText("公開タイミングの既定")).toBeInTheDocument();
    expect(screen.getByText("待機期間")).toBeInTheDocument();
  });

  it("family ロールでは公開タイミング既定と待機期間のセクションが表示されない", () => {
    renderPage("family");

    expect(screen.queryByText("公開タイミングの既定")).not.toBeInTheDocument();
    expect(screen.queryByText("待機期間")).not.toBeInTheDocument();
  });

  it("プロフィール／パスワード変更はどのロールでも表示される", () => {
    renderPage("family");

    expect(screen.getByText("プロフィール")).toBeInTheDocument();
    expect(screen.getByText("パスワード変更")).toBeInTheDocument();
  });
});
