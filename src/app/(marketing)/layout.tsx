import type { ReactNode } from "react";
import Link from "next/link";

import { Container } from "@/components/layout/Container";

import { MarketingCta } from "./_components/MarketingCta";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <Container>
          <div className="flex h-14 items-center gap-2">
            <Link
              href="/"
              className="text-lg font-semibold tracking-tight text-foreground"
              aria-label="ことづて トップ"
            >
              ことづて
            </Link>
            <div className="ml-auto">
              <MarketingCta variant="compact" />
            </div>
          </div>
        </Container>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-muted/40">
        <Container>
          <div className="flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-base font-semibold text-foreground">
                ことづて
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                いまを生きるための、終活ノート。
              </p>
            </div>
            <nav aria-label="フッターナビゲーション">
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground sm:items-end">
                <li>
                  <span aria-disabled="true" className="cursor-not-allowed">
                    プライバシーポリシー（準備中）
                  </span>
                </li>
                <li>
                  <span aria-disabled="true" className="cursor-not-allowed">
                    利用規約（準備中）
                  </span>
                </li>
                <li>
                  <span aria-disabled="true" className="cursor-not-allowed">
                    お問い合わせ（準備中）
                  </span>
                </li>
              </ul>
            </nav>
          </div>
          <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} ことづて
          </div>
        </Container>
      </footer>
    </div>
  );
}
