# Issue #31 — W4-01 [F-09] 家族・共有管理 一覧（メンバー・招待中一覧・owner 保護）

- URL: https://github.com/hasedai0000/kotozute-web/issues/31
- ラベル: frontend, week-4
- マイルストーン: MVP-Week4

## Issue 概要
「常時共有」を成立させるための `/family` 画面を実装する。見出し＋説明の下に **メンバー一覧**（氏名／メール／ロール／参加日）と **招待中一覧**（メール／有効期限／期限切れタグ）を並べる。owner に対して解除・降格ボタンは UI から出さない（DOM に描画しない）。家族ロールでは閲覧のみ（招待・解除ボタンなし）。**招待発行・再送・取消は #32**、**権限解除は #33** の担当なので、本 Issue はあくまで「一覧描画＋owner 保護＋期限切れ表示」までに閉じる。

## 調査結果

### 関連ドキュメント
- `CLAUDE.md` 絶対ルール — 「1. features 単位で割る」→ 実体は **`src/features/family/`**。`src/app/(app)/family/page.tsx` は薄い配線のみ。「2. サーバ状態は TanStack Query が唯一の真実」→ メンバー・招待中はそれぞれ `useFamilyMembers()` / `useInvitations()` を呼び、`useState` に写し取らない。「5. デザイントークン」→ カラー直値は不可。「7. 複数登録できる項目は EntryCard のリスト＋追加ボタン」→ ここは「メンバー」「招待」であり、EntryCard の対象外（別部品 `MemberRow` / `InvitationRow` を作る）。
- `docs/screen_spec.md` §3 家族・共有管理 — 「見出しと説明：ノートを共有する家族を招待します」「メンバー一覧：氏名／メール／ロール（本人・家族）／参加日／権限解除」「招待中の一覧：メール／有効期限／再送・取り消し」「家族を招待ボタン」「(v1) 死後開示の発動導線」「有効期限切れは『期限切れ』表示＋再送」「**owner は解除・降格できない**（UI から不可能にする）」「家族ロールでは、一覧は閲覧のみ。招待・解除は不可」。本 Issue のスコープでは **描画・ラベル・期限切れタグ・owner 非描画** までを実装し、**招待発行ダイアログ／再送・取消ボタン／権限解除ボタン** は #32・#33 に委ねる（ボタンは仮の disabled や description のみ残し、実 mutation は次 Issue）。
- `docs/screen_spec.md` §共通仕様「状態の出し分け」— ローディング＝**スケルトン**（レイアウトを保つ）、エラー＝再試行、空＝説明文＋一次アクション。招待中が 0 件でも許容（表示しない or「まだ招待はありません」）。
- `docs/screen_spec.md` §共通仕様「ロールによる出し分け」— `family` ロールでは編集 UI（招待ボタン・解除ボタン）を **描画しない**。owner 判定は `useAuth().user?.role`（未定義は owner 扱い）。
- `docs/frontend_design.md` §UI — 白基調・カード型・角丸・フラット。メンバー行は **1 行 1 メンバーのカード風 / リストアイテム風** で、氏名を強、メールを muted、ロールを Badge、参加日を muted で並べる。
- `docs/frontend_design.md` §状態管理 — サーバ状態は TanStack Query。`queryKeys` は `lib/query/queryKeys.ts` に集約。

