# Issue #15 — W2-03 [F-01] AuthProvider にユーザー配布 + 未認証時 /login 戻し

- URL: https://github.com/hasedai0000/kotozute-web/issues/15
- ラベル: frontend, week-2
- マイルストーン: MVP-Week2

## Issue 概要
Header / ダッシュボードなど全画面がログインユーザーを参照できるようにし、認証が切れた場合の挙動を確定させる。具体的には (1) 既に配置済みの `AuthProvider` を活かして `useLogout` を実装し Header の TODO を差し替える、(2) API から 401 が返った時に (app) 配下から `/login?redirect=...` へ自動で戻す、(3) `middleware.ts` の `?redirect=` は既に付与済みなので LoginForm 側の受け取りを確認する、の 3 点。Playwright で 1 シナリオ担保。

## 調査結果

### 関連ドキュメント
- `docs/frontend_design.md` 「認証（Sanctum SPA・クッキー）」— **フロントはトークンを保持しない**／**認証必須エリアは Route Group `(app)` ＋ middleware でガード**／**未認証は `/login` へ**／ログインユーザーは `AuthProvider`（Context）で配布。middleware は cookie ベースの粗い一次防衛で、API 側 401 で確定させる 2 段構え。
- `docs/screen_spec.md` §5「ログイン `/login` ／ 新規登録 `/register`」— **成功後：元の URL があればそこへ、なければ `/dashboard`**（`?redirect=` の受け取り仕様）。
- `docs/screen_spec.md` §9「設定」— 退会・ログアウト系はここに導線あり。ただし今回は Header の UserMenu からのログアウトを対象とする（Issue 本文の指示）。
- `CLAUDE.md` — 絶対ルール 2「サーバ状態は TanStack Query が唯一の真実」、4「トークンをフロントで保持しない。認証はクッキー（`credentials: 'include'`）」、features 単位で分割。

### 関連コード（大半の土台は #9・#13・#14 で敷かれている）
- `src/providers/AuthProvider.tsx` — **既に `useMe()` をマウント済み**。`user / isLoading / refetch` を配布。DoD 1（AuthProvider にユーザー配布）は**既に達成**。`useMe` の `staleTime` は 30 秒（`src/features/auth/api/useMe.ts:29`）で「短め」の要件を満たす。
- `src/features/auth/api/useMe.ts` — 401/419 で `null` を返して throw しない設計。`AuthProvider` は 401 を「未ログイン」として受け取れる。**「401 で /login に戻す」トリガーはここではなく、(app) 配下のガードで検知するのが自然**（AuthProvider は `(auth)` / `(marketing)` でも使われているため、Provider 内で全画面 redirect すると `/login` に来た未ログイン ユーザーが `/login` へ再 redirect するループになる）。
- `src/features/auth/hooks/useAuth.ts` — `useContext(AuthContext)` の thin wrapper。`(app)/layout.tsx` 配下のクライアント境界から呼び出せる。
- `src/components/layout/Header.tsx:127-183` — **UserMenu は既に実装済み**。`Header.tsx:171-179` にログアウトの `TODO(#15 W2-03)` があり、現状は `console.warn("ログアウト機能は W2-03 (#15) で実装予定です")`。**ここに `useLogout` を差し込むのが本 Issue の Header 側の作業**。
- `src/features/auth/api/useLogin.ts` — CSRF プリフライト → POST → `queryKeys.auth.me` invalidate の雛形。`useLogout` はこれを踏襲。ただし logout は成功時に `queryClient.clear()` する（DoD 2）。
- `src/features/auth/api/sanctum.ts` — `getCsrfCookie()` / `readXsrfToken()` / `resolveApiOrigin()`。`useLogout` からもそのまま再利用。#14 で共通化済み。
- `src/features/auth/api/useLogin.test.ts` — Vitest の fetch モック手法（`vi.stubGlobal("fetch", ...)`、`document.cookie` セット、CSRF→POST の 2 段モック）。**`useLogout.test.ts` の雛形として踏襲**。
- `src/features/auth/lib/redirect.ts` — `sanitizeRedirect()`（open redirect 対策）。**401 自動リダイレクト時にも現在の pathname を渡すのに使う**。
- `src/features/auth/components/LoginForm.tsx:31-36` — 既に `sanitizeRedirect(searchParams.get("redirect")) ?? "/dashboard"` で `?redirect=` を受け取り、成功時 `router.push(redirectTo)`。**DoD 4「middleware のリダイレクト先に `?redirect=` を付与しログイン後に戻す」の受け取り側は完了済み**。
- `src/middleware.ts:21-34` — 未ログイン (＝セッション cookie 無し) を検知したら `?redirect={pathname}{search}` を付けて `/login` に返す。**DoD 4 の付与側も完了済み**。今回**触らない**（`config.matcher` にも変更なし）。
- `src/app/(app)/layout.tsx` — 現状は **server component**（`Header` を含むレイアウトのみ）。**client-side 401 ガードは、この配下に薄い client component を差し込む形にする**（下記「やること」参照）。
- `src/lib/api/client.ts` — `apiFetch` は `credentials: 'include'` 固定。POST /logout でも同じラッパーを使う。
- `src/lib/query/queryKeys.ts` — 現状 `queryKeys.auth.me` のみ。`queryClient.clear()` は全キーを消すので追加不要。
- `e2e/auth-login.spec.ts` — Playwright の API スタブ手法（`page.route()` で `/sanctum/csrf-cookie`, `/login`, `/user`, `/dashboard` を regex マッチでスタブ、`NEXT_PUBLIC_API_URL` の有無に依存しない書き方）。**`e2e/auth-logout.spec.ts` に転用**。

