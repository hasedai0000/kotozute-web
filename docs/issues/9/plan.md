# Issue #9 — W1-09 [基盤] AuthProvider（Context）+ useAuth + middleware ガード

- URL: https://github.com/hasedai0000/kotozute-web/issues/9
- ラベル: frontend, week-1
- マイルストーン: MVP-Week1

## Issue 概要
ログインユーザーを Context 経由で全画面から参照できるようにし、`(app)` 配下は未認証時に `/login?redirect=...` へ 302 で戻す。W1 の認証基盤の土台となる回。ログイン画面自体（Sanctum CSRF フロー）や UserMenu / useLogout は W2 側（#13, #15）で載せる前提で、ここでは **配布経路と守りの枠だけを用意**する。

## 調査結果

### 関連ドキュメント
- `docs/frontend_design.md` 「認証（Sanctum SPA・クッキー）」
  - ログイン前に CSRF クッキー取得 → ログイン。以後は httpOnly クッキーを自動送信
  - 全リクエストで `credentials: 'include'`
  - 認証必須エリアは Route Group `(app)` ＋ middleware でガード。未認証は `/login`
  - ログインユーザーは `AuthProvider`（Context）で配る
- `docs/frontend_design.md` 「状態管理の役割分担」
  - 「全体共有のごく少数（ログインユーザー・テーマ）は Context」
- `CLAUDE.md` 絶対ルール
  - 「トークンをフロントで保持しない」「localStorage に認証情報を置かない」
  - 「サーバ状態は TanStack Query が唯一の真実」→ user は **useQuery で管理し Context 経由で配る**（`useState` に写し取らない）
- `docs/screen_spec.md` 「共通仕様」
  - 未認証で `(app)` 配下に来た場合は `/login` へ、ログイン後は元の URL に戻す

### 関連コード
- `src/providers/QueryProvider.tsx` — 既存。`AuthProvider` は隣に新規作成、`app/layout.tsx` で `QueryProvider` の内側にネストする
- `src/lib/api/client.ts` (`apiFetch`) と `src/lib/api/openapi.ts` (`apiClient` + `unwrap`) — 既存。`useMe` はどちらを使うか要判断（下記リスク参照）
- `src/lib/query/queryKeys.ts` — 既存。`auth` / `me` 用のキーを追加
- `src/features/auth/api/` `hooks/` `components/` — いずれも空。`schema/login.ts` のみ存在
- `src/middleware.ts` — **未作成**
- `src/app/(app)/layout.tsx` — 既存（薄いラッパー）。ここに `AuthProvider` を差し込むか、`RootLayout` に置くかは判断ポイント
- `src/types/generated/api.ts` — 現状 `/health` のみのダミー。`/api/user`（Sanctum の標準 me エンドポイント）はまだ型として存在しない

### 依存関係
- 先に必要（済）:
  - #5 TanStack Query + QueryProvider 導入（CLOSED）
  - #7 lib/api ラッパー（CLOSED）
  - #8 openapi-typescript + openapi-fetch（CLOSED）
- この Issue が土台になる後続:
  - #10 Header / Nav / Container（`useAuth()` を UserMenu で消費）
  - #13 ログイン画面（Sanctum CSRF → login。成功後 `refetch()` で user を反映）
  - #15 W2-03 AuthProvider にユーザー配布 + 未認証時 /login 戻し — **一部スコープが重なる**（UserMenu、useLogout、401 自動リダイレクト、`?redirect=` 付与、Playwright シナリオは W2-03 側に残す）

## やること

- [ ] `src/features/auth/api/useMe.ts` を作成
  - TanStack Query の `useQuery` で `GET /api/user` を呼ぶ
  - 401 の場合はエラーを投げずに `null` を返す（Sanctum 未認証時の想定）
  - queryKey は `['auth', 'me']`（`src/lib/query/queryKeys.ts` に定数として集約）
  - retry: false、staleTime: 短め（W2-03 側の要件も見越して）
  - `src/lib/api/client.ts` の `apiFetch<T>` を使用（OpenAPI 側に `/api/user` の型がまだ無いため）
- [ ] `src/providers/AuthProvider.tsx` を作成
  - `"use client"`
  - `useMe()` をマウントし、`{ user, isLoading, refetch }` を Context 経由で配布
  - `useState` で user を持ち直さない（YOU MUST）
