# Issue #36 — W4-06 [F-11] 家族ロールの閲覧専用モード（編集 UI 非描画・posthumous 非可視）

- URL: https://github.com/hasedai0000/kotozute-web/issues/36
- ラベル: frontend, week-4
- マイルストーン: MVP-Week4

## Issue 概要
家族ロール（`role === "family"`）でログインしているときは、編集 UI をそもそも DOM に描画しない（「見た目上隠す」だけの実装は禁止）。`posthumous` の項目は API が返さない前提で扱い、クライアント側で `.filter` によって timing を除外する実装を持たない。対象は notebook（セクション編集）と messages（大切な人へ）を中心に、既に対応済みの settings / family も含めて統一する。

## 調査結果

### 関連ドキュメント
- `CLAUDE.md` — 絶対ルール 8: 死後開示の項目は API が返さない限り存在しない前提で実装、クライアント側で隠すだけの実装は禁止。
- `docs/screen_spec.md` §共通仕様「ロールによる出し分け（YOU MUST）」— family は編集不可、`posthumous` は解放前は API が返さない前提。
- `docs/screen_spec.md` §2 セクション編集 — 家族ロール時は追加・編集・削除ボタンを描画しない。
- `docs/screen_spec.md` §3 家族・共有管理 — 家族ロールは招待・解除不可（`FamilyContent` にて `canManage` で分岐済み）。
- `docs/screen_spec.md` §7 大切な人へ — 家族は解放前は API が返さないため一覧に現れない。解放後は閲覧のみ。
- `docs/screen_spec.md` §9 設定 — 家族ロールは自分のプロフィールと通知のみ、ノートの設定は表示しない（対応済み）。

### 関連コード（現状）

**ロール判定の基盤（既存）**
- `src/features/auth/api/useMe.ts:8-14` — `AuthRole = "owner" | "family"` を定義。`role?` は optional で、`undefined` のときは owner 扱い（サーバー未実装のため）。コメントに「Week 4 #34/#35 で family 判定を導入予定」と記載。
- `src/features/auth/hooks/useAuth.ts` — `useAuth()` は `AuthContext` を返すだけ。`useIsOwner` に相当するフックは未実装。

**対応済みの箇所（既に role で分岐している）**
- `src/app/(app)/settings/page.tsx:16-17` — `isFamilyRole = user?.role === "family"` で `DefaultTimingSection` / `GracePeriodSection` / `DataExportSection` を owner のみ描画。
- `src/app/(app)/dashboard/page.tsx:13` — 「次にやること」を family には出さない。
- `src/features/family/components/FamilyContent.tsx:16` — `canManage = user?.role !== "family"` で「家族を招待」ボタン・`InviteDialog` を制御。`MembersCard` / `InvitationsCard` にも `canManage` を渡す（配下の revoke ボタンまで制御済み）。

**未対応の箇所（本 Issue のスコープ）**
- `src/features/notebook/components/SectionForm.tsx:36-37` — TODO コメントあり：「家族ロールは編集 UI を出さない。role 判定は別 Issue で」。現状は常にフォームを描画。
- `src/features/notebook/components/SectionEntries.tsx:60-75` — 追加ボタン（`Plus` ＋「〜を追加」）と `onEdit` / `onDelete` コールバックを常に描画・渡している。
- `src/features/notebook/components/EntryCard.tsx:21-34` — `readOnly?: boolean` プロップは既に用意されており、`showActions = !readOnly && (onEdit || onDelete)` で編集・削除ボタンを非描画にできる。呼び出し元（`EntryList` → `SectionEntries`）から `readOnly` を渡す配線が不足。
- `src/features/messages/components/MessagesList.tsx:16-24, 39, 69` — `NewMessageLink`（「手紙を書く」）を常に描画。空状態にも配置している。
- `src/features/messages/components/MessageForm.tsx` — create / edit 兼用のフォーム。family が到達した場合の読み取り専用ビューがない（autosave 発火や削除ボタンの露出が発生し得る）。
- `src/app/(app)/messages/new/page.tsx` / `src/app/(app)/messages/[id]/page.tsx` — family がアクセスした際のガードが未実装（create ページに family が到達可能）。

