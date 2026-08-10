"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/features/auth/hooks/useAuth";

// middleware は session cookie の有無で粗く弾く一次防衛。
// AppAuthGuard は `useMe` が 401 → null を返した場合の二次防衛で、
// 現在 pathname を `?redirect=` に載せて `/login` に replace する。
// `(app)` 配下でのみ使うこと（`(auth)` に置くと /login で無限ループする）。
export function AppAuthGuard({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (user !== null) return;
    const redirect = encodeURIComponent(pathname ?? "/dashboard");
    router.replace(`/login?redirect=${redirect}`);
  }, [user, isLoading, pathname, router]);

  if (isLoading || user === null) return null;
  return <>{children}</>;
}
