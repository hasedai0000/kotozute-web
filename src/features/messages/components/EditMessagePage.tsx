"use client";

import { notFound } from "next/navigation";

import { EmptyState } from "@/components/layout/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";

import { useMessage } from "../api/useMessage";

import { MessageForm } from "./MessageForm";

type EditMessagePageProps = {
  id: string;
};

export function EditMessagePage({ id }: EditMessagePageProps) {
  const { data, isPending, isError, error, refetch } = useMessage(id);

  if (isPending) {
    return (
      <section className="mx-auto flex w-full max-w-prose flex-col gap-6">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </section>
    );
  }

  if (isError) {
    if (ApiError.isApiError(error) && error.status === 404) {
      notFound();
    }
    return (
      <EmptyState
        title="読み込めませんでした"
        description="通信を確認してから、もう一度お試しください。"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void refetch();
            }}
          >
            再試行
          </Button>
        }
      />
    );
  }

  return <MessageForm mode="edit" initial={data.message} />;
}
