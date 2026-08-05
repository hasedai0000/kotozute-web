import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, PenLine, ShieldCheck, Users } from "lucide-react";

import { Container } from "@/components/layout/Container";

import { MarketingCta } from "./_components/MarketingCta";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://kotozute.app";
const SITE_NAME = "ことづて";
const TAGLINE = "いまを生きるための、終活ノート";
const DESCRIPTION =
  "ことづては、家族と常時共有できるエンディングノート。項目に沿って迷わず書け、大切な人へ手紙も残せます。";

export const metadata: Metadata = {
  title: `${SITE_NAME} — ${TAGLINE}`,
  description: DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${TAGLINE}`,
    description: DESCRIPTION,
    locale: "ja_JP",
  },
  twitter: {
    card: "summary",
    title: `${SITE_NAME} — ${TAGLINE}`,
    description: DESCRIPTION,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
      inLanguage: "ja-JP",
      description: DESCRIPTION,
    },
  ],
};

const VALUES = [
  {
    icon: Users,
    title: "家族と常時共有",
    body: "招待した家族といまから共有。もしもの時、確実に届きます。",
  },
  {
    icon: PenLine,
    title: "項目に沿って迷わず書ける",
    body: "何をどこに残せばよいか、テンプレートが導きます。",
  },
  {
    icon: ShieldCheck,
    title: "大切な人へ手紙を残せる",
    body: "事務情報とは切り離した、言葉のための場所を用意しました。",
  },
];

const STEPS = [
  { n: 1, title: "書く", body: "ノートに沿って、少しずつ書きためます。" },
  {
    n: 2,
    title: "家族を招待する",
    body: "メールで招待。家族はいつでも閲覧できます。",
  },
  {
    n: 3,
    title: "いつでも見られる",
    body: "書き足しや編集も自由。家族には最新の内容が届きます。",
  },
];

export default function MarketingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="border-b border-border bg-background">
        <Container>
          <div className="mx-auto max-w-3xl py-16 text-center sm:py-24">
            <p className="text-sm font-medium text-primary">{SITE_NAME}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              {TAGLINE}
            </h1>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              家族と常時共有できるエンディングノート。書きためて、届けたい相手へ、いつでも。
            </p>
            <div className="mt-8">
              <MarketingCta variant="hero" />
            </div>
          </div>
        </Container>
      </section>

      {/* 課題提起 */}
      <section aria-labelledby="lp-problem" className="bg-muted/30">
        <Container>
          <div className="mx-auto max-w-3xl py-14 text-center sm:py-20">
            <h2
              id="lp-problem"
              className="text-2xl font-semibold text-foreground sm:text-3xl"
            >
              もしもの時、家族はどこに何があるか分かりますか
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              銀行口座、保険、契約中のサービス。日々の暮らしを支える情報は、
              意外と自分の頭の中にしかありません。
              あなたのことばで残しておくと、家族はきっと助かります。
            </p>
          </div>
        </Container>
      </section>

      {/* 価値 3 点 */}
      <section aria-labelledby="lp-values" className="bg-background">
        <Container>
          <div className="py-14 sm:py-20">
            <h2
              id="lp-values"
              className="text-center text-2xl font-semibold text-foreground sm:text-3xl"
            >
              ことづての価値
            </h2>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {VALUES.map((v) => {
                const Icon = v.icon;
                return (
                  <li
                    key={v.title}
                    className="rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm"
                  >
                    <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon aria-hidden="true" className="size-5" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">{v.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {v.body}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        </Container>
      </section>

      {/* 使い方 3 ステップ */}
      <section aria-labelledby="lp-steps" className="bg-muted/30">
        <Container>
          <div className="py-14 sm:py-20">
            <h2
              id="lp-steps"
              className="text-center text-2xl font-semibold text-foreground sm:text-3xl"
            >
              使い方は 3 ステップ
            </h2>
            <ol className="mt-10 grid gap-6 sm:grid-cols-3">
              {STEPS.map((s) => (
                <li
                  key={s.n}
                  className="rounded-2xl border border-border bg-card p-6 text-card-foreground"
                >
                  <div className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {s.n}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {s.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      {/* 安心の説明 */}
      <section aria-labelledby="lp-security" className="bg-background">
        <Container>
          <div className="mx-auto flex max-w-3xl flex-col items-start gap-4 py-14 sm:flex-row sm:py-20">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <KeyRound aria-hidden="true" className="size-6" />
            </div>
            <div>
              <h2
                id="lp-security"
                className="text-2xl font-semibold text-foreground sm:text-3xl"
              >
                暗証番号やパスワードは保存しません
              </h2>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                ことづては「在りか」だけを記録します。銀行口座は下 4
                桁まで、契約は連絡先まで。
                機微な番号やパスワードは入力しない設計になっています。
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* 注記 */}
      <section aria-labelledby="lp-notice" className="bg-muted/30">
        <Container>
          <div className="mx-auto max-w-3xl py-10 text-sm leading-relaxed text-muted-foreground">
            <h2 id="lp-notice" className="sr-only">
              ご利用にあたって
            </h2>
            <p>
              ことづては遺言書ではありません。相続や法的効力が必要な事項は、
              正式な遺言書の作成をご検討ください。
            </p>
          </div>
        </Container>
      </section>

      {/* 下部 CTA */}
      <section aria-labelledby="lp-cta" className="bg-background">
        <Container>
          <div className="mx-auto max-w-2xl py-16 text-center sm:py-20">
            <h2
              id="lp-cta"
              className="text-2xl font-semibold text-foreground sm:text-3xl"
            >
              まずは、書きはじめてみませんか
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              登録は無料。書けるところから、少しずつで大丈夫です。
            </p>
            <div className="mt-8">
              <MarketingCta variant="hero" />
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              すでにアカウントをお持ちの方は{" "}
              <Link
                href="/login"
                className="underline underline-offset-4 hover:text-foreground"
              >
                ログイン
              </Link>
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
