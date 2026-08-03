"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, MenuIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { cn } from "@/lib/utils";

import { Container } from "./Container";

type NavItem = { href: string; label: string };

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "ホーム" },
  { href: "/notebook", label: "ノート" },
  { href: "/family", label: "家族" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initialsOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return Array.from(trimmed)[0] ?? "?";
}

function DesktopNav({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="主要ナビゲーション"
      className="ml-6 hidden items-center gap-1 md:flex"
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              "hover:bg-muted hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="メニューを開く"
            className="md:hidden"
          />
        }
      >
        <MenuIcon />
      </SheetTrigger>
      <SheetContent side="left" className="w-64">
        <SheetHeader>
          <SheetTitle>メニュー</SheetTitle>
        </SheetHeader>
        <nav aria-label="モバイルナビゲーション" className="mt-4 px-2">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <SheetClose
                key={item.href}
                render={
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-md px-3 py-2 text-base font-medium transition-colors",
                      "hover:bg-muted hover:text-foreground",
                      active
                        ? "text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                }
              />
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function UserMenu() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <Skeleton className="size-8 rounded-full" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <Button
        variant="outline"
        size="sm"
        render={<Link href="/login">ログイン</Link>}
      />
    );
  }

  const initials = initialsOf(user.name);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="ユーザーメニュー"
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <Avatar>
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">
              {user.name}
            </span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/settings">設定</Link>} />
        <DropdownMenuItem
          render={<Link href="/preview">プレビュー</Link>}
        />
        <DropdownMenuSeparator />
        {/* TODO(#15 W2-03): useLogout に差し替える */}
        <DropdownMenuItem
          onClick={() => {
            console.warn("ログアウト機能は W2-03 (#15) で実装予定です");
          }}
        >
          <LogOut />
          ログアウト
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <Container>
        <div className="flex h-14 items-center gap-2">
          <MobileNav pathname={pathname} />
          <Link
            href="/dashboard"
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            ことづて
          </Link>
          <DesktopNav pathname={pathname} />
          <div className="ml-auto flex items-center gap-2">
            <UserMenu />
          </div>
        </div>
      </Container>
    </header>
  );
}
