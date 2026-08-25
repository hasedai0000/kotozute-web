# Issue #33 — W4-03 [F-09] 権限解除（ConfirmDialog、owner 解除不可）

- URL: https://github.com/hasedai0000/kotozute-web/issues/33
- ラベル: frontend, week-4
- マイルストーン: MVP-Week4

## Issue 概要
`/family` メンバー一覧から**家族メンバーの権限を解除**（`family_members.status = "revoked"` 相当）できるようにする。#31 で描画済みの `MemberRow` の「権限を解除」ボタンは現状 no-op（`// TODO(#33)`）なので、本 Issue で `useRevokeMember` mutation と `ConfirmDialog`（誤操作防止・重い確認文）を組み合わせて実装する。**owner は解除できない**（既に `!isOwner` で描画自体を消しているが本 Issue でも保持）、**family ロールでは操作不可**（既に `canManage` で描画自体を消しているが本 Issue でも保持）。楽観的更新でリストから消え、失敗時はロールバック＋トースト。

## 調査結果

### 関連ドキュメント
- `CLAUDE.md` 絶対ルール —
  1. **features 単位で割る**：mutation は `src/features/family/api/`、UI は `src/features/family/components/`。`src/app/(app)/family/page.tsx` はルーティング専任のまま触らない。
  2. **サーバ状態は TanStack Query が唯一の真実**：解除後のメンバー一覧は `useFamilyMembers` のキャッシュを `useQueryClient().setQueryData` / `invalidateQueries` で更新する。**解除済みメンバーを `useState` に写し取らない**。
  3. **トークンをフロントで保持しない**：Sanctum SPA 認証。DELETE は `readXsrfToken()` の値を `X-XSRF-TOKEN` に付与する（`useRevokeInvite.ts:19-27` と同じパターン）。
  5. **デザイントークンを使う**：`ConfirmDialog` は shadcn/ui + tailwind theme に沿う（既存 `variant="destructive"` を利用）。直値の色コードを書かない。
- `docs/screen_spec.md` §3 家族・共有管理 —
  - 「**権限解除（`revoked`）は `ConfirmDialog` で確認**。解除後は即座に閲覧不可」← 本 Issue の中核仕様
  - 「**owner は解除・降格できない（UI から不可能にする）**」← 描画自体を消す（既に `MemberRow.tsx:35` で `!isOwner` 分岐済み）
  - 「**家族ロールでは、一覧は閲覧のみ。招待・解除は不可**」← 描画自体を消す（既に `MemberRow.tsx:35` で `canManage` 分岐済み）
  - 監査「招待・受諾・**権限解除は `audit_logs` に記録する**」← サーバ側の責務。フロントは DELETE を素直に叩けばよい。
- `docs/screen_spec.md` §共通仕様「状態の出し分け」— **保存中は楽観的更新で即時反映、失敗時ロールバック＋トースト**。オフライン／通信失敗は「保存できませんでした」トースト＋再試行。→ mutation に `onMutate`（前値スナップショット→楽観更新）／`onError`（ロールバック＋`toast.error`）／`onSuccess`（`toast.success`）／`onSettled`（`invalidateQueries`）を実装する。
- `docs/frontend_design.md` §状態管理 — サーバ状態は TanStack Query。`queryKeys` は `lib/query/`。**既に `queryKeys.family.members` は定義済み**（`src/lib/query/queryKeys.ts:16`）ので流用。
- `docs/frontend_design.md` §UI — 白基調・カード型・角丸。**確認ダイアログは既存の `ConfirmDialog` を流用**（`src/components/layout/ConfirmDialog.tsx`）。variant は `destructive`。
- `docs/frontend_design.md` §テスト — Vitest（単体）／Playwright（E2E）。**DoD の「DOM 検索で確認」は Vitest で担保する**（`MemberRow.test.tsx` に既存の owner 行にボタンなしテストがある）。

