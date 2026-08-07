# Issue #14 — W2-02 [F-01] 新規登録画面（8 文字以上・確認入力・Zod）

- URL: https://github.com/hasedai0000/kotozute-web/issues/14
- ラベル: frontend, week-2
- マイルストーン: MVP-Week2

## Issue 概要
`/register` に「氏名 / メール / パスワード（8 文字以上）/ 確認用パスワード」の登録フォームを実装する。ログイン（#13）と同じ Sanctum SPA フロー（CSRF プリフライト → `POST /register` → `useMe` を invalidate）で、成功時に `/dashboard` へ遷移。バックエンドが登録直後に `families` を 1 件自動作成（本人=owner）する前提。認証情報はフロントに保持しない（クッキーのみ）。

## 調査結果

### 関連ドキュメント
- `docs/screen_spec.md` §5「ログイン `/login` ／ 新規登録 `/register`」— 中央 1 カラムのカード、Zod 検証、Sanctum SPA 認証、二重送信抑止、成功後は元 URL があればそちら、無ければ `/dashboard`。**登録直後に `families` を 1 件自動作成（本人=owner）**。
- `docs/frontend_design.md` — 認証（Sanctum SPA・クッキー）／`AuthProvider` で配布／`credentials: 'include'`／トークンをフロントで保持しない。
- `CLAUDE.md` — 絶対ルール 2「サーバ状態は TanStack Query が唯一の真実」、4「トークンをフロントで保持しない」、features 単位で分割。

### 関連コード（#13 で敷かれた土台をそのまま踏襲）
- `src/features/auth/schema/login.ts` — 既存の Zod スキーマ。**`register.ts` は同じ書き味で新規作成**。
- `src/features/auth/api/useLogin.ts` — 既存。`resolveApiOrigin()` / `readXsrfToken()` / `getCsrfCookie()` を内包。**`useRegister` は同じ CSRF フローを再利用したいので、この 3 つを `src/features/auth/api/sanctum.ts` に抽出してから使い回す**（下記「リスク」参照）。
- `src/features/auth/api/useLogin.test.ts` — Vitest の fetch モック手法（`vi.stubGlobal("fetch", ...)`）。**`useRegister.test.ts` の雛形として踏襲**。
- `src/features/auth/components/LoginForm.tsx` — `useForm` + `zodResolver`、401/422/419 を `formError` に集約、送信中は `aria-busy` + disabled、`sanitizeRedirect()` で open redirect 対策。**`RegisterForm.tsx` は同じ構造で組み立てる**。
- `src/features/auth/components/LoginForm.test.tsx` — RTL のパターン。空 submit / 送信中 disabled / 資格情報エラー / redirect の各ケース。**`RegisterForm.test.tsx` に転用**。
- `src/app/(auth)/register/page.tsx` — 現状プレースホルダ（`<h1>新規登録</h1>` のみ）。**全面刷新**。
- `src/app/(auth)/login/page.tsx` — 中央寄せカードのマークアップは既にここに直書き。**`register/page.tsx` にも同じレイアウトを直書きする**（`(auth)/layout.tsx` は今回も作らない → リスク欄）。
- `src/lib/api/client.ts` — `apiFetch()`（`credentials: 'include'`、`Accept: application/json`、`X-Requested-With: XMLHttpRequest`）。流用。
- `src/lib/api/errors.ts` — `ApiError.fields` に Laravel 422 のフィールドエラーが乗る。**登録では 422 の `errors.email` を「メールアドレスは既に登録されています」等の文言でフィールド別に出す**（ログインとの差分。ここが最大の分岐）。
- `src/lib/query/queryKeys.ts` — `queryKeys.auth.me`。登録成功後に invalidate する対象。
- `src/providers/AuthProvider.tsx` — `useMe()` をマウント。invalidate 後に自動で `/user` を再取得しユーザーが配布される。
- `src/middleware.ts` — `(app)` 配下を守り、`?redirect=` を付ける（#9 で実装済み）。**`/register` は認証不要エリアなのでガード対象外**。
- `e2e/auth-login.spec.ts` — Playwright の API モック手法（`page.route()` で `/sanctum/csrf-cookie` / `/login` / `/user` / `/dashboard` をスタブ）。**`e2e/auth-register.spec.ts` に転用**。
- `playwright.config.ts` — `webServer: npm run dev`（フロントのみ起動、実 API は立てない）。

### 依存関係
- 先に必要: **#13 W2-01（ログイン画面）— CLOSED 済み**。CSRF / XSRF ヘッダ / `apiFetch` / `AuthProvider` / `useMe` invalidate / `(auth)` 配下のカードレイアウト、すべて敷かれている。
- 先に必要: **#9 W1-09（AuthProvider + useAuth + middleware ガード）— CLOSED**。
- 先に必要: **#6 W1-06（RHF + Zod 導入）— CLOSED**。
- 関連（後続）: **#15 W2-03**「AuthProvider にユーザー配布 + 未認証時 `/login` 戻し」— 本 Issue の範囲外。
- API 側依存: **`POST /register` エンドポイント**（Fortify 相当）が `kotozute-api` 側で有効であること。**要ヒアリング**（リスク欄）。

