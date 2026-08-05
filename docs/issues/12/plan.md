# Issue #12 — W1-12 [F-02] LP 実装（ヒーロー〜フッター、SSG、metadata）

- URL: https://github.com/hasedai0000/kotozute-web/issues/12
- ラベル: frontend, week-1
- マイルストーン: MVP-Week1

## Issue 概要
公開 LP（`/`）を SSG で SEO 対象として実装する。ヒーロー／課題提起／価値 3 点／使い方 3 ステップ／安心の説明／注記／CTA／フッターの構成、`metadata` と JSON-LD、ログイン済みユーザーへの `/dashboard` 導線までを、静かで前向きなトーンで組み上げる。

## 調査結果

### 関連ドキュメント
- `docs/screen_spec.md` §4「LP `/`」— 全セクション構成、SSG、`metadata`、構造化データ、ログイン済みは `/dashboard` へ、死・不安を煽らないトーン、フッター（プライバシーポリシー・利用規約・問い合わせ）
- `docs/frontend_design.md` — LP は `(marketing)/page.tsx` で SSG、Tailwind + shadcn/ui、デザイントークンで意味色（グリーン＝常時共有）
- `CLAUDE.md` — ルール 5（直値カラー禁止、トークン使用）、a11y（文字サイズ・コントラスト・キーボード・prefers-reduced-motion）、パス設計原則、`src/app/` は薄く保つ

### 関連コード
- `src/app/(marketing)/page.tsx` — 現状: プレースホルダ（見出しと 1 行のみ）。**全面置き換え**。
- `src/app/layout.tsx` — 既に `metadata: { title, description }` あり。ページ側で `metadata` を再定義してタイトル/OGP を上書きする（ページ固有の SEO）。
- `src/features/auth/hooks/useAuth.ts` / `src/providers/AuthProvider.tsx` — `useAuth()` で `user | null` と `isLoading` を取得可能。**Client Component からのみ呼べる**ため、ログイン済み分岐は Client Boundary で扱う（page 本体は Server Component の SSG のままにする）。
- `src/components/layout/Container.tsx` — max-w-5xl のコンテナ。LP でも流用可能。
- `src/components/layout/Header.tsx` — 認証エリア用のヘッダー（`/dashboard`, `/notebook`, `/family` ナビ）。**LP は独自のパブリック向けヘッダーを持たせるほうが素直**（LP に「ホーム/ノート/家族」タブは不要）。
- `src/components/ui/button.tsx` — CTA ボタンに使用。
- `src/styles/globals.css` — `--primary` は既にブランドグリーン。追加トークンは不要。
- `src/app/(app)/layout.tsx` は認証必須ルートを包む。`(marketing)` グループは独立で、`layout.tsx` を持たないため `src/app/layout.tsx` に直乗せ。

### 依存関係
- **前提**: #9 W1-09（AuthProvider + useAuth）— **CLOSED 済み**。`useAuth()` が使える。
- 関連: #15 W2-03（AuthProvider にユーザー配布 + 未認証時 /login 戻し）。LP は逆に「ログイン済み → /dashboard」導線を出す側で、W2-03 が動く前提はない（`useMe` が 401 なら `user === null` として扱える現状で足りる）。
- 関連: #13 W2-01（`/login`）、#14 W2-02（`/register`）— LP から遷移するリンク先。`/login` `/register` のルート自体は既に存在（プレースホルダ）ため、リンク破綻はしない。

## やること
- [ ] `src/app/(marketing)/layout.tsx` を新規作成し、LP 用のパブリックヘッダーとフッターを配置（LP・注記・法務リンクを含む）
  - LP ロゴ（`/`）／右上に `ログイン`・`無料で始める` の CTA（ログイン状態は Client 側で切替）
  - フッターに「プライバシーポリシー・利用規約・お問い合わせ」（リンク先が未実装ならダミーの `#` かつ `aria-disabled`、または `/terms`・`/privacy`・`/contact` を後続実装として空パスにするかは要確認 → リスク欄）