### 関連コード
- `src/app/(app)/family/page.tsx:1-7` — 現状は `<h1>` のみのスタブ。**本 Issue で `FamilyContent` を配線**（`"use client"` を指定する Client Component にする。Header 直下の `<main>` に描画される）。
- `src/features/family/` — `api/useFamilyMembers.{ts,test.ts}`、`components/FamilyStatusCard.tsx` が既にある。**招待中一覧の API フック（`useInvitations`）は未実装**。本 Issue で新設する。
- `src/features/family/api/useFamilyMembers.ts:6-34` — `FamilyMember = { id, name, email, role: "owner"|"family", joinedAt }` と `fetchFamilyMembers()`。`404` は空配列を返す方針。**同じ流儀で `useInvitations` を作る**（`GET /family/invitations`、404 → `[]`）。TODO コメントで OpenAPI 生成待ちを明示。
- `src/features/family/components/FamilyStatusCard.tsx:23-121` — ダッシュボード用のサマリカード。**本 Issue では触らない**（アバター表示・招待導線が完結しているため）。
- `src/lib/query/queryKeys.ts:15-17` — 現状 `family.members` のみ。**`family.invitations = ["family", "invitations"] as const` を追加**。
- `src/features/auth/api/useMe.ts:7-14` — `AuthRole = "owner" | "family"`。`user.role === "family"` を判定に使う。未定義は owner 扱い。
- `src/features/auth/hooks/useAuth.ts:1-13` — `useAuth()` で参照（`SettingsPage` などと同じパターン）。
- `src/components/ui/badge.tsx` — Badge が既にある。ロール表記（「本人」「家族」）と「期限切れ」タグに使う。
- `src/components/ui/card.tsx` / `src/components/ui/skeleton.tsx` / `src/components/layout/EmptyState.tsx` / `src/components/layout/Container.tsx` — 既存部品で足りる。
- `src/app/invitations/[token]/page.tsx:1-14` — 受諾ページのスタブ。本 Issue のスコープ外（#34/#35 で本実装）。
- `src/app/(app)/family/disclosure/` — v1 発動導線の枠。screen_spec §3 は「(v1) 死後開示の発動導線 → `/family/disclosure`」と書いているが、**MVP スコープ外**（CLAUDE.md「MVP は常時共有まで。disclosure は枠のみ」）。本 Issue では **導線ボタンを出さない**。

### 依存関係
- **先行**: なし（Week 3 の Issue はすべて close 済み。`useFamilyMembers` は W2-05 #17 で実装済み）。
- **後続 / 並列**:
  - **#32 W4-02**（招待発行ダイアログ + 再送・取消）— 本 Issue で招待中一覧の **枠と `useInvitations`** を用意し、行内の「再送」「取り消し」ボタンは **本 Issue では描画するが no-op（disabled）or click ハンドラは次 Issue で実装** のどちらにするか要確認（下記リスク欄）。既定案は「ボタンは描画するが `onClick` は空関数＋TODO コメント」。
  - **#33 W4-03**（権限解除 ConfirmDialog / owner 解除不可）— メンバー行の「権限を解除」ボタン UI は **owner には描画しない**を本 Issue で担保する（DoD）。実際の `useRevokeMember` は次 Issue。
  - **#36 W4-06**（家族ロールの閲覧専用モード）— 本 Issue でも `useAuth()` を見て family ロール時は招待・解除ボタンを描画しない実装を入れる。ただし family ロールで実 API から `role: "family"` が返るのは #34/#35 以降。**現時点では owner 前提で動く**ことを許容する。
- **参照のみ**:
  - **OpenAPI 生成**（Laravel 側 Scramble）— `/family/members` / `/family/invitations` はまだ OpenAPI に載っていない前提。本 Issue でも `useFamilyMembers` 同様に **手書き型 + TODO コメント**で進める。API 契約は Week 4 のバック実装完了後に差し替え。

## やること

### 1. `useInvitations` フック新設（family feature 内）
- [ ] `src/features/family/api/useInvitations.ts` を新設
  - `type InvitationStatus = "pending" | "expired"`（`revoked` は表示対象外 = API がフィルタして返す前提）
  - `type Invitation = { id: string | number; email: string; expiresAt: string; status: InvitationStatus }`
  - `fetchInvitations(): Promise<Invitation[]>` — `useFamilyMembers` と同じ流儀で `apiFetch("/family/invitations")` を呼び、`ApiError` が `404` なら `[]` を返す
  - `useInvitations()` — `useQuery({ queryKey: queryKeys.family.invitations, queryFn: fetchInvitations, retry: false, staleTime: 30_000 })`
  - `// TODO(#31+): OpenAPI に /family/invitations が定義され次第、src/types/generated から型を差し替える。` コメント
- [ ] `src/features/family/api/useInvitations.test.ts` を新設（`useFamilyMembers.test.ts` を踏襲）
  - 200 で配列を返す
  - 404 で `[]` を返す
  - 500 は throw
- [ ] `src/lib/query/queryKeys.ts` に `invitations: ["family", "invitations"] as const` を追加