**クライアント側の timing フィルタ**
- `.filter(...)` × `timing` / `posthumous` / `always` の同一箇所ヒットは **0 件**（`src/` 配下 grep 済み）。DoD の「`.filter` で timing を除外している箇所がない」は現状すでに満たしている。以後もこの状態を維持する。

### 依存関係
- 前提: #34（W4-04 招待受諾）と #35（W4-05 受諾フロー）は **CLOSED**。ただし `useMe.ts` のコメントで期待されていた「family 判定の実導入」は現時点で `role` が optional のまま残っており、本 Issue で `useIsOwner` を定義しつつ「`role === "family"` のときのみ family として扱う（未定義は owner）」という運用を確定させる。
- 関連（後続）: #38（W4-07 相当・E2E 整備）が予告されており、family 閲覧の主要シナリオはそこで E2E テストされる想定。本 Issue は Vitest レベルまでを担当。

## やること

- [ ] `src/features/auth/hooks/useIsOwner.ts` を新設し、`useIsOwner(): boolean` を実装する
      - 実装方針: `useAuth()` からユーザーを取り、`user?.role === "family"` のときのみ `false`、それ以外（未ログイン・未定義含む）は `true`（owner 扱い）。`useMe.ts` のコメントとの整合性を保つ。
      - `src/features/auth/hooks/` に配置し `useAuth` と同じ `"use client"` パターンに揃える。
- [ ] `SectionForm`（`src/features/notebook/components/SectionForm.tsx`）を family では非描画に切り替える。TODO コメントを解消する。
      - `useIsOwner()` を先頭で参照し、`false` のときは `null` を返す（family には single-field 編集 UI 自体を出さない）。
      - 表示だけ残したい要件がある場合は `plan.md` を更新して読み取り専用ビューを別途設計する（現状の `screen_spec.md` は「編集 UI 自体を出さない」を明記しているためデフォルトは非描画）。
- [ ] `SectionEntries`（`src/features/notebook/components/SectionEntries.tsx`）に role 分岐を入れる。
      - `useIsOwner()` を参照し、family のときは以下を DOM 上に出さない: 追加ボタン（59-68 行）、`EntryDialog`（79-98 行）、`ConfirmDialog`（100-122 行）。
      - `EntryList` への `onEdit` / `onDelete` を family では渡さず、`readOnly` を `true` にして呼び出す。
      - `EntryCard` の `showActions` が既に `readOnly` で潰されるため、これで編集・削除ボタンも DOM から消える。
- [ ] `EntryList` の props に `readOnly?: boolean` を追加し、`EntryCard` へ透過的に伝播させる（既に `EntryCard.readOnly` は存在するので、途中の配線を追加するのみ）。
- [ ] `MessagesList`（`src/features/messages/components/MessagesList.tsx`）で `NewMessageLink` を family には描画しない（`useIsOwner()` で分岐）。空状態の `EmptyState` の `action` も同様に family では省略、または「共有されている手紙はまだありません」等の文面に差し替える（後者は文面変更のみに留める）。
- [ ] `MessagesList` から遷移する `/messages/new` と `/messages/[id]` の owner 権限ガードを実装する。
      - `src/app/(app)/messages/new/page.tsx` — family が到達したら `/messages` へリダイレクト（ルート側で `useIsOwner()` を参照し、`redirect` または `router.replace`）。
      - `src/app/(app)/messages/[id]/page.tsx` — family には `MessageForm` を描画せず、読み取り専用のシンプルなビュー（宛先・本文・`TimingBadge`）を出す（新規に `MessageView` などの薄いコンポーネントを追加）。編集用の autosave / 削除ボタンは DOM に出さない。