### 関連コード
- `src/features/family/api/useFamilyMembers.ts:1-35` — GET `/family/members` を返す既存フック。型 `FamilyMember = { id, name, email, role, joinedAt }` を共有する。**本 Issue の mutation はこの `queryKeys.family.members` キーを invalidate / setQueryData する**。**404 は空配列にフォールバック**する既存挙動を尊重（`fetchFamilyMembers` の catch）。
- `src/features/family/api/useRevokeInvite.ts:1-56` — **本 Issue の mutation の見本**。DELETE → 楽観削除 → ロールバック → invalidate の 4 段構造をそのまま踏襲する（対象が `invitations` から `members` に変わるだけ）。
- `src/features/family/api/useRevokeInvite.test.ts:1-46` — mutation 単体テストの見本。`vi.stubGlobal("fetch", fetchMock)` で `apiFetch` を差し替え、**204 で resolve** ／ **500 で reject** の 2 ケースを検証している。**本 Issue でも同じ流儀**。
- `src/features/family/components/MemberRow.tsx:1-49` — **本 Issue で編集する主対象**。
  - `canManage && !isOwner` の条件で「権限を解除」ボタンが描画されている（`L35`）。**この条件は絶対に緩めない**（owner 保護／family ロール保護の最終防衛線）。
  - `onClick` が `// TODO(#33): useRevokeMember を接続する` の空関数（`L39-41`）。**本 Issue で `ConfirmDialog` の開閉 state と `useRevokeMember` を接続する**。
  - Props に `member` を受けているので、`ConfirmDialog` の説明文で氏名を出せる。
- `src/features/family/components/MemberRow.test.tsx:1-56` — **DoD を既に担保しているテスト**。
  - **owner 行では「権限を解除」ボタンが描画されない**（`L27-33`、DoD 1 と一致）
  - **family 行では owner 閲覧時にボタンが描画される**（`L35-41`）
  - **family 閲覧時（canManage=false）はボタンが描画されない**（`L43-48`、screen_spec 家族ロール閲覧のみ）
  - **本 Issue では既存 4 ケースを回帰させず**、mutation 接続後の挙動を追加検証する。
- `src/features/family/components/FamilyContent.test.tsx:79-114` — DoD 側からもう一度検証しているテスト（`revokeButtons.toHaveLength(1)`）。**本 Issue でも緑を維持**。
- `src/features/family/components/MembersCard.tsx:20-72` — メンバー一覧の描画。**本 Issue では変更不要**（キャッシュを更新すれば自動再レンダされる）。楽観削除で対象行が即座に消えること／0 件になったら `EmptyState`（「まだメンバーがいません」）が出ることを確認。
- `src/components/layout/ConfirmDialog.tsx:1-77` — **本 Issue で使う確認ダイアログ**。
  - Props: `{ open, onOpenChange, title, description, confirmLabel?, cancelLabel?, variant?, onConfirm }`
  - `onConfirm` が Promise を返せば `await` してから `onOpenChange(false)` が呼ばれる（`L40-49`）
  - 内部で `isSubmitting` を握ってボタンを disabled にする（二重送信防止）
  - `variant="destructive"` で赤ボタン
  - `showCloseButton={false}` が固定（誤操作防止）
- `src/features/messages/components/MessageForm.tsx:210-218` — `ConfirmDialog` の使用サンプル。`open` state を `useState` で持ち、`handleDelete` を `onConfirm` に渡す流儀。**本 Issue も同じ**。
- `src/features/notebook/components/SectionEntries.tsx:101` — `ConfirmDialog` のもう一つの使用サンプル。
- `src/lib/query/queryKeys.ts:16` — `family.members = ["family", "members"] as const`。**既存キーを流用**。追加不要。
- `src/lib/api/client.ts` の `apiFetch<T>` — Sanctum の `credentials: "include"` を強制する薄いラッパー。**mutation はこれ経由で叩く**。204 は `undefined` で解決される。エラーは `ApiError` に整形されて throw される。
- `src/features/auth/api/sanctum.ts:18-30` — `readXsrfToken()`。**DELETE で `X-XSRF-TOKEN` ヘッダに載せる**（GET には不要）。
- `app/layout.tsx:4` — `<Toaster />` は配線済み。`toast.success` / `toast.error` はそのまま使える。
- `e2e/family-invite.spec.ts` — Playwright の family 系 API stub 流儀の見本（あれば流用）。**本 Issue の E2E はスコープ外**（DoD が Vitest の DOM 検索で満たせるため → リスク欄）。

