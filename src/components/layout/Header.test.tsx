import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthUser } from "@/features/auth/api/useMe";
import { AuthContext, type AuthContextValue } from "@/providers/AuthProvider";

import { Header } from "./Header";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/dashboard",
}));

const toastErrorMock = vi.fn();
vi.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => toastErrorMock(...args) },
}));

type PassthroughProps = {
  children?: ReactNode;
  render?: ReactNode;
  [key: string]: unknown;
};

// DropdownMenu (base-ui portal) はテスト環境で描画に手間がかかるため、
// 中身を常に描画するシンプルな要素に差し替える。
// これによりログアウトのクリックハンドラだけを純粋に検証できる。
vi.mock("@/components/ui/dropdown-menu", () => {
  const buildPassthrough = (displayName: string, tag: "div" | "button") => {
    const C = ({ children, render: renderProp, ...props }: PassthroughProps) => {
      if (renderProp) return <>{renderProp}</>;
      const Tag = tag;
      return <Tag {...props}>{children}</Tag>;
    };
    C.displayName = displayName;
    return C;
  };
  return {
    DropdownMenu: buildPassthrough("DropdownMenu", "div"),
    DropdownMenuTrigger: buildPassthrough("DropdownMenuTrigger", "button"),
    DropdownMenuContent: buildPassthrough("DropdownMenuContent", "div"),
    DropdownMenuGroup: buildPassthrough("DropdownMenuGroup", "div"),
    DropdownMenuItem: buildPassthrough("DropdownMenuItem", "button"),
    DropdownMenuLabel: buildPassthrough("DropdownMenuLabel", "div"),
    DropdownMenuSeparator: buildPassthrough("DropdownMenuSeparator", "div"),
  };
});

// Sheet も同様に children をそのまま描画する。
vi.mock("@/components/ui/sheet", () => {
  const buildPassthrough = (displayName: string) => {
    const C = ({ children, render: renderProp }: PassthroughProps) =>
      renderProp ? <>{renderProp}</> : <>{children}</>;
    C.displayName = displayName;
    return C;
  };
  return {
    Sheet: buildPassthrough("Sheet"),
    SheetTrigger: buildPassthrough("SheetTrigger"),
    SheetContent: buildPassthrough("SheetContent"),
    SheetHeader: buildPassthrough("SheetHeader"),
    SheetTitle: buildPassthrough("SheetTitle"),
    SheetClose: buildPassthrough("SheetClose"),
  };
});

const jsonResponse = (status: number, body: unknown = null): Response =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: body === null ? undefined : { "Content-Type": "application/json" },
  });

const renderWithAuth = (user: AuthUser | null) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const value: AuthContextValue = {
    user,
    isLoading: false,
    refetch: async () => undefined,
  };
  return render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={value}>
        <Header />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
};

describe("Header logout", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    pushMock.mockReset();
    toastErrorMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("ログアウト成功時に / へ遷移する", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(204)) // csrf
      .mockResolvedValueOnce(jsonResponse(204)); // logout

    renderWithAuth({ id: 1, name: "山田 太郎", email: "taro@example.com" });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));
    });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it("ログアウト失敗時に toast.error が呼ばれ / には遷移しない", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(204)) // csrf ok
      .mockResolvedValueOnce(jsonResponse(500, { message: "server error" }));

    renderWithAuth({ id: 1, name: "山田 太郎", email: "taro@example.com" });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));
    });

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith("ログアウトに失敗しました");
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("未ログインの場合は「ログイン」導線が出る", () => {
    renderWithAuth(null);
    expect(screen.getByRole("link", { name: "ログイン" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "ログアウト" }),
    ).not.toBeInTheDocument();
  });
});