- [ ] 追加・変更した分岐の Vitest（レンダリングテスト）を最小限用意する。既に `AuthProvider` をラップしているテストがあれば、role を `"family"` にした場合の非描画を 1 ケースずつ確認する（`SectionEntries`, `SectionForm`, `MessagesList`, `MessageForm` を優先）。
- [ ] `docs/screen_spec.md` §共通仕様「ロールによる出し分け」を実装が満たしていることを再確認し、家族ロールで到達可能な全画面（dashboard / notebook / messages / family / settings / preview）を手動チェックする。

## 完了条件（DoD）

- [ ] `rg -n "\.filter\([^)]*timing" src/` と `rg -n "\.filter\([^)]*posthumous" src/` が 0 件（クライアント側フィルタが無い）。
- [ ] 家族ロール（`user.role === "family"`）でログインしたブラウザにおいて、以下が DOM 上に存在しない（隠すのではなく描画しない）:
  - [ ] `/notebook/[section]` の single-field フォーム、エントリー追加ボタン、`EntryCard` の編集・削除ボタン、`EntryDialog`、削除確認ダイアログ
  - [ ] `/messages` の「手紙を書く」ボタン、`/messages/new`（アクセス時はリダイレクト）、`/messages/[id]` の autosave フォーム・削除ボタン
- [ ] `/family` は既存の `canManage` 分岐で招待・解除 UI が描画されない（既存動作の維持を確認）。
- [ ] `/settings` は既存の `isFamilyRole` 分岐でノート関連セクションが描画されない（既存動作の維持を確認）。
- [ ] `useIsOwner` の単体テストと、上記コンポーネントの role 分岐 Vitest が緑。
- [ ] `npm run typecheck` / `npm run lint` / `npm run test` が緑。

## リスク / 確認事項

- **`role` が実際に family として付与されるか**: `useMe.ts` の TODO によればサーバー側は未実装のまま。本 Issue で `useIsOwner` を導入しても、実サーバーが `role: "family"` を返さないと family 挙動を実機確認できない。バックエンド側で family 判定を返す実装状況（`kotozute-api` 側の対応 Issue）をユーザーに確認したい。
- **`/messages/[id]` の family 用ビュー**: 実装は追加コンポーネント方針を採用（`MessageView` を新設し、`EditMessagePage` が role で分岐）。`MessageForm` は autosave・削除・作成の複合フォームで、読み取り専用オプションを差し込むと分岐が増えるため。
- **`/preview` の扱い**: Issue の作業内容には明示されていないが、`screen_spec.md` §8 では「家族ロール：閲覧できる範囲のみ出力」とある。preview 画面は現状 API が返す範囲を素直に出すだけなので、本 Issue でクライアント側で新たに `.filter` を入れる作業は発生しない。preview 側で追加の DOM ガードが必要かは、実装時に該当ファイルを再確認して判断する（不要ならタスク追加しない）。
- **`SectionForm` の family モード**: 当初は `null` 返しを想定していたが、`screen_spec.md` §共通仕様に「`always` の項目は family にも見える」とあるため、`SectionFieldsView`（読み取り専用の定義リスト）を新設し family には値を表示する方針に変更。編集 UI（入力・autosave・SavingIndicator）は DOM から一切出さない。

## 参照

- CLAUDE.md
- docs/frontend_design.md
- docs/screen_spec.md（特に §共通仕様、§2 セクション編集、§7 大切な人へ）
- docs/requirements.md
- `src/features/auth/api/useMe.ts`（`AuthRole` の定義）
- `src/features/notebook/components/EntryCard.tsx`（既存 `readOnly` プロップ）
- `src/features/family/components/FamilyContent.tsx`（`canManage` 分岐の参考パターン）
- `src/app/(app)/settings/page.tsx`（`isFamilyRole` 分岐の参考パターン）
