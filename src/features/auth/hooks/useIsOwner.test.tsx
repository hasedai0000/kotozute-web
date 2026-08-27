import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import type { AuthUser } from "@/features/auth/api/useMe";
import { AuthContext, type AuthContextValue } from "@/providers/AuthProvider";

import { useIsOwner } from "./useIsOwner";

const wrapWith = (user: AuthUser | null) => {
  const ctx: AuthContextValue = {
    user,
    isLoading: false,
    refetch: async () => undefined,
  };
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthContext.Provider value={ctx}>{children}</AuthContext.Provider>
    );
  };
};

describe("useIsOwner", () => {
  it("returns true when role is 'owner'", () => {
    const { result } = renderHook(() => useIsOwner(), {
      wrapper: wrapWith({
        id: 1,
        name: "Taro",
        email: "a@b.c",
        role: "owner",
      }),
    });
    expect(result.current).toBe(true);
  });

  it("returns true when role is undefined (defaults to owner)", () => {
    const { result } = renderHook(() => useIsOwner(), {
      wrapper: wrapWith({ id: 1, name: "Taro", email: "a@b.c" }),
    });
    expect(result.current).toBe(true);
  });

  it("returns true when user is null", () => {
    const { result } = renderHook(() => useIsOwner(), {
      wrapper: wrapWith(null),
    });
    expect(result.current).toBe(true);
  });

  it("returns false when role is 'family'", () => {
    const { result } = renderHook(() => useIsOwner(), {
      wrapper: wrapWith({
        id: 2,
        name: "Hanako",
        email: "h@b.c",
        role: "family",
      }),
    });
    expect(result.current).toBe(false);
  });
});