### 依存関係
- **先行（完了済み）**:
  - #31 W4-01 — `FamilyContent` / `MembersCard` / `MemberRow` / `useFamilyMembers` / `queryKeys.family.members` はすべて実装済み（`main` に merged）。ボタンも `!isOwner` で描画済み、`onClick` だけが空。
  - #32 W4-02 — `useRevokeInvite` の楽観削除パターンが確立済み。本 Issue はこれを **members 側に転写**するだけ。
- **並列 / 独立**:
  - #34 W4-04 / #35 W4-05（招待受諾）— 招待メール受諾フロー。触るファイルが `/invitations/[token]` 側で本 Issue と衝突しない。
  - #36 W4-06（family ロール閲覧専用）— `canManage` の分岐は既に描画済み。本 Issue でも同じ prop を尊重する。
- **参照のみ**:
  - **バック側 API**（`kotozute-api`）— `DELETE /family/members/{id}` の実装が必要。**未整備の想定で、フロントは `useFamilyMembers` / `useRevokeInvite` と同様に手書き型＋TODO コメントで進める**。契約が確定次第 OpenAPI 再生成で置き換える。

## やること

### 1. mutation フックを新設（`src/features/family/api/useRevokeMember.ts`）
- [ ] `useRevokeInvite.ts` をひな型にコピー
- [ ] `type RevokeMemberInput = { id: number | string }`
- [ ] `revokeMember(input): Promise<void>` — `apiFetch<void>('/family/members/${encodeURIComponent(id)}', { method: "DELETE", headers: { "X-XSRF-TOKEN": readXsrfToken() ?? "" } })`（`apiFetch` は 204 を `undefined` に解決する）
- [ ] `useRevokeMember()` — `useMutation<void, unknown, RevokeMemberInput, { previous: FamilyMember[] | undefined }>`
  - `onMutate`: `cancelQueries(queryKeys.family.members)` → 前値 snapshot → **該当 id の行を即座にリストから除去**（楽観削除） → context 返却
  - `onError`: ロールバック + `toast.error("権限の解除に失敗しました。時間をおいて再度お試しください。")`
  - `onSuccess`: `toast.success("権限を解除しました。")`
  - `onSettled`: `invalidateQueries(queryKeys.family.members)`
- [ ] `// TODO(#33+): OpenAPI に DELETE /family/members/{id} が定義され次第、型を差し替える。` を残す

### 2. `MemberRow.tsx` を接続
- [ ] `"use client"` は既に付与済み
- [ ] `useState<boolean>(false)` で `confirmOpen` を持つ
- [ ] `useRevokeMember()` を呼び、`mutation` を握る
- [ ] 「権限を解除」ボタン（既存の `L36-45` の Button）
  - `onClick={() => setConfirmOpen(true)}` に差し替え
  - `disabled={mutation.isPending}` を追加
  - `aria-busy={mutation.isPending}` を追加
  - ラベルは `mutation.isPending ? "解除中…" : "権限を解除"` に切り替え
