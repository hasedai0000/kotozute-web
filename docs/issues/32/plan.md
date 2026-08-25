# Issue #32 — W4-02 [F-07] 招待発行ダイアログ + 招待再送・取り消し

- URL: https://github.com/hasedai0000/kotozute-web/issues/32
- ラベル: frontend, week-4
- マイルストーン: MVP-Week4

## Issue 概要
`/family` から**家族を招待メールで発行**し、招待中の各行から**再送・取り消し**ができるようにする。#31 で描画済みの UI（`FamilyContent` の「家族を招待」ボタン／`InvitationRow` の「再送」「取り消し」ボタン）は現状 no-op（`// TODO(#32)`）なので、本 Issue で `InviteDialog`（React Hook Form + Zod）と 3 本の mutation（`useInvite` / `useResendInvite` / `useRevokeInvite`）を実装し、成功トースト＋楽観的更新で招待中一覧に反映させる。owner ロール限定機能。

## 調査結果

### 関連ドキュメント
- `CLAUDE.md` 絶対ルール —
  1. **features 単位で割る**：mutation は `src/features/family/api/`、ダイアログは `src/features/family/components/`。`src/app/(app)/family/page.tsx` はルーティング専任のまま触らない。
  2. **サーバ状態は TanStack Query が唯一の真実**：発行後の招待中リストは `useInvitations` のキャッシュを `useQueryClient().setQueryData` / `invalidateQueries` で更新する。**新規招待や再送結果を `useState` に写し取らない**。
  3. **トークンをフロントで保持しない**：Sanctum SPA 認証。POST/DELETE は `readXsrfToken()` の値を `X-XSRF-TOKEN` に付与する（既存 `useUpdateMessage.ts:27-30` と同じパターン）。
  5. **デザイントークンを使う**：ダイアログ内のカラー・余白は shadcn/ui + tailwind theme に沿う。直値の色コードを書かない。
- `docs/screen_spec.md` §3 家族・共有管理 —
  - 「**招待中の一覧：メール、有効期限、再送・取り消し**」
  - 「『家族を招待』ボタン → **ダイアログ（メール入力）**」
  - 「**招待：メール形式を検証**。送信で `invitations` を作成し、招待メールを送る」
  - 「**有効期限切れは『期限切れ』表示＋再送**」← 期限切れ行でも再送は可能
  - 「**権限解除（`revoked`）は `ConfirmDialog` で確認**」（※これは #33 のメンバー解除。**招待の取り消しは Confirm 必須と明記なし**だが誤操作防止のため確認を挟むか要検討 → リスク欄）
  - 「**owner は解除・降格できない**」「**家族ロールでは、一覧は閲覧のみ。招待・解除は不可**」
  - 監査「招待・受諾・権限解除は `audit_logs` に記録する」← サーバ側の責務。フロントは POST/DELETE を素直に叩けばよい。
- `docs/screen_spec.md` §共通仕様「状態の出し分け」— **保存中は楽観的更新で即時反映、失敗時ロールバック＋トースト**。オフライン／通信失敗は「保存できませんでした」トースト＋再試行。→ 3 mutation すべてに `onMutate`（前値スナップショット→楽観更新）／`onError`（ロールバック＋`toast.error`）／`onSuccess`（`toast.success`＋サーバ真値へ差し替え）／`onSettled`（`invalidateQueries`）を実装する。
- `docs/frontend_design.md` §状態管理 — サーバ状態は TanStack Query。`queryKeys` は `lib/query/`。**既に `queryKeys.family.invitations` は定義済み**（`src/lib/query/queryKeys.ts:17`）ので流用。
- `docs/frontend_design.md` §UI — 白基調・カード型・角丸。**モーダルは shadcn/ui `Dialog`**。`EntryDialog` / `DeleteAccountDialog` と同じ Form 部品セット（`FormField` / `FormItem` / `FormLabel` / `FormControl` / `FormMessage`）を使う。
- `docs/frontend_design.md` §テスト — Vitest（単体）／Playwright（E2E）。**メール形式検証は Vitest**、**1 件の発行シナリオは Playwright**。

