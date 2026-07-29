# Issue #5 — W1-05 [基盤] TanStack Query + QueryProvider 導入

- URL: https://github.com/hasedai0000/kotozute-web/issues/5
- ラベル: frontend, week-1
- マイルストーン: MVP-Week1

## Issue 概要

サーバ状態の唯一の真実として TanStack Query を導入する。QueryClient / QueryProvider（"use client"）/ ReactQueryDevtools（開発時のみ）/ 空の queryKeys 集約ファイルを用意し、`app/layout.tsx` から Provider をラップする。CLAUDE.md の絶対ルール「サーバ状態は TanStack Query が唯一の真実」を成立させるための土台整備。

## 調査結果

### 関連ドキュメント

- `CLAUDE.md` — 「絶対ルール」でサーバ状態は TanStack Query、`useState` に写し取らない旨を明記。
- `docs/frontend_design.md` — 「状態管理の役割分担」で TanStack Query の位置づけ、「API 通信と型」で `queryKeys` を `lib/query/` に集約（例: `['notebook', familyId, section]`）と規定。
- `docs/screen_spec.md` — 「共通仕様」の状態出し分け（ローディング＝スケルトン、保存中＝楽観的更新、失敗時ロールバック）は将来 TanStack Query のフックで実現する前提。今回は器のみ。

### 関連コード

- `package.json` — `@tanstack/react-query` / `@tanstack/react-query-devtools` は **未追加**。Next 16.2.10 / React 19.2.4 のため、React 19 対応済みの `@tanstack/react-query@^5`（v5.60 以降）を採用する。
- `src/lib/query/` — **`.gitkeep` のみ**。`queryClient.ts` と `queryKeys.ts` は未作成。
- `src/providers/` — **`.gitkeep` のみ**。`QueryProvider.tsx` は未作成。
- `src/app/layout.tsx` — Server Component。`html/body` にフォント変数と `globals.css` を適用しているだけ。`children` を Provider でラップする位置は自明（`<body>` の直下、`children` を包む）。
- `src/app/(marketing)/page.tsx` — LP（SSG）。TanStack Query のフックは未使用。Provider ラップ後も SSG のまま影響なしを確認する対象。
- `src/app/(app)/layout.tsx` — 認証必須エリアの薄いレイアウト。Provider は Root で共有する方針のためここでは触らない。
- `next.config.ts` — `output: 'standalone'`。Provider 導入で影響なし。
- `tsconfig.json` — `strict: true`。`useState(() => new QueryClient())` などの初期化パターンで型は問題なし。

grep 結果: `src/` 配下に `tanstack` / `react-query` / `QueryProvider` / `QueryClient` の既存参照は **一切なし**（新規導入で確定）。

### 依存関係

- 先に必要: **なし**（W1-01〜04 は closed。基盤の土台系として単独で成立）。
- 直接の後続:
  - **#7 W1-07** `lib/api` ラッパー（credentials:include + エラー整形） — TanStack Query の `queryFn` から呼ぶ想定。
  - **#8 W1-08** openapi-typescript + openapi-fetch — 生成クライアントを feature の `api/*` で TanStack Query フックにラップする。
  - **#9 W1-09** AuthProvider + middleware — Provider ラップの並び順（QueryProvider の外か内か）を W1-09 時点で決める必要あり。今回は AuthProvider 未存在なので QueryProvider 単体で挿入する。
- 関連: **#6 W1-06** RHF + Zod（フォーム系）、**#12 W1-12** LP 実装（LP に影響ないことを確認するリグレッション対象）。

## やること

- [ ] `dependencies` に追加
  - `@tanstack/react-query`（^5、React 19 対応版）
  - `@tanstack/react-query-devtools`（同バージョン系）
- [ ] `src/lib/query/queryClient.ts` を追加
  - `createQueryClient()` 関数を export（インスタンス直生成でなく factory にして SSR/CSR で個別インスタンスにできる形）
  - `defaultOptions`:
    - `queries`: `staleTime: 60_000`（1 分）、`gcTime: 5 * 60_000`、`retry: 1`（401/403 は将来 lib/api 側でリトライしない方針）、`refetchOnWindowFocus: false`（機微情報系。頻繁な再取得を避ける）
    - `mutations`: `retry: 0`
  - `.gitkeep` を削除
- [ ] `src/lib/query/queryKeys.ts` を追加（**空の集約ファイル**）
  - 現時点で使うキーはない。`export const queryKeys = {} as const;` の骨組みのみ。
  - コメントで「feature 側ではこの集約からキーを引く」旨を 1 行だけ記す。