- [ ] 末尾に `<ConfirmDialog>` を配置
  - `open={confirmOpen}`
  - `onOpenChange={setConfirmOpen}`
  - `title={`${member.name} さんの権限を解除しますか？`}`（氏名を出して誤操作を防ぐ）
  - `description="解除すると、この方はすぐにノートを閲覧できなくなります。元に戻すには、あらためて招待し直す必要があります。"`（screen_spec §3 の「解除後は即座に閲覧不可」を反映、かつ「再招待可能」を示して重すぎない文言に）
  - `confirmLabel="解除する"`
  - `variant="destructive"`
  - `onConfirm={async () => { await mutation.mutateAsync({ id: member.id }); }}`（`ConfirmDialog` が Promise 解決後に閉じてくれる）
- [ ] `// TODO(#33): useRevokeMember を接続する` コメントは削除
- [ ] **`canManage && !isOwner` の分岐は絶対に緩めない**（owner 保護／family ロール保護）
- [ ] **`ConfirmDialog` / `useState` / `useRevokeMember` も `canManage && !isOwner` の中でだけレンダ／実行**（owner 行では ConfirmDialog も存在させない）

### 3. テスト（Vitest / React Testing Library）
- [ ] `src/features/family/api/useRevokeMember.test.ts` を新設
  - `useRevokeInvite.test.ts` を流用（`vi.stubGlobal("fetch", fetchMock)`）
  - **204 で resolve**（`DELETE /family/members/{id}` が呼ばれること、URL 検証、method 検証）
  - **500 で reject**（`ApiError.status === 500`）
- [ ] `src/features/family/components/MemberRow.test.tsx` を拡張（既存 4 ケースは回帰させない）
  - **owner 行に「権限を解除」ボタンが無い**（既存、DoD 1 — DOM 検索で確認）
  - **family 行で「権限を解除」を押すと `ConfirmDialog` が開く**（`role="dialog"` / title 文言で確認）
  - **`ConfirmDialog` で「解除する」を押すと `useRevokeMember` の `mutate` が呼ばれる**（`vi.mock("@/features/family/api/useRevokeMember")` で `mutateAsync` を spy）
  - **`ConfirmDialog` で「キャンセル」を押すと `mutate` は呼ばれない**
  - **description に「即座に閲覧できなくなります」（もしくは同等の文言）が含まれる**（screen_spec 準拠を担保）
- [ ] `src/features/family/components/FamilyContent.test.tsx`
  - 既存 DoD 検証（`revokeButtons.toHaveLength(1)`）はそのまま緑
  - **解除成功後にリストから該当メンバーが消える（DoD 2）**：`fetchMock` を「初回 GET は 2 件、DELETE は 204」「以降の GET は 1 件（invalidate 後の再取得）」で構成。もしくは楽観削除だけ確認する簡易版でも可（**既定案：楽観削除のみを RTL で確認し、invalidate 後の GET は Vitest では検証しない**。理由：`waitFor` で細かい競合を書くよりも `useRevokeMember` の単体テストで十分）

### 4. E2E（Playwright）
- [ ] **既定案：本 Issue では追加しない**。理由：
  - Issue DoD が「DOM 検索で確認」「リストから消える」であり、いずれも Vitest / RTL で十分。
  - #38 W4-08「E2E: 記入 → 家族招待 → 家族閲覧のシナリオ」で常時共有の主要動線を検証する予定で、そこに revoke シナリオを織り込むかは #38 側で判断。
  - **要ユーザー確認**：本 Issue で `e2e/family-revoke-member.spec.ts` を書くか、#38 に寄せるか。

## 完了条件（DoD）
Issue の DoD を転記:
- [ ] **owner に対して解除ボタンが存在しない（DOM 検索で確認）** — 既に `MemberRow.test.tsx:27-33` および `FamilyContent.test.tsx:112-113` で担保済み。本 Issue の変更後も緑を維持する。
- [ ] **解除後に該当メンバーがリストから消える** — `useRevokeMember` の楽観削除 + `invalidateQueries` により実現。`FamilyContent.test.tsx` の追加テストで確認、または `MemberRow.test.tsx` の追加テストで mutation が正しい `id` で呼ばれることを確認する。

