# Issue #28 — W3-08 [F-12] 設定 公開タイミング既定 + 待機期間スライダー

- URL: https://github.com/hasedai0000/kotozute-web/issues/28
- ラベル: frontend, week-3
- マイルストーン: MVP-Week3

## Issue 概要
`/settings` に「公開タイミング既定」と「待機（撤回）期間」の 2 セクションを追加する。既定タイミングは `always`/`posthumous` のラジオ、待機期間は 3〜30 日のスライダー（既定 7 日）。**個別保存**（それぞれ独立の Submit ボタン＋成功トースト）。DoD は「3 未満 / 30 超に設定不能」と「family ロールでは本セクションを非表示」。#27 で配置済みのプロフィール／パスワード変更セクションに続けて並べる。

## 調査結果

### 関連ドキュメント
- `CLAUDE.md` 絶対ルール — 「1. features 単位で割る」→ **新規 feature `src/features/settings/`** を作り、`api/`, `components/`, `schema/` を配置。`src/app/(app)/settings/page.tsx` は薄い配線のみ。「2. サーバ状態は TanStack Query が唯一の真実」→ ユーザーの note 既定タイミング／待機日数は API 由来のため `useNotePreferences` の `useQuery` + `useMutation` で扱い、`useState` に写し取らない。「4. トークンをフロントで保持しない」→ 既存 `getCsrfCookie()` + `X-XSRF-TOKEN` パターンを踏襲（`useUpdateProfile.ts` を参考）。「6. 意味で色分け（`TimingBadge`）」→ ラジオの説明表示に `TimingBadge` を再利用可能。
- `docs/screen_spec.md` §9 設定 — 「2. 公開タイミングの既定：新規項目を `always` / `posthumous` のどちらで作るか」「3. 待機（撤回）期間：3〜30 日のスライダー／数値入力。既定 7 日」「各設定は個別保存（保存後にトースト）」。**説明文の指定**：「ご家族が死後開示を発動してから、実際に公開されるまでの猶予期間です。この間にご本人が取り消せます」→ **Issue 本文はこれを短縮しているが、screen_spec が優先** なのでこの正式文を採用。「家族ロール：自分のプロフィールと通知のみ。ノートの設定は表示しない」→ family ロールでは公開タイミング既定と待機期間の両方を非表示。
- `docs/screen_spec.md` §共通仕様「ロールによる出し分け」— 「編集 owner 可 / family 不可」「公開タイミングの変更 owner 可 / family 不可」。この UI は owner のみ描画で徹底。
- `docs/frontend_design.md` §状態管理 — フォームは RHF + Zod、サーバ状態は TanStack Query。**「YOU MUST：サーバ状態を `useState` に写し取らない」** → `defaultValues` は fetch 結果を渡す一度きり、以降は RHF が真実の源、更新後は `queryClient.setQueryData` または invalidate で TanStack Query キャッシュを更新。
- `docs/frontend_design.md` §UI — デザイントークンを使う。Tailwind theme に定義された `timing-*` トークンがある（`TimingBadge.tsx` で使用）。直値カラーコードは書かない。

### 関連コード
- `src/app/(app)/settings/page.tsx:1-35` — 現状は `ProfileForm` と `PasswordChangeForm` の 2 セクション（#27 で配置済み）。**本 Issue で `DefaultTimingSection` と `GracePeriodSection` を追加**（`Separator` で区切って並べる）。**family ロール判定を追加**し、両セクションを非表示にする（`dashboard/page.tsx:11-13` と同じパターン：`const isFamilyRole = user?.role === "family"`）。
- `src/features/auth/api/useUpdateProfile.ts:1-50` — mutation テンプレート。`getCsrfCookie()` → `apiFetch` (`X-XSRF-TOKEN` 付き) → `queryClient.setQueryData` + `invalidateQueries` の流れをそのまま踏襲する。OpenAPI 未定義のため TODO コメント（`// TODO: OpenAPI で /user/note-preferences 定義後に src/types/generated から差し替え`）を残す。
- `src/features/auth/components/ProfileForm.tsx:1-155` — 個別保存フォームの構造テンプレート。`toast.success`、`ApiError.isApiError` による 422 分岐、`Skeleton` によるローディング、`isSubmitting` の二重送信防止は本 Issue の 2 セクションでも同構造で書く。
- `src/features/notebook/components/TimingBadge.tsx:1-36` — `variant: "always" | "posthumous"` の共通部品。ラジオ選択肢の視覚補助として使うと screen_spec の色設計と一致する。
- `src/features/notebook/components/EntryDialog.tsx:53` — `TIMING_VALUES = ["always", "posthumous"] as const` と同一のリテラルユニオンを本 Issue でも使う。schema はここに寄せず、`src/features/settings/schema/notePreferences.ts` に新規定義（両 feature 間の循環依存を避けるため）。
- `src/components/ui/radio-group.tsx`、`src/components/ui/slider.tsx`、`src/components/ui/label.tsx`、`src/components/ui/separator.tsx` — すべて既に存在。追加インストール不要。
- `src/lib/query/queryKeys.ts:1-22` — `settings` 名前空間が未定義。**追加が必要**：`settings: { notePreferences: ["settings", "notePreferences"] as const }`。
- `src/lib/api/client.ts` の `apiFetch` と `src/features/auth/api/sanctum.ts` の `getCsrfCookie` / `readXsrfToken` — 既存 mutation と同じ形で呼び出す。
- `src/types/generated/api.ts` — 現状 `/health` のみ。**note preferences のエンドポイントは未定義**。既存 `useUpdateProfile` / `useChangePassword` と同様に TODO コメント付きの生 URL で仮実装する（バック側の Scramble 生成後に差し替え）。
- `src/providers/AuthProvider.tsx:1-30` — `user.role` を context で配布済み。`useAuth()` を settings page で参照して分岐する。