- [ ] `src/features/auth/hooks/useAuth.ts` を作成
  - Context を参照するフック。Provider 外で使ったら分かりやすくエラーを投げる
- [ ] `src/app/layout.tsx` を更新
  - `QueryProvider` の内側に `AuthProvider` をネストして全画面で `useAuth()` が使えるようにする
- [ ] `src/middleware.ts` を新規作成
  - matcher で `(app)` 配下（`/dashboard`, `/notebook/:path*`, `/messages`, `/family/:path*`, `/preview`, `/settings` など）を対象にする
  - リクエスト cookie に `XSRF-TOKEN` **または** Laravel セッションクッキー（`laravel_session` / `<APP_NAME>_session`）が無ければ `/login?redirect=<元URL>` に 302
  - 静的ファイル / `_next` / `api` などは matcher から除外
- [ ] Vitest テスト
  - `useAuth` が Provider 外で投げること
  - `useMe` が 401 で `null` を返し、成功時に user オブジェクトを返すこと（`apiFetch` をモック）
- [ ] `npm run typecheck` / `npm run lint` / `npm run test` が緑

## 完了条件（DoD）
Issue の DoD を転記:
- [ ] 未ログインで `/dashboard` にアクセスすると `/login?redirect=/dashboard` に遷移
- [ ] ログイン済みなら `/dashboard` が表示される
- [ ] `useAuth()` が feature から利用できる

## リスク / 確認事項

- **`/api/user` の型がまだ OpenAPI に無い**：現状の dummy spec には `/health` しか無いため、`useMe` は `apiFetch<User>` で叩く暫定運用にする案。ここで `User` 型を `src/features/auth/types.ts` に手書きするか、`unknown` で受けて as で narrow するかは実装時に判断する（バック側で OpenAPI が整い次第、`src/types/generated/` の型に差し替える前提でコメントを残す）。
- **middleware で確認するクッキー名**：Sanctum SPA では通常 `XSRF-TOKEN` が最初に取れて、ログイン後にセッションクッキー（`laravel_session` またはアプリ名由来）が付く。「未ログインでも `XSRF-TOKEN` は付く」ケースがあり得るため、**セッションクッキー主体で判定**するのが安全。API 側の実際のクッキー名を確認したい（未確認なら暫定で `laravel_session` を採用し、`.env` から名前を差し替えられるようにするか、両方の存在を or 判定する案）。
- **middleware は httpOnly クッキーの中身までは検証しない**：あくまで「クッキーがある/ない」だけの一次防衛線。セッション失効（クッキーはあるが 401）の自動リダイレクトは W2-03（#15）側で `apiClient` 401 ハンドラとして実装する。この Issue では扱わない。
- **`?redirect=` の付与は W2-03（#15）の DoD に含まれている**が、Issue #9 の作業内容に「`/login?redirect=...` に 302」と明記されているため、**middleware での付与はここでやる**。ログイン成功後の redirect 反映（実際に元の URL に戻す）は #13 / #15 側。
- **AuthProvider を差し込む階層**：`app/layout.tsx`（全画面）に置くと LP・login にも user フェッチが走る。`(app)/layout.tsx` に閉じる案もあるが、`(auth)` の login 直後に `refetch()` を呼びたい場面を考えると **全画面配布が素直**。現状の方針として `app/layout.tsx` に入れる想定で進めるが、承認いただきたい。
- **Playwright E2E**：W2-03（#15）側 DoD に「Playwright で 1 シナリオ」があり、ログイン画面（#13）が無いと実行不能。この Issue では E2E は書かず、Vitest 単体テストに留める。
- **Next.js 16 の `middleware` → `proxy` 改名（実装時に判明）**：`npm run build` 時に `The "middleware" file convention is deprecated. Please use "proxy" instead.` の警告が出る（https://nextjs.org/docs/messages/middleware-to-proxy）。本 Issue は `middleware.ts` で明示指定があるためそのまま実装したが、後続で `src/proxy.ts` にリネームする Issue を切ることを推奨。

## 参照
- CLAUDE.md
- docs/frontend_design.md（認証、状態管理の役割分担）
- docs/screen_spec.md（共通仕様）
- Issue #15（W2-03）：後続で載せる範囲の切り分け
