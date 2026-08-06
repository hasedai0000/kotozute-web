# Issue #13 — W2-01 [F-01] ログイン画面（Sanctum CSRF → login フロー）

- URL: https://github.com/hasedai0000/kotozute-web/issues/13
- ラベル: frontend, week-2
- マイルストーン: MVP-Week2

## Issue 概要
Laravel Sanctum の SPA 認証（CSRF プリフライト → `/login` → me 再取得）をフロントで完全実装する。`LoginForm`（RHF + Zod）を `/login` ページに組み込み、失敗時は「メールアドレスまたはパスワードが正しくありません」（どちらが誤りか明かさない）を表示し、送信中は二重送信を抑止する。成功時は元 URL（`?redirect=`）→ `/dashboard` にフォールバック。認証情報はフロントで保持しない（httpOnly クッキーのみ）。

## 調査結果

### 関連ドキュメント
- `docs/screen_spec.md` §5「ログイン `/login` ／ 新規登録 `/register`」— 中央 1 カラムのカード、Sanctum SPA 認証、CSRF プリフライト、失敗文言を統一（どちらが誤りか明かさない）、二重送信抑止、成功後は元 URL または `/dashboard`、Zod 検証。
- `docs/frontend_design.md` — 認証（Sanctum SPA・クッキー）／`AuthProvider` で配布／`credentials: 'include'` を全リクエストに付与／トークンをフロントで保持しない。
- `CLAUDE.md` — 絶対ルール 4「トークンをフロントで保持しない」／`localStorage` に置かない／features 単位で分割／サーバ状態は TanStack Query が唯一の真実。

### 関連コード
- `src/features/auth/schema/login.ts` — **既存**。`email`（必須 + email 形式）／`password`（必須）の Zod スキーマ。日本語エラーメッセージ済み。**再利用のみ、変更不要**。
- `src/features/auth/schema/login.test.ts` — 既存の Vitest テスト（3 ケース）。
- `src/features/auth/api/useMe.ts` — 既存。`fetchMe()` は `/user` を叩き、401/419 は `null` を返す。`useMe()` の `queryKey` は `queryKeys.auth.me`。**ログイン成功後にこれを `invalidateQueries` する**。
- `src/features/auth/api/` — **`useLogin.ts` は未作成**（新規）。
- `src/features/auth/components/` — 空（`.gitkeep` のみ）。**`LoginForm.tsx` を新規**。
- `src/app/(auth)/login/page.tsx` — プレースホルダ（`<h1>ログイン</h1>` のみ）。**全面刷新**。
- `src/lib/api/client.ts` — `apiFetch()` は `credentials: 'include'`、`Accept: application/json`、`X-Requested-With: XMLHttpRequest` を必ず付与し、`ApiError` に整形して throw する。**流用**。
- `src/lib/api/errors.ts` — `ApiError` は `status`, `fields`（Laravel の 422 バリデーション）, `message` を持つ。**422 は "invalid credentials" と区別**して扱う想定。
- `src/lib/query/queryKeys.ts` — `queryKeys.auth.me`。
- `src/providers/AuthProvider.tsx` — `useMe()` をマウント。`refetch()` を公開。ログイン後は `AuthContext.refetch()` を呼ぶか、`queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })` する。
- `src/middleware.ts` — `(app)` 配下を守り、未認証時は `/login?redirect=<元パス>` にリダイレクトする（#9 で実装済み）。**この `redirect` パラメータを `LoginForm` 側で読み、成功後に戻す**。
- `src/components/ui/form.tsx` / `input.tsx` / `button.tsx` — shadcn（RHF ラッパー）が利用可能。
- `src/components/ui/sonner.tsx` — `Toaster` は `layout.tsx` にマウント済み。エラー時のトースト用。
- `e2e/lp.spec.ts` — 既存 Playwright テスト 1 件（LP タイトル）。**`e2e/auth-login.spec.ts` を新規追加**。
- `playwright.config.ts` — `webServer: npm run dev` で `localhost:3000` を自動起動。API は起動しない → **E2E で API をどう扱うか要確認**（下部リスク欄）。

### 依存関係
- 先に必要: **#9 W1-09（AuthProvider + useAuth + middleware ガード）— CLOSED 済み**。`useAuth()` の `refetch` と `queryKeys.auth.me` が使える。
- 先に必要: **#6 W1-06（RHF + Zod 導入）— CLOSED 済み**。`components/ui/form.tsx` が使える。
- 関連（後続）: **#15 W2-03**「AuthProvider にユーザー配布 + 未認証時 `/login` 戻し」— `middleware` の `redirect` パラメータ付与は既に実装済み。UserMenu / `useLogout` は #15 で追加。
- 関連: **#14 W2-02**（新規登録）— 相互リンク（未登録の方 → `/register`）。ページ実体はプレースホルダのままでリンク破綻はしない。