### 依存関係
- **先行**: #27（W3-07 プロフィール／パスワード変更）→ **既に close 済み**。settings page への配線パターンが確立している。
- **並列**: #29（W3-09 通知・エクスポート枠・退会）— 同じ `/settings` の別セクションを触るが、本 Issue は「公開タイミング既定」と「待機期間」の 2 セクションのみ担当。#29 とファイルは競合し得る（`settings/page.tsx`）が、追加位置を分ければ merge 可。
- **参照のみ**: v1 の disclosure 発動 UI（#26 系ではなく将来スコープ）が本 Issue の「待機期間」設定値を消費するが、**MVP では設定を保存できることまで**。実際に消費されるのは v1。

## やること

### スキーマ／型
- [ ] `src/features/settings/schema/notePreferences.ts` を新規作成
  - `TIMING_VALUES = ["always", "posthumous"] as const`
  - `defaultTimingSchema = z.enum(TIMING_VALUES)`（メッセージ：「公開タイミングを選択してください」）
  - `gracePeriodSchema = z.number().int({...}).min(3, "3日以上で指定してください").max(30, "30日以下で指定してください")`
  - `notePreferencesSchema = z.object({ defaultTiming, gracePeriodDays })`
  - `DefaultTimingInput` / `GracePeriodInput` / `NotePreferences` 型を export
- [ ] `src/features/settings/schema/notePreferences.test.ts`（Vitest）
  - 3 / 7 / 30 は valid、2 / 31 / 3.5 は invalid
  - `always` / `posthumous` は valid、それ以外は invalid

### API フック
- [ ] `src/lib/query/queryKeys.ts` に `settings: { notePreferences: ["settings", "notePreferences"] as const }` を追加
- [ ] `src/features/settings/api/useNotePreferences.ts`（`useQuery` で fetch）
  - `fetchNotePreferences()` → `apiFetch<NotePreferences>("/user/note-preferences")`
  - TODO: OpenAPI 定義後に `src/types/generated` から差し替え
- [ ] `src/features/settings/api/useUpdateDefaultTiming.ts`（`useMutation`）
  - `getCsrfCookie()` → PUT `/user/note-preferences`（`{ default_timing }` のみ送信）
  - `onSuccess` で `queryClient.setQueryData` + `invalidateQueries({ queryKey: queryKeys.settings.notePreferences })`
- [ ] `src/features/settings/api/useUpdateGracePeriod.ts`（`useMutation`）
  - 同上、`{ grace_period_days }` のみ送信
- [ ] 上記各 `.test.ts` を Vitest で用意（MSW 相当は既存パターンを踏襲：`apiFetch` を spy／mock）

### コンポーネント
- [ ] `src/features/settings/components/DefaultTimingSection.tsx`
  - `useNotePreferences` から取得、`useUpdateDefaultTiming` で保存
  - RHF + `zodResolver(z.object({ defaultTiming: defaultTimingSchema }))`
  - `RadioGroup` で `always` / `posthumous` を選択（各項目に `TimingBadge` を並べて色で意味を補強）
  - Submit ボタン単独、成功時 `toast.success("公開タイミングの既定を更新しました")`
  - ローディング時 `Skeleton`
- [ ] `src/features/settings/components/GracePeriodSection.tsx`
  - RHF + `zodResolver(z.object({ gracePeriodDays: gracePeriodSchema }))`
  - `Slider`（`min=3`、`max=30`、`step=1`）＋ 現在値を数値で表示（`Input type="number"` 併記でキーボード操作も可能に）
  - 説明文（正式版）：「ご家族が死後開示を発動してから、実際に公開されるまでの猶予期間です。この間にご本人が取り消せます」
  - Submit ボタン単独、成功時 `toast.success("待機期間を更新しました")`
