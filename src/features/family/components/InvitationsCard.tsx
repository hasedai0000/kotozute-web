"use client";

import { EmptyState } from "@/components/layout/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvitations } from "@/features/family/api/useInvitations";

import { InvitationRow } from "./InvitationRow";

type InvitationsCardProps = {
  canManage: boolean;
};

export function InvitationsCard({ canManage }: InvitationsCardProps) {
  const { data, isPending, isError, refetch } = useInvitations();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          招待中
          {data ? (
            <span className="ml-1 text-xs text-muted-foreground">
              （{data.length} 件）
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="flex flex-col gap-2" aria-busy="true">
            <Skeleton className="h-14 w-full" />
          </div>
        ) : isError ? (
          <EmptyState
            title="招待中の情報を読み込めませんでした"
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
        ) : data && data.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {data.map((inv) => (
              <InvitationRow key={inv.id} invitation={inv} canManage={canManage} />
            ))}
          </ul>
        ) : (
          <EmptyState
            title="まだ招待中の家族はいません"
            description="上部の「家族を招待」から招待メールを送れます。"
          />
        )}
      </CardContent>
    </Card>
  );
}
