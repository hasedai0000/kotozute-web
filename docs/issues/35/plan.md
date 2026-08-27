# Issue #35 — W4-05 [F-08] 招待受諾（ログイン済み → 参加 → dashboard、期限切れ表示）

- URL: https://github.com/hasedai0000/kotozute-web/issues/35
- ラベル: frontend, week-4
- マイルストーン: MVP-Week4

## Issue 概要
#34 で作った `/invitations/[token]` の**有効 + ログイン済み**分岐を本実装する。screen_spec §6 準拠で「◯◯さんからノートの共有に招待されています」と招待者名を表示し、「参加する」ボタンで `useAcceptInvitation` を呼び出して `/dashboard` へ着地させる。招待メールと異なるアカウントでログイン中の場合はアカウント切り替えを促す注意を表示する。無効ケース（expired / used / not_found）と未ログイン導線は #34 で完成済みなので触らない。受諾の `audit_logs` 書き込みはバック側が担う。

## 調査結果

### 関連ドキュメント
- `CLAUDE.md` 絶対ルール —
  1. **features 単位で割る**：受諾 mutation は `src/features/family/api/useAcceptInvitation.ts`、受諾 UI（参加ボタン + アカウント警告）は `src/features/family/components/AcceptInvitationForm.tsx` に置く。`src/app/invitations/[token]/page.tsx` は RSC の分岐と props 受け渡しに専任させる。
  2. **サーバ状態は TanStack Query が唯一の真実**：受諾は mutation として TanStack Query に載せる。成功時に `queryKeys.auth.me`（新参加者の role 反映）と `queryKeys.notebook.summary` を invalidate し、`/dashboard` 到達時に最新化された状態で描画する。**受諾結果を `useState` に写し取らない**。
  4. **トークンをフロントで保持しない**：Sanctum SPA 認証。**招待トークン**は URL パラメータで扱う（#34 と同じ扱い）。受諾 POST では `X-XSRF-TOKEN` ヘッダを付与（`useInvite` / `useRevokeMember` と同流儀）。
  5. **デザイントークンを使う**：Tailwind theme。直値の色コードは書かない。#34 の `CardShell` レイアウト（`w-full max-w-md space-y-6 rounded-2xl border bg-background p-8 shadow-sm`）と揃える。
- `docs/screen_spec.md` §6 招待の受諾 — 本 Issue の一次仕様。
  - 「**有効な場合**：招待者の表示名と『◯◯さんからノートの共有に招待されています』を表示」← DoD の中核
  - 「ログイン済み → `参加する` ボタン → `family_members` に追加 → `/dashboard`」← DoD 1
  - 「**招待メールと異なるアカウントでログイン中の場合は注意を表示し、切り替えを促す**」← Issue 作業内容 3
  - 「受諾は `audit_logs` に記録」← バック側担当（フロントは特別な処理不要、POST 経由で自動記録される想定）
- `docs/screen_spec.md` §共通仕様「ロールによる出し分け」— 受諾直後は family ロール。owner との判定は #36 の `useIsOwner` で扱う。**本 Issue は受諾フローのみで、dashboard 側の family 表示は触らない**（DoD 1 の「ダッシュボードに家族としての表示が出る」は `useMe` の role 反映で自然に満たされる想定）。
- `docs/screen_spec.md` §共通仕様「状態の出し分け」— 保存中は楽観的更新で即時反映。**ただし受諾は完了して初めて `/dashboard` へ遷移する遷移型 mutation なので楽観的更新は行わない**。ボタンを `pending` で disabled にし、失敗時はトースト。
- `docs/frontend_design.md` §画面とパス — 招待受諾フロー：「`/invitations/[token]` → 未ログインならログイン／登録 → 受諾で `family_members` に追加 → `/dashboard`」。本 Issue は最後の「受諾で `/dashboard`」部分を担う。
- `docs/frontend_design.md` §API 通信と型 — Scramble → openapi-typescript の自動生成が原則。受諾エンドポイントは未定義想定なので **手書き型 + `TODO(#35+)`** で進める（`useAcceptInvitation` は `useInvite` / `useRevokeMember` と同じ流儀）。
- `docs/frontend_design.md` §認証 — Sanctum SPA。受諾 POST 前に CSRF cookie は取得済み想定（ログイン済みユーザーが到達している）。`readXsrfToken()` で `X-XSRF-TOKEN` ヘッダを付与する既存パターンを踏襲。
- `docs/frontend_design.md` §セキュリティ — 「死・不安を煽らない」トーン。招待者名は「◯◯さん」の敬称を付ける。アカウント違いの警告文言は簡潔に。