### 関連コード
- `src/features/family/api/useInvitations.ts:1-42` — GET `/family/invitations` を返す既存フック。型 `Invitation = { id, email, expiresAt, status? }` を共有する。**本 Issue の 3 mutation はこの `queryKeys.family.invitations` キーを invalidate / setQueryData する**。
- `src/features/family/components/InvitationRow.tsx:39-56` — 「再送」「取り消し」ボタンは既に描画済みで `onClick` が `// TODO(#32)` の空関数。**本 Issue では `useResendInvite()` / `useRevokeInvite()` を row 内で呼び、`invitation.id` を渡す**。`isPending` を見て `disabled` / ラベル「再送中…」に切り替える。owner 判定（`canManage`）は既に prop 経由で渡っている。
- `src/features/family/components/FamilyContent.tsx:11-41` — 「家族を招待」ボタンの `onClick` が `// TODO(#32)` の空関数。**本 Issue で `useState<boolean>` を追加してダイアログ開閉を制御**（`open` / `setOpen`）、`<InviteDialog open={open} onOpenChange={setOpen} />` を末尾に配置。owner 判定（`canManage`）は既に成立している。
- `src/features/family/components/InvitationsCard.tsx:20-71` — 招待中一覧の描画。**本 Issue では変更不要**（キャッシュを更新すれば自動再レンダされる）。楽観的更新で新規行が即座に見える／revoke 行が即座に消えることを確認。
- `src/lib/query/queryKeys.ts:17` — `family.invitations = ["family", "invitations"] as const`。**既存キーを流用**。追加不要。
- `src/lib/api/client.ts` の `apiFetch<T>` — Sanctum の `credentials: "include"` を強制する薄いラッパー。**mutation はこれ経由で叩く**。204 は `undefined` で解決される。エラーは `ApiError` に整形されて throw される。
- `src/features/auth/api/sanctum.ts:18-30` — `readXsrfToken()`。**POST / DELETE で `X-XSRF-TOKEN` ヘッダに載せる**（`useUpdateMessage.ts:25-30` と同じパターン。GET には不要）。
- `src/features/messages/api/useUpdateMessage.ts:1-91` — 楽観的更新の見本。`onMutate` で `cancelQueries` → 前値スナップショット取得 → `setQueryData` で楽観更新 → context 返却／`onError` でロールバック／`onSuccess` でサーバ真値へ置換／の 4 段は**本 Issue でも同じ流儀**で書く。ただし本 Issue はリスト操作なので詳細キャッシュはなくリストキーのみ扱う。
- `src/features/settings/components/DeleteAccountDialog.tsx:1-187` — **Dialog + React Hook Form + Zod + sonner** の完成形。**`InviteDialog` はこの構造を流用**（Dialog、フォーム構造、`isSubmitting` の握り方、成功時 toast + `handleOpenChange(false)`、失敗時 `toast.error` + フォームエラー表示、`onOpenChange` での `form.reset`）。
- `src/components/layout/ConfirmDialog.tsx:1-77` — 誤操作防止用の汎用確認ダイアログ。**取り消し（revoke）** で使うか要検討（→ リスク欄）。
- `src/components/ui/dialog.tsx` / `src/components/ui/input.tsx` / `src/components/ui/form.tsx` — shadcn/ui 部品。追加なし。
- `src/features/family/components/InvitationRow.test.tsx:1-55` — 既存のロール別 UI 確認テスト。**本 Issue で `onClick` を接続した後も、buttons の描画テストは通り続けること**（回帰しない）。
- `app/layout.tsx:4` — `<Toaster />` は配線済み。`toast.success` / `toast.error` はそのまま使える。
- `e2e/messages-form.spec.ts:1-80` — Playwright の API stub 流儀の見本。`page.route` で `USER_URL_RE` / `SUMMARY_URL_RE` / `FAMILY_MEMBERS_URL_RE` を stub し、`laravel_session` cookie を設定して認証済み状態を作る。**本 Issue の E2E は `/family/invitations` の GET/POST を stub する**同じ流儀で書く。

### 依存関係
- **先行（完了済み）**:
  - #31 W4-01 — `FamilyContent` / `InvitationsCard` / `InvitationRow` / `useInvitations` / `queryKeys.family.invitations` はすべて実装済み（`main` に merged）。本 Issue の実装は**追加のみ**で、既存 UI の構造は変えない。
- **並列 / 独立**:
  - #33 W4-03（メンバーの権限解除 ConfirmDialog）— 対象は `MemberRow`（**招待ではなくメンバー**）。本 Issue とは触るファイルが異なり衝突しない。
  - #34 W4-04 / #35 W4-05（招待受諾）— 送信された招待メール側の受け取り。**フロント本 Issue はメール本文を作らない**（Laravel 側の責務）。
  - #36 W4-06（family ロール閲覧専用）— `canManage` の分岐は既に描画済み。本 Issue でも同じ prop を尊重する。
