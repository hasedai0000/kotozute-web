"use client";

import { createContext, useMemo, type ReactNode } from "react";

import { useMe, type AuthUser } from "@/features/auth/api/useMe";

export type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isPending, refetch } = useMe();

  const value = useMemo<AuthContextValue>(
    () => ({
      user: data ?? null,
      isLoading: isPending,
      refetch: async () => {
        await refetch();
      },
    }),
    [data, isPending, refetch],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