Issue 「作業内容」の追加確認:
- [ ] `useRevokeMember`（`revoked`）
- [ ] `ConfirmDialog`（説明文：解除後は即座に閲覧不可）
- [ ] owner のボタンを UI から不可能にする（描画しない）
- [ ] 家族ロールでは操作不可（`canManage` 分岐を維持）

## リスク / 確認事項
- **API パスの想定**：`DELETE /family/members/{id}` を仮定している。バック（`kotozute-api`）側の実装が異なる場合（例: `POST /family/members/{id}/revoke`、あるいは `PATCH /family/members/{id} { status: "revoked" }`）は本 Issue のマージ前に合わせる。**OpenAPI 未整備なら手書き型のまま進める**（`useFamilyMembers` / `useRevokeInvite` と同じ判断）。**要ユーザー確認**：この DELETE 構成でよいか。
- **ConfirmDialog の文言**：screen_spec §3 は「解除後は即座に閲覧不可」を必須要件としている。既定案では「解除すると、この方はすぐにノートを閲覧できなくなります。元に戻すには、あらためて招待し直す必要があります。」としているが、**「再招待可能」の一文を入れるか外すか**は要判断。入れると重すぎず操作しやすい／外すと「重い確認文」の趣旨に近い。**要ユーザー確認**。
- **楽観削除の見せ方**：DELETE 送信中に該当行を即座に消す（既定案）／それとも "解除中…" のプレースホルダを一瞬出してから消すか。**既定案：即座に消す**（楽観削除・失敗時ロールバック）。理由：既存の `useRevokeInvite` と統一するため、および `ConfirmDialog` 内で await するので体感的な遅延はほぼ無い。
- **E2E の追加可否**：上記「4. E2E」参照。**要ユーザー確認**。
- **`canManage` の判定**：現状 `FamilyContent.tsx:16` の `user?.role !== "family"` で決めている（未定義 → owner 扱い）。**#36 W4-06 で family ロール判定が改善される予定**だが、本 Issue はその前提に依存しない（現状の描画分岐で DoD は満たせる）。
- **`ConfirmDialog` の submit 中 UX**：既存の `ConfirmDialog.tsx:38-49` は内部で `isSubmitting` を握って両ボタンを disabled にする。**本 Issue の `MemberRow` 側でも `mutation.isPending` で「権限を解除」ボタン自体を disabled にする**ことで、ダイアログ外の連打も防ぐ。ただし `ConfirmDialog` を閉じた直後の GET invalidate 中に「解除中…」ラベルが一瞬残る可能性はある（許容範囲）。
- **CSRF トークン**：新規発行の初回は cookie に `XSRF-TOKEN` があるはず（ログイン時 `getCsrfCookie` を叩いている）。**セッション切れ時に 419 が返る**場合の再取得はスコープ外（既存の mutation も同じ扱い）。
- **監査ログ**：解除は `audit_logs` に記録する（screen_spec §3）。**サーバ側の責務**であり、フロントは DELETE を素直に叩けばよい。
- **owner 自身の "退会"**：本 Issue のスコープ外。退会は `/settings` の「危険な操作」（`DeleteAccountDialog`）で扱う既存機能。
- **待機期間・disclosure 発動導線**：MVP スコープ外（CLAUDE.md「MVP は常時共有まで。disclosure は枠のみ」）。本 Issue では触らない。

## 参照
- `CLAUDE.md`
- `docs/frontend_design.md`（§状態管理／§API 通信と型／§認証／§UI）
- `docs/screen_spec.md` §3 家族・共有管理／§共通仕様
- 既存実装: `src/features/family/api/useFamilyMembers.ts` / `src/features/family/api/useRevokeInvite.ts` / `src/features/family/components/MemberRow.tsx` / `src/components/layout/ConfirmDialog.tsx` / `src/features/messages/components/MessageForm.tsx:210-218` / `src/features/auth/api/sanctum.ts` / `docs/issues/32/plan.md`