- [ ] `src/app/(marketing)/page.tsx` を全面刷新し、以下 8 セクションを実装（Server Component、SSG）
  1. ヒーロー：ロゴ「ことづて」＋タグライン「いまを生きるための、終活ノート」＋`無料で始める`／`ログイン`
  2. 課題提起：「もしもの時、家族はどこに何があるか分かりますか」
  3. 価値 3 点：①家族と常時共有 ②項目に沿って迷わず書ける ③手紙を残せる
  4. 使い方 3 ステップ：書く → 家族を招待する → いつでも見られる
  5. 安心の説明：**暗証番号やパスワードは保存しない**（在りかだけを記録）
  6. 注記：本サービスは遺言書ではなく、法的効力が必要な事項は正式な遺言書が必要
  7. CTA（下部）：`無料で始める`／`ログイン`
  8. フッターは `layout.tsx` 側
- [ ] `src/app/(marketing)/page.tsx` に `export const metadata: Metadata`（title / description / OGP: openGraph・twitter・canonical）
- [ ] JSON-LD 構造化データ（`Organization` + `WebSite`）を `<script type="application/ld+json">` で埋め込み
- [ ] ログイン済みユーザー向け導線：Client Component `MarketingCta`（`"use client"`）を分離して `useAuth()` を呼び、`user` があれば `無料で始める` を `ダッシュボードへ` に差し替え、`ログイン` は非表示にする
  - ヒーロー・下部 CTA・ヘッダー右上の 3 箇所で使い回す
- [ ] a11y チェック：見出し階層（`h1` は 1 箇所）、コントラスト、キーボードフォーカスリング、`prefers-reduced-motion` は globals.css で既に無効化済みなので新規 animation を追加する場合のみ配慮
- [ ] 文言レビュー：死・不安を煽らない静かで前向きなトーン（画面設計書に沿う）
- [ ] `npm run typecheck` / `npm run lint` / `npm run build` が通ることを確認し、`(marketing)/page` が **Static (`○`)** で出力されることを確認

## 完了条件（DoD）
- [ ] Lighthouse SEO ≥ 95（ローカル or Preview で計測）
- [ ] モバイル / デスクトップで崩れない（`sm` `md` `lg` ブレイクポイントで確認）
- [ ] `npm run build` で `/` が **○ (Static)** と判定される
- [ ] `npm run typecheck` / `npm run lint` が緑

## リスク / 確認事項
- **フッターの法務リンク先（プライバシーポリシー・利用規約・お問い合わせ）が未整備**。実装時に以下いずれかを選択したい：
  - (A) リンクは置くが未実装ページには誘導しない（`#` + `aria-disabled` かコメントアウト）
  - (B) 空ページ `/terms`・`/privacy`・`/contact` を stub として作る
  - (C) 「準備中」テキストのみ表示
  → **推奨は (A) or (C)**（Issue のスコープを広げず、後続 Issue で本文を書く前提）
- **OGP 画像**：`public/` に LP 用 OG 画像が無い。暫定で `public/og.png` を追加するか、`metadata.openGraph.images` を省略するか要確認。**推奨は暫定省略**（画像デザインは別作業）。
- **`useAuth` を SSG ページ内で使えない**（Client 限定）ため、CTA の切替は必ず Client Component `MarketingCta` に切り出す。ページ本体を Client 化して SSG を壊さないよう注意。
- **JSON-LD の内容**：`Organization` の `url` `logo` は仮値でよいか。ドメイン確定前のため `https://kotozute.example.com` などのダミーを使うか、`process.env.NEXT_PUBLIC_SITE_URL` を参照するかは要判断。**推奨は環境変数参照＋フォールバック**。
- Header 部品（`src/components/layout/Header.tsx`）は認証エリア用ナビ（ホーム/ノート/家族）が固定で、LP に流用すると不整合。**LP 専用ヘッダーを `(marketing)/layout.tsx` にインラインで置く**方針で良いか。
- Lighthouse SEO ≥ 95 の計測は手動運用（自動化は本 Issue のスコープ外）。

## 参照
- `CLAUDE.md`
- `docs/frontend_design.md`
- `docs/screen_spec.md` §4「LP `/`」