### 依存関係
- 先に必要: **#9 W1-09（AuthProvider + useAuth + middleware ガード）— CLOSED**。
- 先に必要: **#13 W2-01（ログイン画面）— CLOSED**。CSRF フロー・sanctum 共通ヘルパ・LoginForm の `?redirect=` 受け取り。
- 先に必要: **#14 W2-02（新規登録画面）— CLOSED**。`sanctum.ts` / `redirect.ts` の共通化はこの Issue で完了済み。
- 関連（後続）: **#17 W2-05（ダッシュボード本体）** — 本 Issue で確定させる `useAuth` からユーザー名を引く前提。
- API 側依存: **`POST /logout` エンドポイント（Sanctum 標準）**が `kotozute-api` で有効であること。既定では `/logout` は Sanctum が用意している想定。**要ヒアリング**（リスク欄）。

## やること

- [ ] **`src/features/auth/api/useLogout.ts`（新規）**
  - `logoutRequest()`: `apiFetch<void>("/logout", { method: "POST", headers: readXsrfToken() ? { "X-XSRF-TOKEN": readXsrfToken()! } : undefined })`。
  - `useLogout()`: `useMutation`。`mutationFn` は `getCsrfCookie() → logoutRequest()`。`onSuccess` で **`queryClient.setQueryData(queryKeys.auth.me, null)` → `queryClient.clear()`** の順（clear の前に me を null で確定させておくと、Header の UserMenu が redirect 前の 1 フレームで「ログイン」ボタンに切り替わる。順序を逆にすると clear で空になった後で null がまた書かれるだけなので実質同じだが、副作用として **他機能の in-flight query の cancel** が起きる点は clear の性質を理解した上で採用する）。
  - ネットワーク失敗時でも UI 上はログアウト扱いにしたいので、`onSettled` で `queryClient.clear()` を呼ぶ設計も検討 → **今回は `onSuccess` のみ**（DoD「cookie が消えて」は成功前提。失敗は toast で通知して retry させる）。
- [ ] **`src/features/auth/api/useLogout.test.ts`（新規）**
  - CSRF → `/logout` の順で fetch が呼ばれる。
  - 2 回目 (`/logout`) に `X-XSRF-TOKEN` ヘッダが載る（`document.cookie` に `XSRF-TOKEN` セットして検証）。
  - 成功時に `queryClient.clear()` が呼ばれる（`vi.spyOn(client, "clear")`）。
  - 401 が返っても throw が伝播する（UI 側でトーストするテストは Header 側の RTL で担保）。
- [ ] **`src/components/layout/Header.tsx` の TODO を差し替え**
  - `Header.tsx:171-179` の `console.warn` を削除し、`useLogout()` を Header 内で呼ぶ形に変更。
  - クリック時: `try { await logout.mutateAsync(); router.push("/"); } catch { toast.error("ログアウトに失敗しました") }`。
  - 実行中は `DropdownMenuItem` を `disabled` にして二重送信防止（`logout.isPending`）。
  - `useRouter` の import を追加。`"use client"` は既に付いている。
