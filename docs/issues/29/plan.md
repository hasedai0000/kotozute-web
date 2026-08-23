# Issue #29 — W3-09 [F-12] 設定 通知・データエクスポート枠・退会（ConfirmDialog+再認証）

- URL: https://github.com/hasedai0000/kotozute-web/issues/29
- ラベル: frontend, week-3
- マイルストーン: MVP-Week3

## Issue 概要
`/settings` に以下 3 セクションを追加する:
1. **通知**（見直しリマインドの有無）— `Switch`
2. **データエクスポート枠** — MVP は「準備中」表示 + `/preview` への導線ボタン
3. **退会** — `ConfirmDialog` + パスワード再入力（削除範囲を明示）＋家族にも見えなくなる旨

さらに、**家族ロール時はノート関連の設定を隠す** 制約を徹底する。#28 で追加済みの「公開タイミング既定 / 待機期間」に続く区画を担当する。

## 調査結果

### 関連ドキュメント
- `CLAUDE.md` 絶対ルール — 「1. features 単位で割る」→ 通知・エクスポート枠は既存 **新規 feature `src/features/settings/`** に追加、退会は認証系のため **`src/features/auth/`** に mutation を置く（`useLogout` と同じ流儀）。「2. サーバ状態は TanStack Query が唯一の真実」→ 通知フラグは `useQuery`＋`useMutation`。`useState` に写し取らない。「4. トークンをフロントで保持しない」→ `getCsrfCookie()` + `X-XSRF-TOKEN` パターンを踏襲。
- `docs/screen_spec.md` §9 設定 — 「4. 通知：見直しリマインド（年 1 回など）の有無」「5. データ：全データのエクスポート」「6. 危険な操作：退会」「各設定は個別保存（保存後にトースト）」「退会は `ConfirmDialog` ＋ パスワード再入力。**削除されるものを明示**し、家族にも見えなくなることを伝える」「家族ロール：**自分のプロフィールと通知のみ**。ノートの設定は表示しない」— **通知は family でも見せる**、**エクスポート／退会は owner のみ** と読める。ただし退会（アカウント削除）は自アカウントの操作なので family も可能とすべきかは要確認（下記リスクへ）。
- `docs/screen_spec.md` §共通仕様「ロールによる出し分け」— 「編集 owner 可 / family 不可」。ノートの公開タイミング設定変更は owner 限定。
- `docs/frontend_design.md` §UI — デザイントークンを使う。直値カラーコードは書かない。危険操作ボタンは `Button variant="destructive"`。
- `docs/frontend_design.md` §セキュリティ — パスワードはフロントで保持しない。再認証は都度入力させる（既存 `PasswordChangeForm` と同じ流儀で `Input type="password"`＋`autoComplete="current-password"`）。
- `docs/frontend_design.md` §状態管理 — フォームは RHF + Zod、失敗時は 422 の field errors を `form.setError` にマップ、それ以外は `toast.error`。

