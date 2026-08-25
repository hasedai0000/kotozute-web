import { useQuery } from "@tanstack/react-query";

import { ApiError, apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/queryKeys";

// TODO(#31+): OpenAPI に /family/invitations が定義され次第、src/types/generated から型を差し替える。
export type InvitationStatus = "pending" | "expired";
export type Invitation = {
  id: number | string;
  email: string;
  expiresAt: string;
  status?: InvitationStatus;
};

export async function fetchInvitations(): Promise<Invitation[]> {
  try {
    return await apiFetch<Invitation[]>("/family/invitations");
  } catch (err) {
    if (ApiError.isApiError(err) && err.status === 404) {
      return [];
    }
    throw err;
  }
}

export function useInvitations() {
  return useQuery({
    queryKey: queryKeys.family.invitations,
    queryFn: fetchInvitations,
    retry: false,
    staleTime: 30_000,
  });
}

export function isExpired(invitation: Invitation, now: Date = new Date()): boolean {
  if (invitation.status) {
    return invitation.status === "expired";
  }
  const t = Date.parse(invitation.expiresAt);
  return Number.isFinite(t) && t < now.getTime();
}