## やること

- [ ] **`src/features/auth/api/sanctum.ts`（新規）に CSRF 関連を抽出**
  - `resolveApiOrigin()` / `readXsrfToken()` / `getCsrfCookie()` を `useLogin.ts` から移動し、両フックから import して使う。
  - `useLogin.ts` は import 差し替えのみで挙動不変。既存の `useLogin.test.ts` が緑のままなことを確認。
- [ ] **`src/features/auth/schema/register.ts` を新規作成**
  - `name`: 必須（trim 後の空文字禁止）、上限 100。
  - `email`: 必須 + `email()` バリデーション。
  - `password`: 必須 + `min(8, "パスワードは 8 文字以上で入力してください")`。
  - `passwordConfirmation`: 必須。
  - `.refine((v) => v.password === v.passwordConfirmation, { path: ["passwordConfirmation"], message: "パスワードが一致しません" })`。
  - `RegisterInput = z.infer<typeof registerSchema>`。日本語エラーメッセージは `login.ts` と揃える。
- [ ] **`src/features/auth/schema/register.test.ts` を新規作成（DoD 必須 3 件）**
  - 必須未入力（`name` / `email` / `password` の少なくとも 1 つが空）でエラー。
  - `password` が 7 文字以下でエラー（メッセージも検証）。
  - `password !== passwordConfirmation` でエラー（`path` が `passwordConfirmation` になっていることも検証）。
- [ ] **`src/features/auth/api/useRegister.ts` を新規作成**
  - `registerRequest(input)`: `apiFetch<void>("/register", { method: "POST", json: { name, email, password, password_confirmation }, headers: { "X-XSRF-TOKEN": readXsrfToken() ?? undefined } })`。
    - **Laravel Fortify の payload キーは snake_case（`password_confirmation`）**。フロントのスキーマは camelCase (`passwordConfirmation`) のままにし、送信時にマッピングする。
  - `useRegister()`: `useMutation`。`mutationFn = getCsrfCookie() → registerRequest() → queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })`。
  - 422 の `ApiError` はそのまま throw し、フォーム側で `fields` を解釈する。
- [ ] **`src/features/auth/api/useRegister.test.ts` を新規作成**
  - CSRF → `/register` の順で呼ばれ、2 回目に `X-XSRF-TOKEN` が載る。
  - リクエストボディが `password_confirmation` に変換されている（`passwordConfirmation` を送っていない）。
  - 成功時に `queryKeys.auth.me` が invalidate される。
  - 422（`errors.email = [...]`）で `ApiError.fields.email` が保持される。
- [ ] **`src/features/auth/components/RegisterForm.tsx` を新規作成**（`"use client"`）
  - `useForm<RegisterInput>({ resolver: zodResolver(registerSchema) })`。
  - フィールド: 氏名 / メール / パスワード / パスワード（確認）。
    - `name`: `autoComplete="name"`。
    - `email`: `type="email"`, `autoComplete="email"`。
    - `password`: `type="password"`, `autoComplete="new-password"`。
    - `passwordConfirmation`: `type="password"`, `autoComplete="new-password"`。
  - `useRegister()` の `mutateAsync` を submit で呼ぶ。`isPending` 中はボタン disabled + `aria-busy`。
  - **エラー表示（ログインとの差分）**:
    - 422 でフィールド別エラー（`ApiError.fields.email` など）が返れば `form.setError("email", { message: ... })` に流し込む。
    - 上記に該当しない 422（グローバル `message` のみ）や 500 / ネットワークエラーは sonner の `toast.error` で通知（`GENERIC_ERROR_MESSAGE`）。
    - 認証成立にまつわる文言（"どちらが誤りか明かさない"）は登録には不要。
  - **成功時**:
    - `useSearchParams()` から `redirect` を取り、`sanitizeRedirect()`（`LoginForm.tsx` の同名関数を `src/features/auth/lib/redirect.ts` に共通化してから両方で使う）で相対パスのみ受け入れ、無ければ `/dashboard`。
    - `router.push(redirectTo)`。`useMe` の invalidate は `useRegister` の `onSuccess` で完了済み。
  - パスワード欄の下に注意書き: 「暗証番号やマイナンバー番号はサービスに保存しません」（screen_spec §5 の安心の説明を反映）。
  - リンク: 「既にアカウントをお持ちの方 → `/login`」。
- [ ] **`src/features/auth/components/RegisterForm.test.tsx` を新規作成**
  - 空 submit で Zod エラー 4 件が出る（氏名・メール・パスワード・確認）。
  - パスワード不一致でエラーが `passwordConfirmation` フィールドに紐づく。
  - 422（`errors.email`）で `email` フィールドに API のメッセージが表示される。
  - 送信中はボタン disabled。
  - 成功時 `/dashboard` に遷移（`redirect` 未指定）。
  - `redirect=/notebook` で `/notebook` に遷移。`redirect=//evil.com` は無視され `/dashboard`。