### 関連コード
- `src/app/(app)/settings/page.tsx:1-72` — 現状は `ProfileForm` / `PasswordChangeForm` / `DefaultTimingSection` / `GracePeriodSection`（後 2 者は `isFamilyRole` で非表示）を配置済み。`const isFamilyRole = user?.role === "family"` の分岐は既にあるため、本 Issue はこの分岐に **通知（両ロール表示）／エクスポート（owner のみ）／退会（owner のみ、または両ロール）** を追加する。
- `src/features/settings/components/DefaultTimingSection.tsx:1-166` — 「取得（`useQuery`）→ RHF + Zod → mutation → toast → 422 field-error 分岐」の完成テンプレート。通知 Switch セクションはこれを縮小したものになる。
- `src/features/settings/api/useNotePreferences.ts:1-49` / `useUpdateGracePeriod.ts:1-49` — snake_case ⇄ camelCase 変換、404 で既定値フォールバック、`queryClient.setQueryData` + `invalidateQueries` の流儀。通知 API も同構造で書く。
- `src/features/auth/api/useChangePassword.ts:1-37` — `getCsrfCookie` → `apiFetch` (`X-XSRF-TOKEN` 付き) → mutation。退会 `useDeleteAccount` はこれの流儀＋成功時 `queryClient.setQueryData(queryKeys.auth.me, null)` + `queryClient.clear()`（`useLogout.ts:24-30` パターン）＋ router.replace('/') の追加。
- `src/features/auth/api/useLogout.ts:1-32` — 「me を null 確定 → clear() → 遷移」の流儀。退会もこれを踏襲。
- `src/features/auth/components/PasswordChangeForm.tsx:1-160` — 現在のパスワード入力 UI、`API_FIELD_TO_FORM_FIELD` による 422 マップ。退会ダイアログの再認証部分でこの UI パターンを再利用（`Input type="password"` + `autoComplete="current-password"`）。
- `src/components/layout/ConfirmDialog.tsx:1-77` — `title`/`description`/`variant="destructive"`/`onConfirm` の既存部品。本 Issue はこれをそのまま使うか、**パスワード入力を伴うため専用の派生ダイアログを新規に作る**（`ConfirmDialog` は description 文字列前提のため、フォーム内包型は別コンポーネントが素直）。
- `src/components/ui/switch.tsx:1-32` — 既存 `@base-ui/react/switch` ラッパー。`data-checked` / `data-unchecked` の状態を持つ。RHF の `Controller` から `checked` + `onCheckedChange` を配線。
- `src/lib/query/queryKeys.ts:1-25` — 現状 `settings.notePreferences` のみ。**追加が必要**：`settings.notifications: ["settings", "notifications"] as const`（通知 API を別エンドポイントにする場合）。または既存 `notePreferences` に notifications を含めるならキー追加は不要（下記リスク参照）。
- `src/providers/AuthProvider.tsx` — `user.role` を配布済み。settings page で既に `useAuth()` を使用中。
- `src/app/(app)/preview/page.tsx:1-8` — 現状はプレースホルダー見出しのみ。エクスポート導線は `next/link` で `/preview` へ遷移するだけで足りる。
- `src/lib/api` の `ApiError` — `err.status === 422 && err.fields?.current_password?.[0]` で「現在のパスワードが違います」を form field error にマップ可能。

### 依存関係
- **先行**: #27（W3-07 プロフィール／パスワード変更）、#28（W3-08 公開タイミング既定＋待機期間）— **いずれも close 済み**。settings page への追加パターンが確立している。
- **並列**: なし。#30（W3-10 プレビュー画面）は `/preview` の実装を進めるが、本 Issue のエクスポート枠は「導線を張るだけ」なので `/preview` の中身が未実装でも成立。
- **後続**: 実際のリマインドメール送信、エクスポート機能本体、退会後の完全削除処理は v1 スコープ（本 Issue は UI と保存 API 呼び出しまで）。

## やること

### スキーマ／型
- [ ] `src/features/settings/schema/notifications.ts` を新規作成
  - `notificationsSchema = z.object({ reminderEnabled: z.boolean() })`
  - `NotificationsInput` / `NotificationPreferences` を export
- [ ] `src/features/settings/schema/notifications.test.ts` — 真偽値の valid / それ以外の invalid
- [ ] `src/features/auth/schema/accountDeletion.ts` を新規作成
  - `accountDeletionSchema = z.object({ currentPassword: z.string().min(1, "現在のパスワードを入力してください") })`
  - `AccountDeletionInput` を export
- [ ] `src/features/auth/schema/accountDeletion.test.ts` — 空文字 invalid、任意の非空文字 valid