- [ ] `src/providers/QueryProvider.tsx` を追加
  - 冒頭に `"use client"`
  - `useState(() => createQueryClient())` で **リクエストごとに新規インスタンス**（SSR で client 共有しない Next.js App Router の定石）
  - `<QueryClientProvider client={queryClient}>{children}<ReactQueryDevtools /></QueryClientProvider>`
  - `ReactQueryDevtools` は `process.env.NODE_ENV === 'development'` の時だけレンダリング（本番バンドルには含める判断/含めない判断がある。含めない場合は動的 import で条件付き読み込み）
    - 実装案: `{process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}`（本番バンドルに残る可能性はあるが小さいため MVP は許容。除外したい場合は次で `next/dynamic` を使う）
  - `.gitkeep` を削除
- [ ] `src/app/layout.tsx` から `QueryProvider` をラップ
  - `<body>` 直下で `children` を包む
  - Root Layout は Server Component のまま。QueryProvider が Client Component なので境界が成立する。
- [ ] 動作確認
  - `npm run dev` → `/` を開き、開発ビルドで **React Query Devtools のフローティングボタン**が表示されることを目視確認
  - `npm run typecheck`（実質 `tsc --noEmit` 相当。CI では `next build` に含まれる）／ `npm run lint` ／ `npm run build` がすべて通ること
  - LP のマークアップ（`<h1>ことづて</h1>` と `いまを生きるための、終活ノート。`）に変化がないこと（`npm run test:e2e` の `e2e/lp.spec.ts` が通り続けること）

## 完了条件（DoD）

Issue の DoD を転記:

- [ ] devtools がローカルで開ける
- [ ] 型 / lint / build 通過
- [ ] 既存の LP に影響がない

## リスク / 確認事項

1. **QueryClient のシングルトン化 vs. リクエストごとの生成**
   - Next.js App Router では Server Component のレンダリング境界と Client Component が混在するため、`QueryProvider` の中で `useState(() => new QueryClient())` にしてリクエストごとにインスタンスを分けるのが公式推奨。**モジュールトップレベルで `export const queryClient = new QueryClient()` はしない**（複数リクエスト間でキャッシュが混じる）。
2. **Devtools の本番バンドル混入**
   - `process.env.NODE_ENV === 'development' && <ReactQueryDevtools />` の条件式は Tree-shake されない可能性がある。厳密に除外するなら `next/dynamic` で `ssr: false` + 条件付き import。MVP スコープではサイズも小さいため素の条件式で許容する案を採るが、**気になる場合は動的 import に変更する**（実装時に確認）。
3. **staleTime / refetchOnWindowFocus の既定値**
   - `refetchOnWindowFocus: false` は「機微情報系のため頻繁な再取得を避ける」判断。ダッシュボードの進捗など再取得したい画面が出てきたら feature 側で個別に上書きする。**この既定でよいかユーザー確認**。
4. **retry の既定値**
   - `retry: 1` にする案。401/403 はリトライしない方が UX 上望ましいが、判定は将来 `lib/api` ラッパー（#7）と組み合わせて実装する。今回はグローバル既定のみ。
5. **AuthProvider との積み重ね順**
   - W1-09（#9）で AuthProvider を入れる時、`<QueryProvider><AuthProvider>{children}</AuthProvider></QueryProvider>` の順にする想定（Auth は「私」の情報を Query 経由で取ることがあり得るため）。**今回はまだ入れない**。将来の並びを揃えるため QueryProvider は最外に置く。
6. **`.gitkeep` の扱い**
   - `src/lib/query/.gitkeep` と `src/providers/.gitkeep` は実ファイル追加と同時に削除する（同じコミットで OK）。
7. **React 19 と TanStack Query v5 の互換性**
   - v5.60 以降で React 19 が正式サポート。`package.json` のバージョンは `^5.60.0` 相当以上を指定。導入時に最新の安定版を選ぶ。
8. **CLAUDE.md の絶対ルール整合**
   - 「サーバ状態は TanStack Query が唯一の真実」は今回導入で成立。以降の feature 実装で `useState` にサーバ状態を写し取る実装は禁止という前提を PR 説明にも書き添える。

## 参照

- `CLAUDE.md`（絶対ルール節・技術スタック節）
- `docs/frontend_design.md`（状態管理／API 通信と型／ディレクトリ構成）
- `docs/screen_spec.md`（共通仕様の状態出し分け）
- Issue: https://github.com/hasedai0000/kotozute-web/issues/5
- 関連 Issue: #7 W1-07（lib/api ラッパー）、#8 W1-08（openapi 型生成）、#9 W1-09（AuthProvider）、#6 W1-06（RHF + Zod）
- 既存プラン: `docs/issues/4/plan.md`（テスト土台。LP のリグレッション確認に流用可）
