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
import { useFamilyMembers } from "@/features/family/api/useFamilyMembers";

import { MemberRow } from "./MemberRow";

type MembersCardProps = {
  canManage: boolean;
};

export function MembersCard({ canManage }: MembersCardProps) {
  const { data, isPending, isError, refetch } = useFamilyMembers();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          メンバー
          {data ? (
            <span className="ml-1 text-xs text-muted-foreground">
              （{data.length} 人）
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="flex flex-col gap-2" aria-busy="true">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : isError ? (
          <EmptyState
            title="メンバー情報を読み込めませんでした"
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
            {data.map((m) => (
              <MemberRow key={m.id} member={m} canManage={canManage} />
            ))}
          </ul>
        ) : (
          <EmptyState
            title="まだメンバーがいません"
            description="家族を招待すると、常時共有が始まります。"
          />
        )}
      </CardContent>
    </Card>
  );
}