### API フック
- [ ] `src/lib/query/queryKeys.ts` に `settings.notifications: ["settings", "notifications"] as const` を追加
- [ ] `src/features/settings/api/useNotifications.ts`（`useQuery`）
  - `fetchNotifications()` → `apiFetch<{ reminder_enabled?: boolean }>("/user/notifications")`
  - snake_case → camelCase 変換、404 は既定値 `{ reminderEnabled: false }` にフォールバック
  - TODO(#W1-08+): OpenAPI 側で `/user/notifications` 定義後に `src/types/generated` から差し替え
- [ ] `src/features/settings/api/useUpdateNotifications.ts`（`useMutation`）
  - `getCsrfCookie()` → PUT `/user/notifications` に `{ reminder_enabled }` を送信
  - `onSuccess` で `queryClient.setQueryData(queryKeys.settings.notifications, next)` + `invalidateQueries`
- [ ] `src/features/auth/api/useDeleteAccount.ts`（`useMutation`）
  - `getCsrfCookie()` → DELETE `/user`（Fortify の delete-user アクション既定）に `{ password }` を送信
  - `onSuccess`：`queryClient.setQueryData(queryKeys.auth.me, null)` → `queryClient.clear()`
  - 422 は field errors を返し、呼び出し側で `form.setError("currentPassword", { message })` する
- [ ] 上記各 `.test.ts` を Vitest で用意（既存 mutation テストと同じく `fetch` を `vi.stubGlobal` で置換）
  - 404 → 既定値フォールバック、200 → mapping、500 → rethrow
  - 退会 mutation：成功時に `me` が null になり `clear()` が呼ばれる／422 で field error 情報を保持

### コンポーネント
- [ ] `src/features/settings/components/NotificationsSection.tsx`
  - `useNotifications` で取得、`useUpdateNotifications` で保存
  - RHF + `zodResolver(notificationsSchema)`
  - `Switch` に `Controller` を巻いて配線（`checked` + `onCheckedChange`）
  - 説明文：「年 1 回、ノートの見直しを促すメールをお送りします」（Issue とscreen_spec を要約）
  - **保存は明示 Submit ボタン**（screen_spec「各設定は個別保存」）
  - 成功時 `toast.success("通知設定を更新しました")`、ローディング時 `Skeleton`
- [ ] `src/features/settings/components/DataExportSection.tsx`
  - MVP は「準備中」ラベル＋説明文（「PDF での書き出しは準備中です。プレビュー画面から印刷でご利用いただけます」）
  - `Button asChild` で `<Link href="/preview">プレビュー画面を開く</Link>`（`next/link` を使用）
  - 保存操作なし
- [ ] `src/features/settings/components/DangerZoneSection.tsx`
  - 見出し「退会」、`Button variant="destructive"` で「アカウントを削除する」→ ダイアログ open
  - **削除範囲の明示**（本文にリスト表示）:
    - お客様のプロフィール／ノートの記入内容／手紙／家族への共有設定
    - **家族にも見えなくなります**（screen_spec 準拠）
    - 操作は取り消せません
  - ダイアログ内：現在のパスワード入力（RHF + Zod、`Input type="password"` + `autoComplete="current-password"`）
  - `useDeleteAccount` 実行 → 成功後 `router.replace("/")`（LP へ）
  - 422 で「現在のパスワードが正しくありません」を field message にマップ、汎用エラーは `toast.error`
  - 二重送信防止（`isSubmitting` + `disabled`）
- [ ] `src/features/settings/components/DeleteAccountDialog.tsx`（`DangerZoneSection` からトリガーされる子）
  - `Dialog` を直接使う（`ConfirmDialog` はフォーム非対応のため）
  - `DialogTitle`「アカウントを削除しますか」、`DialogDescription` に削除範囲、`DialogFooter` に「キャンセル」「削除する」（destructive）
- [ ] 各コンポーネントの `.test.tsx`
  - Notifications：初期値の反映、Switch 切替 → 保存 → mutation 引数の検証
  - DataExport：`/preview` へのリンクが正しく描画される
  - DangerZone / DeleteAccountDialog：
    - 「削除範囲」「家族にも見えなくなる」文言が本文に存在（DoD 1 番目）
    - パスワード空でエラー、正しく入力すると mutation 呼び出し
    - 422 で「現在のパスワードが正しくありません」が field message として表示
    - 成功後 `router.replace("/")` が呼ばれる（`next/navigation` を `vi.mock` で差し替え）

### ページ配線
- [ ] `src/app/(app)/settings/page.tsx` を編集
  - 並び順（owner）: プロフィール → パスワード → 公開タイミング既定 → 待機期間 → **通知** → **データエクスポート** → **退会**
  - 並び順（family）: プロフィール → パスワード → **通知** → **退会**（データエクスポートとノート系設定は非表示。screen_spec §9 準拠）
  - **通知は両ロール共通**なので `isFamilyRole` 分岐の外側に置く
  - **データエクスポートは owner のみ** — screen_spec §9「家族ロール：自分のプロフィールと通知のみ。ノートの設定は表示しない」に従い owner 限定
  - **退会（自アカウント削除）は両ロール** — 自分のアカウント操作のため。ただし文言は role で分岐（下記リスク参照）
- [ ] `src/app/(app)/settings/page.test.tsx` に追記
  - owner ロール：通知／エクスポート／退会が描画される
  - family ロール：通知／退会は描画される、公開タイミング／待機期間／エクスポートは描画されない（DoD 2 番目）
  - 退会本文に「削除されるもの」と「家族にも見えなくなる」旨が含まれる（DoD 1 番目）

## 完了条件（DoD）
Issue 記載の DoD を転記:
- [ ] 退会時に「削除されるもの」と「家族にも見えなくなる」旨が本文に表示
- [ ] 家族ロールでノート設定が現れない（公開タイミング既定／待機期間／データエクスポートを非表示。#28 で追加済みの分岐と統合）

補足（技術要件から追加で必要な項目）:
- [ ] 通知 Switch は個別 Submit ボタン＋成功トースト（screen_spec「各設定は個別保存」）
- [ ] 退会は `ConfirmDialog` 相当（`Dialog` ベース）＋パスワード再入力の 2 段構え
- [ ] `npm run lint`、`npm run typecheck`、`npm run test` がすべて緑

## リスク / 確認事項
- **退会が family ロールでも成立するか**：screen_spec §9「家族ロール：自分のプロフィールと通知のみ」を厳密に読むと、退会 UI も owner 限定になる可能性がある。**しかし「自分のアカウントを消せない」のは UX 上不自然**（家族はメンバー離脱で足りるものの、それは `/family` 側の話）。本 Issue では **両ロールで退会 UI を表示**し、family の場合は文言を「アカウントを削除する（このノートからも離脱します）」に切り替える案で提案。owner 限定にすべきなら教えてほしい。
- **通知 API のエンドポイント命名**：`/user/notifications` を仮採用。既存 `/user/note-preferences` に統合する案（`reminder_enabled` を追加）もあり得るが、note 設定と通知はコンテキストが異なるため分離推奨。バック（Laravel + Scramble）側の最終仕様は #W1-08+ 系で確定予定。TODO コメント付き仮実装で進める。
- **退会 API のエンドポイント**：Fortify 既定の `DELETE /user`（`Features::accountDeletion()` 有効時）を採用予定。バック側で有効化されているか要確認。無効なら独自エンドポイント（例：`DELETE /user/account`）を用意する必要あり。TODO コメント付き仮実装で進める。
- **Switch の保存 UX**：Switch は「即時反映（onChange で mutate）」が一般的だが、screen_spec は「各設定は個別保存」なので **Submit ボタン方式** を採用（`DefaultTimingSection` と一貫）。onChange 即保存にしたければ「未保存状態が視覚的にわかる／保存インジケータ」の追加が必要。**Submit ボタン方式で進める** が、要相談。
- **リマインドの粒度**：Issue は「有無」だけ（bool）。screen_spec も「年 1 回など」の頻度示唆に留まる。MVP は **bool のみ**、頻度選択（月次／年次など）は v1 に持ち越し。
- **データエクスポートの「準備中」表現**：`Button disabled` にするか、`/preview` へのリンクにするか。Issue 本文は「準備中表示 + /preview 導線」なので **リンクボタン + 補足文** で進める（クリックで `/preview` に飛ぶ）。専用 PDF 出力（v1）が実装されたらここを差し替える。
- **退会後の遷移先**：`router.replace("/")`（LP）で提案。ログアウトと同じ挙動。`/login` に遷移させる案もあるが、LP のほうが「退会しました」の情報を出しやすい（ただし LP に success トーストを出すのは違和感があるので、settings 側で `toast.success` してから遷移する形とする）。
- **`ConfirmDialog` の再利用**：既存 `ConfirmDialog` は `description: string` のみのため、パスワード入力欄を持てない。**専用 `DeleteAccountDialog` を `Dialog` 直接ベースで新規作成** する方針。既存 `ConfirmDialog` の拡張（children スロット追加）でも可だが、他の呼び出し箇所（3 箇所）への影響を避けるため新規コンポーネントで進める。
- **`useAuth` の再エクスポート**：settings page は既に `useAuth()` を使用中なので追加変更不要。
- **`(marketing)` / `(auth)` などのルーティング前提**：本 Issue は `(app)/settings/` のみ触るため影響なし。退会後の `/` 遷移は `(marketing)` レイアウト（LP）に到達するため、退会済みユーザーが LP で正しく「未ログイン」表示になることを確認する（`queryClient.clear()` により me が null になるため通常は問題なし）。

## 参照
- CLAUDE.md（features 分割・TanStack Query・トークン非保持・デザイントークン・a11y）
- docs/frontend_design.md（状態管理／API 通信／認証／セキュリティ）
- docs/screen_spec.md §9 設定（通知・データ・退会・家族ロールの範囲）
- docs/screen_spec.md §共通仕様（ロールによる出し分け）
- 既存 `src/features/settings/components/DefaultTimingSection.tsx`（個別保存フォームの完成テンプレート）
- 既存 `src/features/auth/api/useChangePassword.ts` / `useLogout.ts`（CSRF + Fortify 系 mutation の流儀）
- 既存 `src/features/auth/components/PasswordChangeForm.tsx`（再認証 UI テンプレート）
- 既存 `src/components/layout/ConfirmDialog.tsx` / `src/components/ui/dialog.tsx` / `src/components/ui/switch.tsx`
- docs/issues/28/plan.md（#28 で確立した settings 追加パターン）