### 関連コード
- `src/app/invitations/[token]/page.tsx:150-170` — **本 Issue で書き換える対象**。現状は「有効 + ログイン済み」で `<Button disabled data-testid="accept-invitation">参加する（準備中）</Button>` のプレースホルダ。ここを client component の `<AcceptInvitationForm>` に置き換える。**無効ケース分岐 (line 81-111) と未ログイン分岐 (line 117-148)、エラー分岐 (line 60-79) は変更しない**。
- `src/features/family/api/verifyInvitation.ts:11-21` — **拡張対象**。`InvitationVerificationResult` の valid ケースに `invitedEmail?: string` を追加する。バック側が返す想定（アカウント違い警告に必要）。返さない場合は `undefined` → 警告を出さない safe default。**破壊的変更ではない**（呼び出し元は現状 page.tsx 1 箇所のみ）。
- `src/features/family/api/verifyInvitation.test.ts:42-56` — `invitedEmail` を追加したケースを 1 件追加する。既存 9 テストは変更不要。
- `src/features/auth/api/useMe.ts:8-14` — `AuthUser.email` を使ってアカウント違い判定。`useMe()` で client component 側から取得（RSC で cookies 転送して SSR fetch する案もあるが、既に `AuthProvider`（Context）で全画面に配られているため client で拾う方が薄い）。
- `src/providers/AuthProvider.tsx` — `AuthProvider` は `(app)` 配下でのみ提供されている想定。**`/invitations/[token]` は公開エリア（`(app)` 外）なので `AuthProvider` の Context は使えない**。→ `AcceptInvitationForm` 内で **`useMe()` を直接呼ぶ**（`useMe` は `AuthProvider` 非依存で動く）。
- `src/features/family/api/useInvite.ts:1-25` — POST mutation の手書き型 + `X-XSRF-TOKEN` ヘッダ + `apiFetch` の見本。`useAcceptInvitation` はこれの薄い焼き直し。
- `src/features/family/api/useRevokeMember.ts:26-55` — mutation + `qc.invalidateQueries` + `toast.error` の見本。ただし受諾は「別ユーザー視点」なので `queryKeys.family.members` の invalidate は不要（新参加者は owner ではないので family/members ページを持たない）。
- `src/features/auth/api/sanctum.ts` — `readXsrfToken()`。受諾 POST の `X-XSRF-TOKEN` ヘッダに使う。
- `src/lib/api/client.ts` — `apiFetch`。`credentials: 'include'` でセッション cookie 自動送信。
- `src/lib/api/errors.ts` — `ApiError`。受諾失敗時のステータス別分岐に使う（401/419: 再ログイン誘導、410/409: 招待失効表示）。
- `src/lib/query/queryKeys.ts:5-7` — `queryKeys.auth.me = ["auth", "me"]`。受諾成功後に invalidate → dashboard 到達時に最新 role で描画される。
- `src/features/family/components/InviteDialog.tsx` — Dialog + Button + useMutation の RHF 統合例。**本 Issue はフォーム入力を持たない**（token は URL、submit ボタン 1 個のみ）ため RHF は使わず、素の `<Button onClick={...}>` で十分。
- `src/components/ui/button.tsx` — `<Button>` / `buttonVariants`。`disabled` 状態と variant 切替に使う。
- `e2e/auth-login.spec.ts:1-50` — Playwright の CSRF cookie / `USER_URL_RE` / route mock パターン。招待受諾 E2E で流用する。
- `e2e/family-invite.spec.ts:1-80` — `laravel_session` cookie 注入 + user/summary/family API stub の見本。招待受諾 E2E の「ログイン済み」セットアップで流用する。

