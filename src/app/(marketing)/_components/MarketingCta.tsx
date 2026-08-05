"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { cn } from "@/lib/utils";

type MarketingCtaProps = {
  variant?: "hero" | "compact";
  className?: string;
};

export function MarketingCta({
  variant = "hero",
  className,
}: MarketingCtaProps) {
  const { user, isLoading } = useAuth();

  const layout =
    variant === "hero"
      ? "flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center"
      : "flex items-center gap-2";
  const size = variant === "hero" ? "lg" : "sm";
  const primaryClass = variant === "hero" ? "w-full sm:w-auto" : undefined;
  const secondaryClass = variant === "hero" ? "w-full sm:w-auto" : undefined;

  if (isLoading) {
    return (
      <div className={cn(layout, className)} aria-hidden="true">
        <Skeleton
          className={variant === "hero" ? "h-11 w-40" : "h-9 w-24"}
        />
        <Skeleton
          className={variant === "hero" ? "h-11 w-32" : "h-9 w-20"}
        />
      </div>
    );
  }

  if (user) {
    return (
      <div className={cn(layout, className)}>
        <Button
          size={size}
          className={primaryClass}
          render={<Link href="/dashboard">ダッシュボードへ</Link>}
        />
      </div>
    );
  }

  return (
    <div className={cn(layout, className)}>
      <Button
        size={size}
        className={primaryClass}
        render={<Link href="/register">無料で始める</Link>}
      />
      <Button
        variant="outline"
        size={size}
        className={secondaryClass}
        render={<Link href="/login">ログイン</Link>}
      />
    </div>
  );
}
