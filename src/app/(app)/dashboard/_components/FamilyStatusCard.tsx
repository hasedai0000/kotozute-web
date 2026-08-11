"use client";

import Link from "next/link";
import { UserPlus, Users } from "lucide-react";

import { EmptyState } from "@/components/layout/EmptyState";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFamilyMembers } from "@/features/family/api/useFamilyMembers";

const MAX_AVATARS = 5;

function initialOf(name: string): string {
  const trimmed = name.trim();
  return Array.from(trimmed)[0] ?? "?";
}

export function FamilyStatusCard() {
  const { data, isPending, isError, refetch } = useFamilyMembers();

  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <EmptyState
        title="家族情報を読み込めませんでした"
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

  const members = data ?? [];

  if (members.length === 0) {
    return (
      <EmptyState
        icon={<UserPlus className="size-6" aria-hidden="true" />}
        title="家族を招待しませんか"
        description="常時共有が始まって、はじめて「ことづて」の価値がご家族に届きます。"
        action={
          <Button
            render={
              <Link href="/family">
                <UserPlus />
                家族を招待する
              </Link>
            }
          />
        }
        className="border-primary/40 bg-primary/5"
      />
    );
  }

  const visible = members.slice(0, MAX_AVATARS);
  const remaining = members.length - visible.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" aria-hidden="true" />
          家族の共有状況（{members.length} 人）
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <AvatarGroup aria-label="共有中のメンバー">
          {visible.map((m) => (
            <Avatar key={m.id}>
              <AvatarFallback>{initialOf(m.name)}</AvatarFallback>
            </Avatar>
          ))}
          {remaining > 0 ? (
            <AvatarGroupCount aria-label={`他 ${remaining} 人`}>
              +{remaining}
            </AvatarGroupCount>
          ) : null}
        </AvatarGroup>
        <Button
          variant="outline"
          size="sm"
          render={<Link href="/family">家族を管理</Link>}
        />
      </CardContent>
    </Card>
  );
}