## やること
- [ ] **`src/features/auth/api/useLogin.ts` を新規作成**
  - `getCsrfCookie()`: `GET {API ルートから見た `/sanctum/csrf-cookie`}` を呼ぶ関数。`NEXT_PUBLIC_API_URL` が `http://localhost:8000/api` の場合、Sanctum の CSRF エンドポイントは **`/api` の外**（`http://localhost:8000/sanctum/csrf-cookie`）にあるため、`API_URL` の origin を抜き出して `/sanctum/csrf-cookie` を組み立てるユーティリティを用意する（`apiFetch` の `baseUrl` オプションで origin を渡す）。
  - `loginRequest(input)`: `apiFetch("/login", { method: "POST", json: input, headers: { "X-XSRF-TOKEN": readXsrfCookie() } })` を呼ぶ。Sanctum は `POST` 系で `X-XSRF-TOKEN` ヘッダを要求する（`XSRF-TOKEN` cookie は非 httpOnly なので JS から読める）。**この XSRF ヘッダ付与は `useLogin` 内のヘルパで完結させる**（`apiFetch` は認証非依存のままにする）。
  - `useLogin()`: TanStack Query の `useMutation`。`mutationFn` は `getCsrfCookie() → loginRequest() → queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })`。
  - 422 の `fields` は `LoginForm` 側で扱えるよう `ApiError` をそのまま throw する。**認証失敗（401/422）はフォーム全体エラー「メールアドレスまたはパスワードが正しくありません」に集約**し、フィールド別メッセージにはしない（Issue 要件）。
- [ ] **`src/features/auth/api/useLogin.test.ts` を新規作成**
  - `fetch` をモックし、以下を検証:
    - CSRF エンドポイント → `/login` の順で呼ばれる（2 回目のリクエストに `X-XSRF-TOKEN` ヘッダが載る）
    - 成功時に `queryKeys.auth.me` が invalidate される
    - 401 / 422 で `ApiError` が throw される
- [ ] **`src/features/auth/components/LoginForm.tsx` を新規作成**（`"use client"`）
  - shadcn `Form` / `FormField` / `Input` / `Button` を利用。
  - `useForm<LoginInput>({ resolver: zodResolver(loginSchema) })`。
  - `useLogin()` の `mutate` を `handleSubmit` から呼ぶ。
  - `isPending` 中は Submit ボタンを disabled（二重送信抑止）。
  - **エラー表示**:
    - 401 / 422 → フォーム上部に `role="alert"` で「メールアドレスまたはパスワードが正しくありません」を表示。フィールド別エラーは出さない。
    - ネットワークエラー / 500 → 汎用トースト（sonner）で通知。
  - **成功時**: `useSearchParams()` から `redirect` を取得し、値があれば `router.push(redirect)`、無ければ `router.push("/dashboard")`。
    - **セキュリティ**: `redirect` は open redirect を防ぐため「`/` で始まり `//` で始まらない相対パス」のみ許可（バリデーションを 1 か所に集約）。
  - パスワード欄は `type="password"`、`autoComplete="current-password"`、メール欄は `autoComplete="username"`（パスワードマネージャ対応）。
  - リンク: 「新規登録はこちら」→ `/register`、「パスワードをお忘れの方」→ `#`（未実装のため `aria-disabled` またはコメントアウト、要確認）。
- [ ] **`src/features/auth/components/LoginForm.test.tsx` を新規作成**
  - RTL でレンダリングし、以下を検証:
    - 空 submit → Zod のバリデーションエラーが表示される
    - 401 レスポンス（`useLogin` をモック）→ 「メールアドレスまたはパスワードが正しくありません」が `role="alert"` で表示される
    - 送信中はボタンが disabled
- [ ] **`src/app/(auth)/login/page.tsx` を刷新**
  - Server Component のまま。ヘッダー（ロゴ）とセンター寄せカードを配置し、`<LoginForm />` を差し込む。
  - `export const metadata: Metadata = { title: "ログイン | ことづて" }`。
  - `(auth)` グループ用の `layout.tsx` は無いため、必要なら中央寄せの min-h スタイルを `page.tsx` に直書きする（もしくは `(auth)/layout.tsx` を新規追加するかは要確認 → リスク欄）。