- [ ] **`src/features/auth/lib/redirect.ts`（新規）に `sanitizeRedirect` を抽出**
  - `LoginForm.tsx` の同名インライン関数も import に差し替える。**#13 の挙動を変えないこと**（既存テストが緑のまま）。
- [ ] **`src/app/(auth)/register/page.tsx` を刷新**
  - Server Component。`metadata: { title: "新規登録 | ことづて", description: "ことづての新規登録を行います。" }`。
  - `LoginPage` と同じ中央寄せカード（ロゴ・見出し・説明文・`<Suspense>` で `<RegisterForm />`）。
  - 説明文（例）: 「メールアドレスとパスワードでアカウントを作成します」。
- [ ] **E2E `e2e/auth-register.spec.ts` を新規追加**（DoD: 成功フロー 1 件）
  - `page.route()` で `/sanctum/csrf-cookie` / `/register` / `/user` / `/dashboard` をスタブ。`/register` は POST のみ 204 で返す。
  - success: フォーム記入 → `ログイン` … ではなく `登録する`（あるいは実際のボタン文言）押下 → `/dashboard` に遷移することを確認。
  - 余裕があれば 422 の失敗パスも 1 件（メールアドレス重複想定）。
- [ ] **CLAUDE.md 絶対ルール検証**
  - `rg -n "localStorage|sessionStorage" src/features/auth src/app/\(auth\)` が 0 件のまま。
  - `useState` にサーバ状態を写していない。
- [ ] `npm run lint` / `npm run typecheck` / `npm run test` / `npm run test:e2e` が全て緑。

## 完了条件（DoD）
Issue 記載の DoD:
- [ ] Zod バリデーションの unit テスト 3 件（必須未入力 / 短いパスワード / 不一致確認）
- [ ] Playwright で成功フロー 1 件

補足（本 plan で追加）:
- [ ] 422（メール重複など）でフィールド別エラーが出る（テストで検証）
- [ ] `/register` 送信時のペイロードが `password_confirmation`（snake_case）で送られている
- [ ] 送信中はボタンが disabled + `aria-busy`
- [ ] 登録成功後、`useMe` が再取得され `AuthProvider` にユーザーが配布される
- [ ] `redirect` パラメータが相対パスのみ受理される（open redirect 対策）
- [ ] `npm run lint` / `npm run typecheck` / `npm run test` / `npm run test:e2e` が緑

## リスク / 確認事項
- **`getCsrfCookie` の抽出タイミング**: 現状 `useLogin.ts` に閉じている。`useRegister` でも必要になるため `src/features/auth/api/sanctum.ts` に抽出したい（DRY）。既存テスト（`useLogin.test.ts`）は import 先が変わっても中身は同じなので緑を維持できるはず。**この小リファクタを本 Issue に含めてよいか要確認**。含めない場合は `useRegister.ts` に同じロジックを重複させることになる。
- **`sanitizeRedirect` の共通化**: 同じく `LoginForm.tsx` にインラインで持っているものを `src/features/auth/lib/redirect.ts` に移す小リファクタ。挙動不変。**含めてよいか要確認**。
- **API 側 `/register` エンドポイントの実在確認**: Laravel Fortify を有効化していれば `POST /register`（`name`, `email`, `password`, `password_confirmation`）で families 自動作成まで動く前提。**kotozute-api 側の実装状況（Fortify 有効化 / 登録時 families 作成のカスタム処理）が済んでいるか要確認**。未実装なら E2E の実 API 疎通は本 Issue のスコープ外とし、Playwright はモックのみで完結させる（今の方針と同じ）。
- **登録成功後のリダイレクト**: 通常は `/dashboard` へ。**招待経由（`/invitations/[token]` から `/register` に飛ばされたケース）で `redirect` に招待受諾 URL が入る可能性がある**が、招待フローは別 Issue（#16 あたり）。本 Issue では `redirect` を相対パスとして扱うのみで招待固有ロジックは入れない。
- **利用規約 / プライバシーポリシー チェックボックス**: Issue 本文には無いが、screen_spec §5 にも明示されていない。**MVP は入れない**方針で進めるが、後追いの追加要望があれば別 Issue。
- **`(auth)/layout.tsx` の共通化**: `/login` と `/register` で同じ中央寄せカードを直書きする状態が続く。#13 でも「必要になった時点で `(auth)/layout.tsx` に切り出す」方針だった。**本 Issue で切り出すか、次以降に持ち越すか要確認**（推奨: 次以降。差分を最小に）。
- **`useMe` の重複 invalidate**: `useRegister` の `onSuccess` で invalidate 済みなので、`RegisterForm` 側で `AuthContext.refetch()` を追加で呼ぶ必要はない。ログインと同じ流儀に揃える。
- **ログアウト / UserMenu / 401 自動リダイレクト** は #15 のスコープ。本 Issue では触れない。

## 参照
- `CLAUDE.md`
- `docs/frontend_design.md`（認証 / 状態管理 / API 通信の章）
- `docs/screen_spec.md` §5「ログイン `/login` ／ 新規登録 `/register`」
- `docs/issues/13/plan.md`（本 Issue と同じフローの先行実装）
- Laravel Fortify（`/register` の payload 仕様）
