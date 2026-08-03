## 1) 概要
Issue #10 — W1-10 [基盤] Header / Nav / Container + shadcn 主要部品追加

- URL: https://github.com/hasedai0000/kotozute-web/issues/10
- ラベル: frontend, week-1
- マイルストーン: MVP-Week1

## 2) Issue 要約
`(app)` 配下の共通レイアウトを整える基盤回。shadcn/ui の頻用部品を一括で入れ、`Header`（ロゴ・ナビ・UserMenu）と `Container` を作り、`src/app/(app)/layout.tsx` に差し込む。これによりダッシュボード以降の全ページで共通ヘッダーが出るようにする。認証ログインフォームや実際のログアウト API 呼び出しは W2（#13, #15）で扱う想定なので、この回では **見た目と枠**を用意する。

## 3) 調査結果

### 関連ドキュメント
- `docs/frontend_design.md` 「ディレクトリ構成」
  - `components/ui/` に shadcn の基礎部品、`components/layout/` に Header・Nav・Container を置く
- `docs/frontend_design.md` 「UI・デザイン実装」
  - 白基調・カード型・角丸・フラット、Tailwind テーマにデザイントークン（直値禁止）
  - グリーンをブランドアクセント。`TimingBadge`（常時共有＝グリーン／死後開示＝アンバー）
- `docs/screen_spec.md` 「1. ダッシュボード」レイアウト
  - ヘッダー：**ロゴ、ナビ（ホーム／ノート／家族）、ユーザーメニュー**
- `docs/screen_spec.md` 「画面遷移（MVP）」
  - `(app)` の主要リンク先は `/dashboard`, `/notebook`, `/family`（＋ `/messages`, `/preview`, `/settings`）
- `CLAUDE.md` 絶対ルール
  - `src/app/` はルーティング専任で薄く保つ／デザイントークンを使う／直値のカラーコード禁止

### 関連コード
- `src/app/(app)/layout.tsx` — 現状は `<div className="min-h-full">` のみ。Header 未挿入
- `src/app/(app)/{dashboard,notebook,family,messages,preview,settings}/` — 各ページ骨組みはある（多くはプレースホルダ）
- `src/app/layout.tsx` — RootLayout に `QueryProvider → AuthProvider` が既に入っている
- `src/components/ui/` — 現状 `button.tsx` / `form.tsx` / `label.tsx` のみ。**残り 17 部品を追加**する必要
- `src/components/layout/` — 空。Header / Container を新規作成
- `components.json` — 既に shadcn 設定済み（`style: base-nova`, `iconLibrary: lucide`, alias `@/components/ui` 等）
- `src/providers/AuthProvider.tsx` + `src/features/auth/hooks/useAuth.ts` — 既存。Header で `useAuth()` からユーザー名／メールを取れる
- `src/features/auth/api/useMe.ts` — 既存。`AuthUser = { id, name, email }` を返す
- `src/middleware.ts` — `(app)` を Sanctum セッションクッキーでガード済み
- `src/styles/globals.css` — グリーン primary / TimingBadge 用トークン定義済み

### 依存関係
- 先に必要:
  - #5 QueryProvider（済）
  - #6 React Hook Form + Zod（済）
  - #9 AuthProvider + useAuth + middleware（済）
- 関連（このあと乗ってくる）:
  - #11 共通部品（TimingBadge・EntryCard 等）— `badge`・`dialog`・`card` を利用するので本 Issue で追加しておく必要あり
  - #13 W2-01 ログイン画面 — `input`・`form`・`label`・`button` を利用
  - #15 W2-03 AuthProvider にユーザー配布 + 未認証時 /login 戻し — UserMenu の**ログアウト実行**は本来ここで実装される想定。W1-10 では**ドロップダウンの枠**まで

## 4) ゴール（DoD 明文化）
- [ ] shadcn 部品 20 種が `src/components/ui/` に生成される
- [ ] `src/components/layout/Header.tsx`（ロゴ・主要ナビ・UserMenu）が実装され、`(app)` 全ページで表示される
- [ ] `src/components/layout/Container.tsx`（中央寄せ＋左右余白）が実装され、`(app)` レイアウトで本文をラップする
- [ ] `src/app/(app)/layout.tsx` が Header + Container を差し込む形に更新される
- [ ] モバイル幅（min 320px）で崩れない：ナビはハンバーガー（`sheet`）に畳む
- [ ] ダッシュボードなどのページを開くと Header が実際に描画されることを目視で確認できる

## 5) 実装方針

### 5.1 shadcn 部品の追加
`npx shadcn@latest add` で以下を一括投入する（既存の `button` / `form` / `label` は既にあるので上書き衝突に注意）。
- button / card / dialog / input / label / form / sheet / dropdown-menu / **sonner (toast)** / skeleton / tabs / badge / avatar / separator / progress / textarea / select / switch / slider / tooltip

（`toast` は shadcn の最新レジストリでは `sonner` に置き換わっているため、`sonner` を採用する。従来の toast が必要になったら別途検討する。）

出力先: `src/components/ui/`。生成直後に `npm run typecheck` と `npm run lint` を通し、破損部品があればその場で修正する。

### 5.2 `Container.tsx`
薄いラッパー。責務は「中央寄せ・最大幅・左右パディング・縦間隔」だけ。

```tsx
// src/components/layout/Container.tsx
import { cn } from "@/lib/utils";
export function Container({
  className,
  children,
  as: Tag = "div",
}: { className?: string; children: React.ReactNode; as?: React.ElementType }) {
  return (
    <Tag className={cn("mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8", className)}>
      {children}
    </Tag>
  );
}
```