### 2. コンポーネント（`src/features/family/components/`）
- [ ] `FamilyContent.tsx`（トップコンポーネント。`"use client"`）
  - `useAuth()` で `role` 取得（未定義は owner）
  - `useFamilyMembers()` / `useInvitations()` を並列で呼ぶ
  - レイアウト：見出し `<h1>家族・共有管理</h1>` ＋説明 `<p>ノートを共有する家族を招待します。</p>` ＋「家族を招待」ボタン（owner のみ描画、`onClick` は空関数 + `// TODO(#32)`）＋ `MembersCard` ＋ `InvitationsCard`
- [ ] `MembersCard.tsx`
  - `<Card>` + `<CardHeader>` "メンバー" + カウント
  - ローディング：`Skeleton` を 2〜3 行分（レイアウト維持）
  - エラー：`EmptyState` + 再試行
  - 空：**owner の場合のみ発生し得ない**（自分自身が必ず含まれるはずだが、API 未整備時は 404→[] があり得るので）「メンバー情報を取得できませんでした」/「まだメンバーがいません」を表示。
  - 一覧：`MemberRow` を `map` で描画
- [ ] `MemberRow.tsx`
  - 左：氏名（強）／メール（muted） 右：ロール Badge（`owner`→「本人」／`family`→「家族」）＋参加日（`Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" })` で表示）＋「権限を解除」ボタン
  - **owner 行では「権限を解除」ボタンを描画しない**（早期 return of `null`）— #33 の owner 保護と重なるが、DoD の「owner に対して解除・降格ボタンが UI から出ない」を本 Issue で担保
  - **family ロール**時は自分以外の行も含めボタンを描画しない
  - 「権限を解除」は本 Issue では **描画のみ**（`onClick` は空 + `// TODO(#33)`）にする or 描画自体を #33 に委ねる（要確認：下記リスク欄。**既定案：描画のみ**）
- [ ] `InvitationsCard.tsx`
  - `<Card>` + `<CardHeader>` "招待中" + カウント（0 件でもカード自体は描画。中身は EmptyState「まだ招待中の家族はいません」）
  - ローディング／エラーはメンバー同様
  - 一覧：`InvitationRow`
- [ ] `InvitationRow.tsx`
  - 左：メール 右：`expiresAt` の表示＋`status === "expired"` なら Badge「期限切れ」（`variant="destructive"` or 明確な色）／`pending` なら「有効期限: YYYY/MM/DD」
  - 「再送」「取り消し」ボタン（owner のみ描画、`onClick` は空 + `// TODO(#32)`）
- [ ] 期限切れ判定はサーバから来た `status` を尊重する（フロントで `expiresAt < now` を計算しない）— API 側で `status` を返す前提。ただし **フォールバックとして** `status` が無く `expiresAt` のみの場合を考慮し、`expiresAt < 現在` なら期限切れ扱いにするヘルパ `isExpired(invitation)` を用意（`utils` に置くほどでもないので `InvitationRow.tsx` 内 or `src/features/family/lib/`）

### 3. ページ配線
- [ ] `src/app/(app)/family/page.tsx` を `FamilyContent` の render に差し替え
  - `"use client"` を指定
  - ページには `<Container>` を敷き、内側で `<FamilyContent />` を呼ぶ
  - `metadata` は不要（認証必須エリアなので）

### 4. ロール判定
- [ ] `useAuth()` の `user?.role === "family"` のとき、招待ボタン・招待中カード内の再送/取消・メンバー行の権限解除を **描画しない**（DOM に出さない）
- [ ] owner 判定は `role !== "family"`（未定義＝owner 扱い）
- [ ] `FamilyContent` の一箇所で `isOwner` を計算し、必要な子に prop で渡す（子側で `useAuth` を重複呼び出ししない）

### 5. テスト（Vitest / RTL）
- [ ] `useInvitations.test.ts`（前述）
- [ ] `MembersCard.test.tsx`
  - ローディング時、`Skeleton` を含む
  - エラー時、再試行ボタンが押せる
  - 空時、EmptyState を表示
  - 一覧時、メンバー数分の行を描画
- [ ] `MemberRow.test.tsx`
  - `role="owner"` の行に「権限を解除」ボタンが **存在しない**（`queryByRole("button", { name: /権限を解除/ })` が `null`）— **DoD 直結**
  - `role="family"` の行に「権限を解除」ボタンが描画される（owner が閲覧中）
  - `role="family"` の閲覧者では、他の family 行でもボタンが描画されない
  - 参加日が日本語ロケールで表示される