- **参照のみ**:
  - **バック側 API**（`kotozute-api`）— `POST /family/invitations` / `POST /family/invitations/{id}/resend` / `DELETE /family/invitations/{id}` の実装が必要。**未整備の想定で、フロントは `useInvitations` と同様に手書き型＋TODO コメントで進める**。契約が確定次第 OpenAPI 再生成で置き換える。
  - **メール送信基盤** — サーバ側の責務。フロントは 2xx を受け取ったらトースト＋キャッシュ更新のみ。

## やること

### 1. mutation フック 3 本を新設（`src/features/family/api/`）
- [ ] `useInvite.ts` を新設
  - `type InviteInput = { email: string }`
  - `inviteFamily(input): Promise<Invitation>` — `apiFetch<Invitation>("/family/invitations", { method: "POST", json: input, headers: { "X-XSRF-TOKEN": readXsrfToken() ?? "" } })`
  - `useInvite()` — `useMutation<Invitation, unknown, InviteInput, { previous: Invitation[] | undefined }>`
    - `onMutate`: `cancelQueries(queryKeys.family.invitations)` → 前値取得 → **楽観行を append**（`id: `temp-${Date.now()}``, `email`, `expiresAt: ""`, `status: "pending"`）→ context 返却
    - `onError`: `setQueryData` でロールバック
    - `onSuccess(server)`: **楽観行をサーバ真値に置換**（`temp-` prefix を持つ最後の行を差し替える or リスト全体を invalidate）
    - `onSettled`: `invalidateQueries(queryKeys.family.invitations)`
  - **エラー整形**：`ApiError` で `status === 422 && fields.email?.[0]` の場合は throw のまま呼び出し側（`InviteDialog`）でフォームエラーに設定する（`DeleteAccountDialog.tsx:79-86` と同じ流儀）。それ以外は汎用トースト。
- [ ] `useResendInvite.ts` を新設
  - `type ResendInput = { id: number | string }`
  - `resendInvite(input): Promise<Invitation>` — `apiFetch<Invitation>('/family/invitations/${encodeURIComponent(id)}/resend', { method: "POST", headers: { "X-XSRF-TOKEN": readXsrfToken() ?? "" } })`
  - `useResendInvite()` — `useMutation`
    - `onMutate`: **該当行の `expiresAt` を仮値（now + 7 日 or 現行値のまま）にせず**、`isPending` UI のみで対応（有効期限はサーバ真値を待つほうが安全）→ `cancelQueries` + 前値 snapshot だけ返す
    - `onError`: ロールバック + `toast.error("再送に失敗しました。時間をおいて再度お試しください。")`
    - `onSuccess(server)`: 該当 id の行を `server` に差し替え + `toast.success("招待メールを再送しました。")`
    - `onSettled`: `invalidateQueries(queryKeys.family.invitations)`
- [ ] `useRevokeInvite.ts` を新設
  - `type RevokeInput = { id: number | string }`
  - `revokeInvite(input): Promise<void>` — `apiFetch<void>('/family/invitations/${encodeURIComponent(id)}', { method: "DELETE", headers: { "X-XSRF-TOKEN": readXsrfToken() ?? "" } })`（`apiFetch` は 204 を `undefined` に解決する。`client.ts:63-65`）
  - `useRevokeInvite()` — `useMutation`
    - `onMutate`: **該当 id の行を即座にリストから除去**（楽観削除） → context 返却
    - `onError`: ロールバック + `toast.error("取り消しに失敗しました。時間をおいて再度お試しください。")`
    - `onSuccess`: `toast.success("招待を取り消しました。")`
    - `onSettled`: `invalidateQueries(queryKeys.family.invitations)`
- [ ] 3 本とも共通で `// TODO(#32+): OpenAPI に POST/DELETE /family/invitations が定義され次第、型を差し替える。` を残す

### 2. Zod スキーマ（`src/features/family/schema/invite.ts`）
- [ ] `inviteSchema = z.object({ email: z.string().min(1, "メールアドレスを入力してください").email("メールアドレスの形式が正しくありません") })`
- [ ] `type InviteInput = z.infer<typeof inviteSchema>`
- [ ] `EMPTY_INVITE_VALUES: InviteInput = { email: "" }` を export