- [ ] **`src/components/layout/Header.test.tsx`（新規 or 追記）** — ログアウトの UI 挙動
  - `QueryClientProvider` + `AuthProvider` の代わりに、`AuthContext.Provider` で `user` を直接渡してレンダリング（既存の hooks テストと同じパターン）。
  - `fetch` を `vi.stubGlobal` でモックし、CSRF + `/logout` を 204 で応答。
  - 「ログアウト」メニューをクリック → `router.push("/")` が呼ばれる（`useRouter` を `vi.mock("next/navigation")` で差し替え）。
  - 失敗時に sonner の `toast.error` が呼ばれる（`vi.mock("sonner")`）。
  - **注**: Header は既に大きめのコンポーネントなので、UserMenu を `src/features/auth/components/UserMenu.tsx` に切り出してテストしやすくする案もあるが、**Issue のスコープを超えるので今回は Header 内で完結させる**（切り出しは後続 Issue で）。
- [ ] **`src/app/(app)/_components/AppAuthGuard.tsx`（新規、client component）** — 401 で `/login` 自動遷移
  - `"use client"`。`useAuth()` から `user` / `isLoading` を取得、`usePathname()` で現在パスを取り、
    ```ts
    useEffect(() => {
      if (isLoading) return;
      if (user === null) {
        const redirect = encodeURIComponent(pathname);
        router.replace(`/login?redirect=${redirect}`);
      }
    }, [user, isLoading, pathname, router]);
    ```
  - `user === null && !isLoading` の間は `null` を返す（ちらつき防止）。それ以外は `children` をそのまま返す。
  - **設計判断**: `AuthProvider` 自体に redirect を書くと `(auth)` / `(marketing)` にも影響し `/login` で無限ループになるため、**`(app)` 配下でのみ発動する境界に置く**。frontend_design.md の「認証必須エリアは `(app)` ＋ middleware でガード」に忠実。
  - **middleware との重複について**: middleware は cookie の有無だけで判断する粗い一次防衛。AppAuthGuard は API から返ってきた `useMe` の結果（401 → null）を見て確定させる二次防衛。**両方あるのが正**（frontend_design.md）。
- [ ] **`src/app/(app)/layout.tsx` を更新**
  - server component のまま、`<AppAuthGuard>` で `children` をラップ（`Header` はガードの外に置き、ログイン中ユーザーが見えるトップナビは維持）。
  - もしくは `<AppAuthGuard>` で `Header` + `children` 全体をラップ。**推奨は後者**（未ログイン状態で Header だけ一瞬見えるのを防ぐ）。
- [ ] **`src/app/(app)/_components/AppAuthGuard.test.tsx`（新規）**
  - `AuthContext.Provider` で `user: null, isLoading: false` を渡し、`useRouter` モックの `replace` が `/login?redirect=%2Fdashboard` で呼ばれることを検証（`usePathname` を `vi.mock` で `/dashboard` に固定）。
  - `user: null, isLoading: true` の間は redirect を呼ばず、children も描画しない。
  - `user: { ... }` のときは children を描画。
- [ ] **`e2e/auth-logout.spec.ts`（新規、DoD の「Playwright で 1 シナリオ」）**
  - `auth-login.spec.ts` のスタブ手法を踏襲。`/sanctum/csrf-cookie`, `/logout` (POST), `/user` (GET) を regex マッチでスタブ。
  - シナリオ: 
    1. `/user` を 200 でスタブ（ログイン状態）→ `/dashboard` にアクセス（middleware スタブとしてセッション cookie 相当を `context.addCookies` で仕込む、または `beforeEach` で `/login` を経由）。
    2. Header の avatar をクリック → ドロップダウンから「ログアウト」をクリック。
    3. `/logout` に POST が飛び、その後 `/user` のスタブを 401 に切り替え。
    4. URL が `/` に遷移することを検証。
  - **中間手段**: middleware を回避するために cookie を仕込む必要がある。`beforeEach` で `page.context().addCookies([{ name: "laravel_session", value: "stub", ... }])` を使うのが最短。
- [ ] **`middleware.ts` は今回変更なし**
  - DoD 4 の付与は既に `middleware.ts:29-32` で完了済み。受け取り側も `LoginForm.tsx:33-36` で完了済み。**Issue 本文に「?redirect= を付与」とあるが実装済みのため確認のみ**（plan に明記し、DoD 転記のチェック時に「実装済み」と注記する）。

## 完了条件（DoD）

