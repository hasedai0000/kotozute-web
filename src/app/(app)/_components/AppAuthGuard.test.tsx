import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthUser } from "@/features/auth/api/useMe";
import { AuthContext, type AuthContextValue } from "@/providers/AuthProvider";

import { AppAuthGuard } from "./AppAuthGuard";

const replaceMock = vi.fn();
const pathnameMock = vi.fn<() => string>(() => "/dashboard");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  usePathname: () => pathnameMock(),
}));

const renderWith = (
  value: Partial<AuthContextValue>,
  children: ReactNode = <div data-testid="protected">protected content</div>,
) => {
  const ctx: AuthContextValue = {
    user: null,
    isLoading: false,
    refetch: async () => undefined,
    ...value,
  };
  return render(
    <AuthContext.Provider value={ctx}>
      <AppAuthGuard>{children}</AppAuthGuard>
    </AuthContext.Provider>,
  );
};

describe("AppAuthGuard", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    pathnameMock.mockReset();
    pathnameMock.mockReturnValue("/dashboard");
  });

  it("user=null のとき /login?redirect=<pathname> に replace する", async () => {
    renderWith({ user: null, isLoading: false });

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith(
        `/login?redirect=${encodeURIComponent("/dashboard")}`,
      );
    });
    expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
  });

  it("pathname を encode してから ?redirect= に載せる", async () => {
    pathnameMock.mockReturnValue("/notebook/basic");
    renderWith({ user: null, isLoading: false });

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith(
        `/login?redirect=${encodeURIComponent("/notebook/basic")}`,
      );
    });
  });

  it("isLoading=true のとき redirect も children 描画も抑制する", () => {
    renderWith({ user: null, isLoading: true });

    expect(replaceMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
  });

  it("user があるときは children を描画する", () => {
    const user: AuthUser = { id: 1, name: "Taro", email: "taro@example.com" };
    renderWith({ user, isLoading: false });

    expect(replaceMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("protected")).toBeInTheDocument();
  });
});
