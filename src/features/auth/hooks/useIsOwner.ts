"use client";

import { useAuth } from "./useAuth";

export function useIsOwner(): boolean {
  const { user } = useAuth();
  return user?.role !== "family";
}