### 5.3 `Header.tsx`
- 左：ロゴ「ことづて」 → `/dashboard` へのリンク
- 中央（デスクトップのみ）：主要ナビ — `/dashboard`（ホーム）, `/notebook`（ノート）, `/family`（家族）
- 右：`UserMenu`（Avatar + Dropdown。中身は氏名／メール／`ログアウト`）
- モバイル：中央ナビは非表示、代わりに左端に **`sheet` トリガー（ハンバーガー）** を出し、`Sheet` の中に同じナビリンクを縦配置
- `next/link` を使用。現在ページのアクティブ表示は `usePathname()` で判定
- 未ログイン状態でも Header 自体は描画するが、ユーザー情報部分は Skeleton or 非表示（`useAuth().isLoading` を見る）

**UserMenu の"ログアウト" 挙動（重要）**:
- W1-10 の Issue 本文は「UserMenu」の存在までしか要求していない
- 実際の `useLogout` mutation（Sanctum の POST `/logout` + キャッシュクリア）は **#15 (W2-03)** の範囲に含まれる想定
- 本 Issue では **ドロップダウン項目までを配置し、`onClick` は TODO コメント付きの no-op / console.warn** にしておく。実装は次 Issue で差し替える
- ここで妥協することで #9 のスコープ（未認証時の /login 戻し）と重複せず、W1 の枠に収まる

### 5.4 `(app)/layout.tsx` への差し込み
```tsx
// src/app/(app)/layout.tsx
import { Header } from "@/components/layout/Header";
import { Container } from "@/components/layout/Container";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <main className="flex-1 py-6">
        <Container>{children}</Container>
      </main>
    </div>
  );
}
```

- 既存ページ側で `<Container>` を二重に使わないよう、`dashboard/page.tsx` などのラッパー要素は必要に応じて調整（ただし本 Issue のスコープは最小限。既存が壊れないことを確認するだけに留める）

### 5.5 Toaster の設置
`sonner` を追加したら、`src/app/layout.tsx`（RootLayout）に `<Toaster />` を 1 か所だけ置く。以後の Issue でトーストが必要な時にすぐ使える。

### 5.6 アクセシビリティ（CLAUDE.md 絶対ルール）
- ナビリンクは `aria-current="page"` を付ける（`usePathname()` で判定）
- UserMenu のトリガーには `aria-label`（例: "ユーザーメニュー"）
- Sheet のトリガーには `aria-label="メニューを開く"`
- キーボード操作：Tab で全リンク・トリガーに到達できる
- コントラスト：デザイントークン（`text-foreground` / `bg-background` / `text-muted-foreground`）を使用し、直値カラー禁止（CLAUDE.md ルール 5）

## 6) やること（作業手順）
- [ ] `npx shadcn@latest add button card dialog input label form sheet dropdown-menu sonner skeleton tabs badge avatar separator progress textarea select switch slider tooltip` を実行
- [ ] 生成された部品で `npm run typecheck` / `npm run lint` を通す（壊れがあれば修正）
- [ ] `src/app/layout.tsx` に `<Toaster />` (`sonner`) を追加
- [ ] `src/components/layout/Container.tsx` を新規作成
- [ ] `src/components/layout/Header.tsx` を新規作成（ロゴ + デスクトップナビ + Sheet モバイルナビ + UserMenu）
- [ ] `src/app/(app)/layout.tsx` を Header + Container を差し込む形に更新
- [ ] `npm run dev` で `/dashboard` を開き、Header 表示と モバイル幅（<640px）で崩れないことを目視確認
- [ ] `npm run typecheck` / `npm run lint` / `npm run build` を最終確認

## 7) 完了条件（Issue の DoD）
- [ ] `/dashboard` などのページに Header が出る
- [ ] モバイル幅で崩れない（min-w 対応）

## 8) リスク / 確認事項
1. **UserMenu の"ログアウト" 実装スコープ**
   - Issue 本文には具体的な要求がない。#15 (W2-03) で `useLogout` を実装する想定で、本 Issue では **UI 枠のみ**（クリック時は no-op or TODO コメント）にしたい。これで問題ないか要確認。
2. **`sonner` vs `toast`**
   - shadcn 最新レジストリでは `toast` が `sonner` に置き換わっている。Issue 本文には「toast」とあるが、`sonner` で代替してよいか要確認（現行 shadcn の推奨）。
3. **shadcn 部品の上書き**
   - `button` / `form` / `label` は既に手元にある。`add` を再実行すると差分が出る可能性。既存を維持する（`-o` を付けず、上書き確認プロンプトで No）方針でよいか。
4. **ナビ項目**
   - 画面仕様では「ホーム／ノート／家族」の 3 項目。`/preview` `/settings` はユーザーメニュー内から辿る（screen_spec の記述に沿う）。Header にはこの 3 リンクのみ載せる方針でよいか。
5. **`(app)/*/page.tsx` の既存レイアウトとの衝突**
   - 例: `dashboard/page.tsx` は `<main className="p-6">` を返している。`AppLayout` 側で `<main>` を持たせると HTML 的に `<main>` 二重になる。既存ページの `<main>` を外す小修正が必要になりうる（このスコープに含める想定）。

## 9) 参照
- CLAUDE.md（features 単位で割る／デザイントークン使用／`src/app/` は薄く保つ／a11y）
- docs/frontend_design.md（ディレクトリ構成／UI・デザイン実装）
- docs/screen_spec.md（1. ダッシュボード レイアウト／画面遷移）
- 既存 Issue #9 plan（AuthProvider の配布経路）
- 後続 Issue #11（共通部品）・#13 / #15（ログイン・ログアウト実装）
