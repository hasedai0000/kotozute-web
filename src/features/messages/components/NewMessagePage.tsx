"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { useIsOwner } from "@/features/auth/hooks/useIsOwner";

import { MessageForm } from "./MessageForm";

export function NewMessagePage() {
  const router = useRouter();
  const { isLoading } = useAuth();
  const isOwner = useIsOwner();

  useEffect(() => {
    if (!isLoading && !isOwner) {
      router.replace("/messages");
    }
  }, [isLoading, isOwner, router]);

  if (isLoading || !isOwner) {
    return null;
  }

  return <MessageForm mode="create" />;
}