- [ ] 各コンポーネントの `.test.tsx`（Vitest + React Testing Library）
  - 初期値表示、変更 → 保存 → mutation 呼び出し確認
  - `gracePeriodDays` が 2 / 31 の場合はサブミット不能（エラー表示）
  - 422 エラー時のフィールドエラー表示、汎用エラートースト

### ページ配線
- [ ] `src/app/(app)/settings/page.tsx` を編集
  - `useAuth()` を import し `isFamilyRole = user?.role === "family"` を計算
  - `isFamilyRole` の場合は既存プロフィール／パスワードのみ表示（#29 で family 用に更に絞る予定なので本 Issue では触らない）
  - **owner 時のみ** `Separator` の後に `DefaultTimingSection` と `GracePeriodSection` を追加
  - screen_spec §9 の並び順に合わせる：プロフィール → 公開タイミング既定 → 待機期間 → （#29 で通知／エクスポート／退会が続く）
- [ ] `src/app/(app)/settings/page.test.tsx`（新規または既存があれば追記）
  - owner ロール：両セクションが描画される
  - family ロール：両セクションが描画されない（DoD 2 番目）

## 完了条件（DoD）
Issue 記載の DoD を転記:
- [ ] 待機期間が 3 未満 / 30 超に設定不能（Zod + Slider の `min`/`max` で二重に保証。Vitest でスキーマ境界を検証）
- [ ] 家族ロールでは本セクションを非表示（`useAuth().user?.role === "family"` で分岐、Vitest でロール別描画を検証）

補足（技術要件から追加で必要な項目）:
- [ ] 各セクションは個別 Submit ボタン＋成功トーストで独立保存
- [ ] 説明文（screen_spec 準拠）を待機期間セクションに表示
- [ ] `npm run lint`、`npm run typecheck`、`npm run test` がすべて緑

## リスク / 確認事項
- **API エンドポイントの命名**：`/user/note-preferences` を仮採用しているが、バック（Laravel + Scramble）側で最終的にどこに置くかは未確定。既存の `/user/profile-information`（Fortify 準拠）と揃えるか、独自 `/user/note-preferences` にするかは #W1-08+ 系で確定予定。**本 Issue では TODO コメント付き仮実装で進める**。プランで問題ないか確認してほしい。
- **リクエストボディの key 名**：Laravel 慣習に合わせ `default_timing` / `grace_period_days`（snake_case）で送る想定（`useChangePassword.ts` が `current_password` を送っているのと同様）。フロントの型は camelCase、送信時のみ変換する。
- **Slider の値表示 UI**：Issue は「スライダー」だが、screen_spec §9 は「スライダー／数値入力」と両方を許容。**キーボード操作性・a11y 上、Slider 単独より Slider + `Input type="number"`（同期）が望ましい**と判断し提案。不要なら数値表示のみに縮小可能。
- **`TimingBadge` のラジオ内利用**：`RadioGroup` の各選択肢に `TimingBadge` を並べて色で意味を強化する予定。過剰な装飾と判断されればテキストラベルのみに縮小可能。
- **`useNotePreferences` の空状態**：初回ユーザー（サーバに設定行が無い）で 404 が返る場合の扱い。既存 `fetchMe` は 401/419 で null 返却する。同様に 404 で既定値（`always` / 7 日）を返すか、バック側で必ずレコードを作るか要相談。**MVP はバック側で登録時に既定値レコードを作る前提で進める**。
- **#29 とのファイル衝突**：`settings/page.tsx` の追記位置を「プロフィール → 公開タイミング → 待機期間 → （#29 用の空きスペース）」と明確化し、`Separator` を各セクション間に挟む方針で先取り対応する。
- **`(marketing)` / `(auth)` などのルーティング前提**：本 Issue は `(app)/settings/` のみ触るため影響なし。

## 参照
- CLAUDE.md（features 分割・TanStack Query・トークン非保持・デザイントークン・a11y）
- docs/frontend_design.md（状態管理の役割分担・API 通信と型・認証）
- docs/screen_spec.md §9 設定（公開タイミング既定・待機期間・家族ロール非表示・個別保存）
- docs/screen_spec.md §共通仕様（ロールによる出し分け）
- 既存 `src/features/auth/api/useUpdateProfile.ts` / `src/features/auth/components/ProfileForm.tsx`（個別保存フォームのテンプレート）
- 既存 `src/features/notebook/components/TimingBadge.tsx`（`TimingVariant` の共通型）