### 依存関係
- **先行**：#34 W4-04（招待受諾：トークン検証・未ログイン → login 経由の戻し）— **マージ済み**（`0395c1d Merge pull request #74 from hasedai0000/feature/w4-04-invitation-verify`）。`verifyInvitation` / `hasSessionCookieFromCookies` / `page.tsx` の骨格が既に存在する前提。
- **並列 / 独立**：
  - #36 W4-06（家族ロールの閲覧専用モード）— 受諾後 dashboard で family ロールを判定する `useIsOwner` は #36。**本 Issue は「受諾して `/dashboard` に着地する」まで**で、その先の role 分岐は #36 に譲る。DoD 1「家族としての表示が出る」は `useMe` の `role: "family"` が反映されれば最低限満たされる（Header のユーザーメニュー等、既存の役割表示）。
  - #38 W4-08（Playwright E2E: 記入 → 家族招待 → 家族閲覧）— **本 Issue で追加する `e2e/invitation-accept.spec.ts` は受諾フロー単体**の 1 スペック。#38 の「記入 → 招待 → 別セッションで受諾 → family として閲覧」の end-to-end とは別レイヤー。#38 側で本 Issue の受諾フローを部分的に使う想定。
- **参照のみ（バック側 API）**：
  - `POST /invitations/{token}/accept`（想定）— 未整備の想定。**手書き型 + TODO(#35+)** で進める。成功時 200 で `{ familyId, memberId, role: "family" }` 相当を返す想定（本 Issue のフロントは body を使わないので `void` 型で受ける）。
  - `GET /invitations/{token}/verify` — 本 Issue で `invitedEmail?` フィールドを追加する。**バック側の Issue と同期する必要あり**（要ユーザー確認）。
  - `GET /user` — 既存 `useMe`。ログイン済み受諾ページでアカウント違い判定に使う。

## やること

### 1. verifyInvitation を拡張して `invitedEmail?` を返す
- [ ] `src/features/family/api/verifyInvitation.ts:11-21` の `InvitationVerificationResult` の valid ケースに `invitedEmail?: string` を追加
- [ ] `src/features/family/api/verifyInvitation.ts:32-47` の `parseBody` で valid ケースに `invitedEmail` パースを追加（`typeof body.invitedEmail === "string" ? body.invitedEmail : undefined`）
- [ ] **invalid ケース（expired / used / not_found）では絶対に返さない** — 現状の実装で valid 分岐にしか含めないので自然に守られる。念のためテストで担保
- [ ] `src/features/family/api/verifyInvitation.test.ts` に「valid に `invitedEmail` が含まれる」ケースを 1 件追加、「expired に `invitedEmail` が含まれない」ことを明示

### 2. `useAcceptInvitation` mutation を新設（`src/features/family/api/useAcceptInvitation.ts`）
- [ ] `POST /invitations/{token}/accept` を叩く関数 `acceptInvitation(token: string): Promise<void>` を実装
  - `apiFetch<void>` + `method: "POST"` + `X-XSRF-TOKEN` ヘッダ（`readXsrfToken()`）
  - `// TODO(#35+): OpenAPI に POST /invitations/{token}/accept が定義され次第、src/types/generated から型を差し替える。` を残す
- [ ] `useAcceptInvitation()` フックを export
  - `useMutation<void, unknown, { token: string }>`
  - `onSuccess`：`queryKeys.auth.me` を invalidate（role 反映）、`queryKeys.notebook.summary` を invalidate（家族視点の summary へ）
  - `onError`：`toast.error` で「参加できませんでした」（詳細ハンドリングは呼び出し側で `ApiError.status` を見て分岐）
  - **`onSettled` で `router.push("/dashboard")` は呼ばない**（router は hook 外なので、component 側で `onSuccess` 後に `router.push` する）
- [ ] `src/features/family/api/useAcceptInvitation.test.ts` を新設
  - 成功時に `POST /invitations/<token>/accept` が叩かれる（URL エンコード確認）
  - `X-XSRF-TOKEN` ヘッダが送られる（cookie に `XSRF-TOKEN` を仕込む）
  - 401 / 419 / 410 / 409 が例外として上がる（呼び出し側で分岐可能）
  - 成功時に `queryKeys.auth.me` が invalidate される

### 3. `AcceptInvitationForm` client component を新設（`src/features/family/components/AcceptInvitationForm.tsx`）
- [ ] `"use client"` を宣言
- [ ] Props: `{ token: string; inviterName: string; familyName?: string; invitedEmail?: string }`
- [ ] `useMe()` で現在ログイン中のユーザーを取得（`AuthProvider` に依存しない — 招待ページは公開エリア）
- [ ] `useAcceptInvitation()` と `useRouter()` を使う
- [ ] レイアウト：
  - タイトル：`「招待の受諾」`
  - 挨拶：`「{inviterName}さんからノートの共有に招待されています」`（`familyName` があれば副文で `「{familyName}」`）
  - **アカウント違い警告**：`me.data && invitedEmail && me.data.email !== invitedEmail` のとき、警告カード（アイコン + 「招待メール `{invitedEmail}` と現在ログイン中のアカウント `{me.data.email}` が異なります」+ 「別アカウントでログインし直す」リンク → `/logout` or 直接 `/login?redirect=/invitations/{token}`）
    - **既定案**：ログアウト経由が必要（Sanctum セッションを破棄しないと別ユーザーでログインできない）。既存 `useLogout` を使ってログアウト → `/login?redirect=/invitations/{token}` へ手動 push
    - **注意**：警告を出すだけで**「参加する」ボタンも並置**する（間違いでなければ強行できるようにする＝screen_spec は「切り替えを促す」であって「禁止する」ではない）
  - CTA：`<Button onClick={handleAccept} disabled={pending}>参加する</Button>`（`data-testid="accept-invitation"` を維持）
  - `handleAccept = () => mutation.mutate({ token }, { onSuccess: () => router.push("/dashboard") })`
- [ ] エラー分岐（`onError` 内で `ApiError.status` を見る、もしくは `error` state から）：
  - 401 / 419（セッション失効）：`toast.error` + `/login?redirect=/invitations/{token}` へ push
  - 410（招待失効）：`toast.error("この招待は無効になりました。")` + `router.refresh()` で verify を再走（無効表示に落ちる）
  - 409（既に参加済み）：`toast.info("既に参加しています。")` + `router.push("/dashboard")`
  - その他：`toast.error` のみ（default で `useAcceptInvitation` 側で出す）
- [ ] `src/features/family/components/AcceptInvitationForm.test.tsx` を新設（RTL + happy-dom）
  - 招待者名が表示される
  - `familyName` があれば表示される
  - `invitedEmail === me.email` のとき警告が**出ない**
  - `invitedEmail !== me.email` のとき警告が**出る**、「参加する」ボタンは有効のまま
  - `invitedEmail` が undefined のとき警告が**出ない**（safe default）
  - `me.data` が undefined（fetch 中）のとき警告が**出ない**（false negative は許容）
  - 参加ボタン押下で mutation が呼ばれる
  - 参加成功で `router.push("/dashboard")` が呼ばれる
  - 401 で `/login?redirect=/invitations/<token>` へ push される
  - 409 で `/dashboard` へ push される
  - 使用ライブラリは既存 `InviteDialog.test.tsx` に合わせる（RTL + `vi.mock("next/navigation")` + `QueryClientProvider`）

### 4. `page.tsx` の valid + logged-in 分岐を差し替え（`src/app/invitations/[token]/page.tsx`）
- [ ] `src/app/invitations/[token]/page.tsx:150-170` の「準備中」プレースホルダを `<AcceptInvitationForm token={token} inviterName={result.inviterName} familyName={result.familyName} invitedEmail={result.invitedEmail} />` に置き換え
- [ ] `import { AcceptInvitationForm } from "@/features/family/components/AcceptInvitationForm"` を追加
- [ ] `Button` の import が他で使われていなければ削る（未使用 import 対策）
- [ ] `CardShell` は継続利用（`<CardShell><AcceptInvitationForm .../></CardShell>` の階層）
- [ ] **無効ケース分岐 / エラー分岐 / 未ログイン分岐は変更しない**（#34 で完成）

### 5. Playwright E2E（`e2e/invitation-accept.spec.ts`）
- [ ] 新規スペックファイルを作成
- [ ] セットアップ：`setSessionCookie` で `laravel_session` を注入、`stubApi` で `/user` / `/note-summary` / `/family/members` / `/family/invitations` をログイン済みユーザーとして返す（`family-invite.spec.ts` の helper を流用 or 独自で最小定義）
- [ ] `/invitations/valid-token/verify` を `200 { status: "valid", inviterName: "山田 太郎", familyName: "山田家", invitedEmail: "taro@example.com" }` で stub
- [ ] `/invitations/valid-token/accept` を `200 {}` で stub（POST のみ）
- [ ] シナリオ 1（DoD 1 のフルパス）：
  - `/invitations/valid-token` に遷移
  - 「山田 太郎さんからノートの共有に招待されています」が表示される
  - 「参加する」ボタンをクリック
  - `/dashboard` に遷移することを assert
- [ ] シナリオ 2（アカウント違い警告）：
  - `/user` が `{ email: "different@example.com" }` を返すよう stub
  - verify が `invitedEmail: "taro@example.com"` を返すよう stub
  - 警告カードが表示される（「アカウントが異なります」等）
  - **強行して参加ボタンを押しても遷移できる**ことを assert（禁止ではない）
- [ ] シナリオ 3（受諾失敗 = 410）：
  - accept が 410 を返す
  - トーストが出る
  - `/dashboard` に遷移**しない**ことを assert
- [ ] **CI での実行想定**：既存 spec と同じ `pnpm exec playwright test` / `npm run test:e2e` で回る

### 6. `queryKeys` の追加検討（必要なら）
- [ ] **既定案**：追加しない。受諾は既存 `queryKeys.auth.me` の invalidate で十分（新参加者はまだ family/members / notebook を持たない）
- [ ] `queryKeys.family.invitations` は owner 側のキーなので invalidate しない
- [ ] **注意**：`queryKeys.notebook.summary` を invalidate すると dashboard 到達時に family 視点の summary が取れる（`always` のみ）。既定案は invalidate する

## 完了条件（DoD）
Issue の DoD を転記:
- [ ] **受諾後にダッシュボードに家族としての表示が出る** — `useAcceptInvitation` 成功 → `queryKeys.auth.me` invalidate → `router.push("/dashboard")` → `useMe` が再 fetch されて `role: "family"` を返す → 既存 Header / dashboard コンポーネントが役割を反映（詳細な family 表示分岐は #36 のスコープ）。E2E シナリオ 1 で `/dashboard` 到達を担保、`useAcceptInvitation.test.ts` で `queryKeys.auth.me` invalidate を担保。
- [ ] **Playwright で 1 件のフル受諾シナリオ** — `e2e/invitation-accept.spec.ts` シナリオ 1（valid + logged-in → 参加 → dashboard）で担保。

Issue「作業内容」の追加確認:
- [ ] 招待者の表示名 + 「◯◯さんからノートの共有に招待されています」— `AcceptInvitationForm` で `inviterName` を props 受け → 挨拶文に埋め込み
- [ ] 「参加する」ボタン → `useAcceptInvitation` → `/dashboard` — 上記フルパスで担保
- [ ] 招待メールと違うアカウントでログイン中の警告 — `invitedEmail !== me.email` で警告カードを描画、E2E シナリオ 2 で担保
- [ ] 受諾を `audit_logs` へ書き込み — **バック側**が `POST /invitations/{token}/accept` の中で担う（フロントは POST を送るだけで自動記録される想定）

## リスク / 確認事項
- **バック API 契約が未確定**：
  - **`POST /invitations/{token}/accept`**：エンドポイント名 / メソッド / レスポンス形式は仮定。実装が違う場合は `useAcceptInvitation` を合わせる。**要ユーザー確認**（バック Issue と同期）。
  - **`GET /invitations/{token}/verify` の `invitedEmail` フィールド**：本 Issue でフロント側の型に追加する。バック側で返さない場合、アカウント違い警告は永遠に出ない（safe default で無効化される）。**要ユーザー確認**：バックで `invitedEmail` を返す実装が入っているか、入る予定か。
- **アカウント違い警告の UX**：screen_spec は「注意を表示し、切り替えを促す」とだけ書いている。**既定案は「警告 + ログアウトリンク + 参加ボタンは有効のまま」**。強行を許すか？例：本人が別メールでも受諾したいケースがある（結婚後に姓・メールが変わった等）。**要ユーザー確認**：警告時に「参加する」ボタンを disabled にすべきか、それとも警告のみで強行可か。
- **ログアウトリンクの実装**：既存 `useLogout` を呼んでから `router.push("/login?redirect=/invitations/{token}")` する必要がある。**要ユーザー確認**：#35 で `useLogout` を呼ぶ「ログアウトして別アカウントでログイン」ボタンを実装するか、それとも警告文言だけに留めてユーザーに手動ログアウトを促すか（Header のメニューから）。既定案は前者（ワンクリックで切り替え可能に）。
- **`AuthProvider` は `(app)` 配下のみ**：`/invitations/[token]` は公開エリアなので `AuthProvider` の Context は使えない。→ `AcceptInvitationForm` で `useMe()` を直接呼ぶ（`useMe` は Provider 非依存で動く）。**問題は `QueryClientProvider` の有無**。`src/providers/QueryProvider.tsx` が root layout で提供されているか要確認。**要ユーザー確認**：もし `(app)` 配下でしか QueryProvider が提供されていない場合、`/invitations/[token]` にも QueryProvider を追加する必要がある。
- **受諾成功後の Race Condition**：`invalidate` は非同期で、`router.push` の後に fetch が完了する可能性がある。dashboard 到達時に古い `me`（role なし）を一瞬見る可能性 → 既定案：許容（fetch 完了ですぐ再レンダーされる）。厳密に整合させたい場合は `await qc.invalidateQueries(...)` を待ってから push する（1〜数百 ms の追加待ち）。**要ユーザー確認**。
- **エラーハンドリングの粒度**：401/419/410/409 の 4 分岐は本 Issue で書くが、実際にバックがどの status で返すかは未確定。既定案：文言は共通トースト、遷移は 401/419 のみ `/login` へ、他は現ページに留まる。**要ユーザー確認**。
- **`data-testid="accept-invitation"`**：#34 が placeholder ボタンに付けた testid。本 Issue でも維持し、Playwright E2E で `locator('[data-testid=accept-invitation]')` で拾う。**変更しない**。
- **`router.refresh()` の副作用**：410 のとき `router.refresh()` で RSC を再走させて「無効です」表示に落とす案。副作用として cookie 再送で verify が再度叩かれる（負荷は軽微）。**要ユーザー確認**：`router.refresh()` を使うか、シンプルにトーストだけ出して同一ページに留まるか。
- **DoD の「家族としての表示」の定義**：`useMe` の role 反映で「Header のユーザーメニュー」等の既存 UI が変わるレベルで満たすと解釈。より深い family 分岐（entry 追加ボタンを消す等）は #36 のスコープ。**要ユーザー確認**：本 Issue の DoD をどこまで厳しく解釈するか。
- **E2E での CSRF スタブ**：`/sanctum/csrf-cookie` を stub して `XSRF-TOKEN` cookie を仕込む必要がある（`auth-login.spec.ts:19-27` と同流儀）。dashboard 到達後に summary/family API を叩くので、そちらも stub 必須。**`family-invite.spec.ts` の `stubBaseApi` を helper 化して共有化する余地あり**が、本 Issue のスコープ外（要相談）。
- **サーバ状態を `useState` に写し取らない絶対ルール**：`AcceptInvitationForm` で verify 結果を props 経由で受けるだけにする（`useState` に格納しない）。mutation の `pending` / `error` state は TanStack Query の内部 state を使う。

## 参照
- `CLAUDE.md`（絶対ルール 1〜5、セキュリティ）
- `docs/frontend_design.md`（§画面とパス／§API 通信と型／§認証／§セキュリティ）
- `docs/screen_spec.md` §6 招待の受諾（本 Issue の一次仕様）、§共通仕様「状態の出し分け」「ロールによる出し分け」
- 既存実装:
  - `src/app/invitations/[token]/page.tsx`（valid + logged-in 分岐を差し替え、他は不変）
  - `src/features/family/api/verifyInvitation.ts`（`invitedEmail?` 追加）
  - `src/features/family/api/useInvite.ts` / `useRevokeMember.ts`（mutation の見本）
  - `src/features/auth/api/useMe.ts`（現ユーザー email 取得）
  - `src/features/auth/api/sanctum.ts`（`readXsrfToken`）
  - `src/lib/api/client.ts` / `errors.ts`（`apiFetch` / `ApiError`）
  - `src/lib/query/queryKeys.ts`（`auth.me` invalidate）
  - `e2e/auth-login.spec.ts` / `e2e/family-invite.spec.ts`（E2E スタブパターン）
- 直前の類似 plan: `docs/issues/34/plan.md`