### 3. `InviteDialog` コンポーネント（`src/features/family/components/InviteDialog.tsx`）
- [ ] `"use client"`、`DeleteAccountDialog.tsx` の骨格を流用
- [ ] Props: `{ open: boolean; onOpenChange: (open: boolean) => void }`
- [ ] 内部で `useInvite()`、`useForm<InviteInput>({ resolver: zodResolver(inviteSchema), defaultValues: EMPTY_INVITE_VALUES, mode: "onSubmit" })`
- [ ] `handleOpenChange`：閉じるときに `form.reset(EMPTY_INVITE_VALUES)` + `setFormError(null)`
- [ ] レイアウト：`<Dialog>` / `<DialogHeader>`「家族を招待」/ 説明「招待メールを送ります。相手がリンクから参加すると、ノートを閲覧できるようになります。」 / メール入力（`type="email"` / `autoComplete="email"` / `inputMode="email"`）/ 「送信」「キャンセル」
- [ ] `onSubmit`：
  - `await mutation.mutateAsync({ email })`
  - 成功 → `toast.success("招待メールを送信しました。")` + `handleOpenChange(false)`
  - 失敗 → `ApiError` `422` の `fields.email?.[0]` なら `form.setError("email", { message })`。それ以外は `toast.error(GENERIC_ERROR_MESSAGE)` + `setFormError(...)`
- [ ] `isSubmitting = mutation.isPending || form.formState.isSubmitting` でボタン disabled と `aria-busy` を制御
- [ ] `showCloseButton={false}` は不要（招待は取り消し可能な操作）
- [ ] a11y: メールラベル、`FormMessage` によるエラー表示、`role="alert"` の formError 表示

### 4. 既存 UI と接続
- [ ] `FamilyContent.tsx`
  - `useState<boolean>(false)` で `inviteOpen` を持つ
  - 「家族を招待」ボタンの `onClick` → `setInviteOpen(true)`
  - `<InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />` を末尾（`InvitationsCard` の下）に配置
  - `// TODO(#32)` コメントは削除
- [ ] `InvitationRow.tsx`
  - `useResendInvite()` / `useRevokeInvite()` を呼び、`onClick` に接続
  - `resend.isPending` / `revoke.isPending` で該当ボタンを disabled、ラベル「再送中…」「取り消し中…」
  - `// TODO(#32)` コメントは削除
  - **取り消し確認**：`ConfirmDialog` を挟むかは要判断（リスク欄）。**既定案：挟まず即実行**（screen_spec は招待の revoke に Confirm を明記していない、かつ楽観復元と `toast.error` で救済できる）
- [ ] `InvitationsCard.tsx` — **変更なし**（キャッシュ更新で再レンダ）

### 5. テスト（Vitest / React Testing Library）
- [ ] `src/features/family/schema/invite.test.ts` を新設
  - **空文字 → 「メールアドレスを入力してください」**
  - **`"foo"` → 「メールアドレスの形式が正しくありません」**
  - **`"foo@bar.com"` → parse 成功**
  - **前後空白**（`"  foo@bar.com  "`）の扱いを明確化：`z.string().email()` は空白を許容しないため失敗する。UI 側で trim するかスキーマで `.trim()` するか判断（**既定案：`.trim()` をスキーマに入れる**）
- [ ] `src/features/family/api/useInvite.test.ts` / `useResendInvite.test.ts` / `useRevokeInvite.test.ts`
  - `useFamilyMembers.test.ts` / `useInvitations.test.ts` のモック流儀（`vi.mock("@/lib/api")` で `apiFetch` を差し替え）に合わせる
  - **200 で成功** → mutation の返り値が resolve する
  - **422 で `ApiError` が throw** → `err.fields.email` を検証
  - **500 で `ApiError` が throw** → generic トースト側に流す
- [ ] `src/features/family/components/InviteDialog.test.tsx`
  - 無効メール入力 → 送信ボタンでエラーメッセージ表示（無効なメールでエラー表示：**DoD 1**）
  - 有効メール入力 → mutation が呼ばれ、成功で `toast.success` が呼ばれ dialog が閉じる
  - 422 レスポンスでフォームフィールドエラーが表示される（`form.setError`）
- [ ] `src/features/family/components/InvitationRow.test.tsx`
  - 既存 4 ケースはそのまま緑（回帰しないこと）
  - 追加：「再送」クリックで `useResendInvite` の `mutate` が呼ばれる（mock）
  - 追加：「取り消し」クリックで `useRevokeInvite` の `mutate` が呼ばれる（mock）

### 6. E2E（Playwright）
- [ ] `e2e/family-invite.spec.ts` を新設
  - stub 対象：`/(api/)?user`（200 owner）／`/(api/)?family/members`（200 [owner のみ]）／`/(api/)?family/invitations`（GET は 200 [] を返し、POST は 201 で作成した Invitation を返し、以降の GET はその 1 件を含む配列を返す）
  - シナリオ:
    1. `/family` にアクセス → 「まだ招待中の家族はいません」を確認
    2. 「家族を招待」クリック → ダイアログ表示を確認
    3. `newmember@example.com` を入力 → 「送信」クリック
    4. トースト「招待メールを送信しました。」を確認
    5. **招待中一覧に `newmember@example.com` が表示される**（楽観 or invalidate 後の結果）
  - `laravel_session` cookie を事前セット、CSRF cookie も stub
  - `messages-form.spec.ts:1-80` の書き方を踏襲