Issue の DoD を転記:
- [ ] 401 が返ると自動で `/login` に戻る
  - AppAuthGuard 経由。`useMe` が 401 で null → guard が `/login?redirect={pathname}` に replace。
- [ ] ログアウトで cookie が消えて `/` に戻る
  - `useLogout` → `/logout` (Sanctum が session cookie を破棄) → `queryClient.clear()` → `router.push("/")`。
- [ ] Playwright で 1 シナリオ
  - `e2e/auth-logout.spec.ts` にログアウト成功シナリオを 1 本。

追加（Issue「作業内容」より）:
- [ ] `useMe` を `AuthProvider` にマウント（`staleTime` を短めに） — **既に達成済み**（`staleTime: 30_000`）。plan.md では確認のみに留める。
- [ ] Header に UserMenu（ログアウト、設定リンク） — **UserMenu は既存**、ログアウトのみ本 Issue で有効化。
- [ ] `useLogout` フック（`/logout` → queryClient.clear()）
- [ ] `middleware.ts` のリダイレクト先に `?redirect=` を付与し、ログイン後に戻す — **既に達成済み**。plan.md では確認のみに留める。

## リスク / 確認事項

- **API の `POST /logout` エンドポイント**: `kotozute-api` 側で Sanctum の logout ルート（`Route::post('/logout', ...)` もしくは Fortify）が有効かを確認。無ければ本 Issue のログアウト機能は動かない。**先に API 側の疎通確認が必要**。
- **`queryClient.clear()` の副作用**: 現状は `queryKeys.auth.me` しかキャッシュに載っていないが、後続 Issue（#17 ダッシュボード、#18 ノート一覧）でキャッシュが増える。clear は in-flight query を cancel するので、ログアウト直後のトーストや遷移中 UI に影響しないか、後続 Issue でも意識する。plan.md には**「clear の副作用に留意」とだけ記す**。
- **middleware と AppAuthGuard の 2 段構えでチラつく可能性**: middleware は cookie を見て通し、AppAuthGuard が `useMe` の結果を待ってから redirect する構造上、**サーバー側で cookie は生きているが期限切れ**のパターンでは (app) ページが一瞬描画されてから `/login` に戻る。**AppAuthGuard で `isLoading` 中は `null` を返してちらつきを消す**方針を採用する（上記「やること」に反映済み）。
- **401 redirect のループリスク**: `/login` は `(auth)` にあり `(app)` 配下ではないため、AppAuthGuard には到達しない。ループ設計上の懸念はないが、**e2e で LoginForm 到達後に無限リダイレクトが起きていないことをアサートする**（URL が `/login?redirect=/dashboard` で安定する）。
- **`useLogout` 失敗時の UX**: DoD は「cookie が消えて `/` に戻る」なので、失敗時は toast だけ出して現在ページに留める。**サーバー側で 500 でも cookie を消すべきかは要ヒアリング**（今回は成功時のみ redirect）。
- **UserMenu の切り出し**: Header に inline されたままで済ませるが、テスト容易性は下がる。**後続 Issue で `features/auth/components/UserMenu.tsx` へ切り出す**タスクを立てる余地あり。今回はスコープ外。
- **[実装中に発覚] `DropdownMenuLabel` が `Menu.Group` 外で使われて runtime error**: base-ui は `MenuPrimitive.GroupLabel` を `MenuPrimitive.Group` の外で使うと throw する。既存 Header の UserMenu を開くと `MenuGroupContext is missing` で crash していた（E2E で判明）。**本 Issue の範囲で `<DropdownMenuGroup>` 追加のみで修正**（ログアウト動線を成立させるために必須のため）。

## 参照

- `CLAUDE.md`
- `docs/frontend_design.md`（認証セクション・ディレクトリ構成）
- `docs/screen_spec.md` §5（`/login` の `?redirect=` 仕様）、§9（設定・ログアウト導線）
- `docs/issues/13/plan.md`、`docs/issues/14/plan.md`（本 Issue と同じ書き味）
- 実装参照: `src/providers/AuthProvider.tsx`, `src/features/auth/api/useLogin.ts`, `src/features/auth/api/sanctum.ts`, `src/features/auth/lib/redirect.ts`, `src/middleware.ts`, `src/app/(app)/layout.tsx`, `src/components/layout/Header.tsx`
- テスト参照: `src/features/auth/api/useLogin.test.ts`, `e2e/auth-login.spec.ts`