- [ ] **E2E `e2e/auth-login.spec.ts` を追加**（success / fail 各 1 件）
  - `page.route()` で `/sanctum/csrf-cookie` / `/login` / `/user` をモックする方式でユニット的に検証（実 API を立てない前提）。
  - success: モックで `/login` を 204 → `/user` を 200 で返し、`/dashboard`（または `redirect` 先）に遷移することを確認。
  - fail: モックで `/login` を 401（`{ message: "..." }`）で返し、「メールアドレスまたはパスワードが正しくありません」が表示されること、URL が `/login` のままであることを確認。
- [ ] **コード検索で認証情報の保持がないことを確認**
  - `rg -n "localStorage|sessionStorage" src/features/auth src/app/\(auth\)` が 0 件であることを PR に記載。
- [ ] `npm run lint` / `npm run typecheck` / `npm run test` / `npm run test:e2e` がすべて緑になることを確認。

## 完了条件（DoD）
Issue 記載の DoD:
- [ ] Playwright で success / fail を最低 1 件ずつ
- [ ] httpOnly クッキー以外に認証情報を保持していない（コード検索で確認）

補足（本 plan で追加）:
- [ ] `npm run lint` / `npm run typecheck` が緑
- [ ] Vitest（`useLogin.test.ts`, `LoginForm.test.tsx`）が緑
- [ ] 送信中はボタンが disabled で二重送信されない（テスト or 手動確認）
- [ ] `redirect` パラメータが相対パスの場合のみ受理される（open redirect 対策）

## リスク / 確認事項
- **CSRF エンドポイントの URL 組み立て**: `NEXT_PUBLIC_API_URL=http://localhost:8000/api` に対し、Sanctum の CSRF は `http://localhost:8000/sanctum/csrf-cookie`（`/api` プレフィクスの外）。以下いずれかで対応:
  - (A) `useLogin` 内で `new URL("/sanctum/csrf-cookie", API_URL).origin` からベースを組み立て、`apiFetch(path, { baseUrl })` を使う。**推奨**。
  - (B) 別の環境変数 `NEXT_PUBLIC_API_ORIGIN` を追加する（`.env.example` の変更が必要）。
  - → **(A) を推奨**（既存 env を変えない、Issue のスコープ内）。
- **`X-XSRF-TOKEN` ヘッダ付与ロジックの置き場所**: `apiFetch` に組み込むと `useMe` などの GET にも載ってしまい認証以外の feature を変える。**まずは `useLogin` 内のみで扱う**（POST/PUT/DELETE を扱う feature が増えた時点で `apiFetch` に昇格させる）。
- **`redirect` パラメータの検証範囲**: 相対パスのみ許可（`/foo` OK、`//evil.com`・`https://…` は NG）。実装は `LoginForm.tsx` 内に閉じる。
- **`(auth)` グループの共通レイアウト**: 現在 `(auth)/layout.tsx` が無い。ログイン・登録で共通の中央寄せカードにするなら `(auth)/layout.tsx` を新規追加すると綺麗だが、Issue のスコープは `/login` のみ。**page.tsx にセンター寄せを直書きし、`(auth)/layout.tsx` は #14（W2-02 新規登録）で追加する**方針で良いか確認したい。
- **E2E の API モック方針**: `playwright.config.ts` は `npm run dev`（フロントのみ）を起動する。実 API を立てずに `page.route()` でネットワークをスタブする方針で進める。**もし将来的にコンパクトな msw 導入や docker-compose 連携が必要になれば別 Issue とする**。
- **`useMe` の `/user` エンドポイント**: Laravel 側の実 API パスが `/api/user` か `/user` か未確定（Sanctum の Fortify 既定は `/user`）。`useMe.ts` は `apiFetch("/user")` を使っており `NEXT_PUBLIC_API_URL` に `/api` が含まれるので実際は `/api/user` を叩く。**このまま踏襲**する（本 Issue で変更しない）。
- **パスワード忘れリンク**: `/password/reset` は未実装 Issue。`aria-disabled` にするかコメントアウトするかは仕様任せ。**推奨は `aria-disabled` かつ `href="#"` で「準備中」ツールチップ**（画面設計書に沿う）。
- **ログアウト / UserMenu / 401 自動リダイレクト** は #15 のスコープ。本 Issue では触れない。

## 参照
- `CLAUDE.md`
- `docs/frontend_design.md`（認証 / 状態管理 / API 通信の章）
- `docs/screen_spec.md` §5「ログイン `/login` ／ 新規登録 `/register`」
- `docs/requirements.md`（認証章）
- Laravel Sanctum 公式（SPA 認証の CSRF プリフライト仕様）