## 完了条件（DoD）
Issue の DoD を転記:
- [ ] **無効なメールでエラー表示**（`InviteDialog` の Vitest で確認、E2E でも触れる）
- [ ] **再送で有効期限が更新される**（`useResendInvite` の `onSuccess` でサーバ真値の `expiresAt` に置換 → `InvitationRow` が新しい日付を表示することを確認。**API 未整備時は Vitest の mock で resolve する `Invitation` の `expiresAt` を新値にして、行の表示が変わることを確認する**）
- [ ] **Playwright で 1 件の発行シナリオ**（`e2e/family-invite.spec.ts`）

Issue 「作業内容」の追加確認:
- [ ] `InviteDialog`（メール、Zod）
- [ ] `useInvite` / `useResendInvite` / `useRevokeInvite`
- [ ] 送信成功でトースト、リストに反映（楽観的更新）
- [ ] Vitest でメール形式検証

## リスク / 確認事項
- **API パスの想定**：`POST /family/invitations` / `POST /family/invitations/{id}/resend` / `DELETE /family/invitations/{id}` を仮定している。バック（`kotozute-api`）側の実装が異なる場合は本 Issue のマージ前に合わせる。**OpenAPI 未整備なら手書き型のまま進める**（`useInvitations` と同じ判断）。**要ユーザー確認**：この 3 パス構成でよいか、あるいはバック側で既に別パスが決まっているか。
- **招待 revoke に `ConfirmDialog` を挟むか**：screen_spec §3 は「権限解除（revoked）は `ConfirmDialog`」と書いているが、これは **メンバー**（#33）を指す文言。招待の取り消しは復元可能（再送 or 再発行）なので、**既定案：Confirm 無しで即実行、失敗時トースト**。ただし誤クリックが怖ければ Confirm を挟むほうが安全。**要ユーザー確認**。
- **楽観追加行の見せ方**：POST 成功前に「メール／有効期限：送信中…」のような**プレースホルダ行**を表示するか、それとも POST 完了後にだけリストに載せるか。**既定案：楽観 append（有効期限は空文字 → `InvitationRow` 側で "送信中…" を表示するフォールバックを追加）**。実装コストが上がるので、シンプルに「dialog 閉→ invalidate で GET 再取得」でも DoD は満たせる。**要ユーザー確認**。
- **再送の楽観 UI**：`expiresAt` を仮値（現在 + N 日）で先に更新するか、サーバ真値を待つか。**既定案：待つ（`isPending` で行内スピナー／ラベルだけ動かす）**。理由は「有効期限の N 日はサーバ設定に依存する」ため。ただし screen_spec §共通仕様は「即時反映、失敗時ロールバック」を推奨しているため、UX を優先するなら暫定値を入れてもよい。
- **家族ロール保護**：本 Issue の 3 mutation は `FamilyContent` / `InvitationRow` の `canManage` 分岐で描画自体が消えるので UI からは呼ばれない。ただし **API 側でも 403 を返す**ことが最終防衛線。フロントとして family ロール時に mutation を呼ばれた場合の防御は不要（そもそも呼び口がない）。
- **CSRF トークン**：新規発行の初回は cookie に `XSRF-TOKEN` があるはず（ログイン時 `getCsrfCookie` を叩いている）。**セッション切れ時に 419 が返る**場合の再取得はスコープ外（既存の mutation も同じ扱い）。
- **メール送信の副作用**：POST が成功しても実メール送信は非同期（サーバ側 Job）。フロントは 2xx を成功として扱うので、**メール未達クレームが出た場合の切り分けはサーバ側ログに委ねる**旨だけ意識。
- **待機期間・disclosure 発動導線**：MVP スコープ外（CLAUDE.md「MVP は常時共有まで。disclosure は枠のみ」）。本 Issue では触らない。

## 参照
- `CLAUDE.md`
- `docs/frontend_design.md`（§状態管理／§API 通信と型／§認証／§UI）
- `docs/screen_spec.md` §3 家族・共有管理／§共通仕様
- 既存実装: `src/features/family/api/useInvitations.ts` / `src/features/family/components/{FamilyContent,InvitationsCard,InvitationRow}.tsx` / `src/features/settings/components/DeleteAccountDialog.tsx` / `src/features/messages/api/useUpdateMessage.ts` / `src/features/auth/api/sanctum.ts` / `e2e/messages-form.spec.ts`