- [ ] `InvitationsCard.test.tsx`
  - 0 件時に EmptyState「まだ招待中の家族はいません」
  - 一覧時、行数が一致
- [ ] `InvitationRow.test.tsx`
  - `status="expired"` で「期限切れ」Badge が付く — **DoD 直結**
  - `status="pending"` で有効期限が表示される
  - owner 閲覧時に再送・取消ボタンが描画され、family 閲覧時に描画されない
- [ ] `FamilyContent.test.tsx`
  - family ロール時、「家族を招待」ボタンが描画されない
  - owner ロール時、「家族を招待」ボタンが描画される

### 6. 手動確認（DoD 直結）
- [ ] `/family` を開き、メンバー一覧・招待中一覧・「家族を招待」ボタンが表示される
- [ ] owner のメンバー行に「権限を解除」ボタンが **無い** ことを DevTools で確認
- [ ] 期限切れ招待に「期限切れ」Badge が付くことを確認（モック / 手動でデータを差し替え）
- [ ] `npm run lint` / `npm run typecheck` / `npm run test` が緑

## 完了条件（DoD）
Issue 本文の DoD を転記：
- [ ] owner に対して解除・降格ボタンが UI から出ない（DOM 検索で確認）
- [ ] 期限切れが「期限切れ」タグで区別できる

追加で以下も満たす（screen_spec §3 の記述由来）：
- [ ] `/family` に見出し + 説明文
- [ ] メンバー一覧に氏名 / メール / ロール / 参加日が並ぶ
- [ ] 招待中一覧にメール / 有効期限が並ぶ
- [ ] family ロールでは招待・解除の操作 UI が描画されない
- [ ] `npm run lint` / `npm run typecheck` / `npm run test` が緑

## リスク / 確認事項
- **「家族を招待」ボタンの扱い**: 本 Issue のスコープは「一覧」なので、ボタンは **描画するが `onClick` は空関数 + `// TODO(#32)`**（次 Issue でダイアログを差し込む）で進めたい。**代案**: ボタン自体を #32 に委ね、本 Issue では描画しない。どちらが良いか？既定案は「描画あり・no-op」。
- **メンバー行の「権限を解除」ボタンの扱い**: 同上。**owner 保護（描画しない）は本 Issue で確実に入れる**が、`family` 行に対するボタン描画自体は #33 に委ねる or 本 Issue で描画のみ入れる。既定案は「描画あり・`onClick` は no-op」（#33 の実装で `useRevokeMember` を接続するだけにする）。
- **招待行の「再送」「取り消し」ボタンの扱い**: 同上。既定案は「描画あり・no-op（TODO #32）」。
- **`useInvitations` の API パス**: `GET /family/invitations` を仮置きするが、バック側で `/family/pending-invitations` 等になる可能性あり。TODO コメントで残す。
- **期限切れ判定**: `status` を API で持たせる想定だが、`expiresAt` だけしか返らない場合を考慮してフロント側でフォールバック判定するかは要確認。既定案は「サーバの `status` を優先、無ければ `expiresAt < now` で判定」。
- **v1 の死後開示発動導線**: screen_spec §3 は `/family/disclosure` への導線を「目立たせない」と書いているが、CLAUDE.md では「MVP は disclosure は枠のみ」。本 Issue では **導線を出さない**方針で問題ないか？既定案：出さない。
- **`fetchFamilyMembers` の 404→[] 挙動**: バック未実装時にログイン後の `/family` で空表示になる。この挙動を維持する方針で良いか（`useFamilyMembers` の既存流儀を踏襲）。
- **監査ログ（`audit_logs`）**: 招待・受諾・権限解除は監査ログに記録されるべきだが、本 Issue のスコープは「一覧」なので実装対象外。#32/#33 で扱う。

## 参照
- `CLAUDE.md`（絶対ルール、MVP スコープ）
- `docs/frontend_design.md`（§UI、§状態管理、§セキュリティ）
- `docs/screen_spec.md` §3 家族・共有管理、§共通仕様（状態の出し分け／ロール）
- 既存実装: `src/features/family/api/useFamilyMembers.ts`、`src/features/family/components/FamilyStatusCard.tsx`、`src/features/auth/hooks/useAuth.ts`、`src/lib/query/queryKeys.ts`
- 関連 Issue: #32（招待発行）、#33（権限解除）、#36（家族ロール閲覧専用）
