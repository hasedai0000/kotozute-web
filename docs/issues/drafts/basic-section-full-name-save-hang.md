# [Bug] 「基本のこと」で名前（full_name）を入力しても「保存中…」のまま完了しない

<!-- meta -->
- type: bug
- labels: bug, notebook
- milestone: 未定
- assignees: 未定

## 症状
`/notebook/basic`（「基本のこと」）の「氏名」欄に文字を入力すると、右上の保存インジケータが `保存中…` に切り替わるが、その後 `保存しました` にも `保存できませんでした` にも遷移せず、`保存中…` の表示が残り続ける。実際に保存が完了しているか（PATCH が成功したか）はユーザー側からは判別できない。

## 再現手順
1. `npm run dev` でローカル起動し、owner ロールでログインする
2. `/notebook/basic` に遷移する
3. 「氏名」欄に任意の文字列（例: `山田 太郎`）を入力する
4. 入力を止めて 1 秒ほど待つ
5. 画面右上の保存インジケータ（`SavingIndicator`）を確認する

## 期待動作 / 実際の動作
- 期待: 入力停止から 800ms 後に PATCH `/note-fields/basic` が発火し、`保存中…` → `保存しました` に遷移する（失敗時は `保存できませんでした` トースト＋`error` 状態）
- 実際: `保存中…` のまま `saved` / `error` のいずれにも遷移しない

## エラー情報
```
未記載（ブラウザ DevTools の Console / Network で PATCH `/note-fields/basic` のステータスとレスポンス、および JS 例外の有無を確認したい）
```

## 環境
- OS: macOS（darwin 23.5.0）
- ブラウザ: 未記載
- 環境: ローカル開発（`npm run dev`）
- 発生日: 2026-08-31

## 影響範囲（推定）
- `/notebook/basic` の owner ロールで確認済み。他セクション（medical / money / digital など）は未検証だが、保存経路は共通（`SectionForm` → `useAutoSave` → `usePatchNoteFields` → `apiFetch`）のため、同じセクション編集の単一項目全般で発生する可能性がある。
- リスト項目（`EntryCard`）側は別経路（`useAddEntry` 等）のため未検証。

## 関連
- 保存経路（フロント）:
  - `src/features/notebook/components/SectionForm.tsx:118` — `useAutoSave({ form, mutation, delayMs: 800 })`
  - `src/features/notebook/hooks/useAutoSave.ts:55-72` — `flush()` は `mutation.mutateAsync(diff)` を await し、成功で `saved`／例外で `error` に遷移する。`saving` のまま止まるのは、`mutateAsync` が resolve も reject もしていない（＝ fetch がハングしている）ケース
  - `src/features/notebook/api/usePatchNoteFields.ts:12-22` — `PATCH /note-fields/${section}` を送信
  - `src/lib/api/client.ts:22-73` — `apiFetch`。`credentials: "include"` 固定。fetch 失敗時は `ApiError.networkError` を throw、`!res.ok` で `fromResponse(res)` を throw する
- フィールド定義:
  - `src/features/notebook/constants/sections.ts:47-73` — 基本セクションの `fields`（`full_name` / `birthdate` / `blood_type` / `emergency_contact`）
- 疑わしい箇所（未検証）:
  - `usePatchNoteFields` は他の認証系ミューテーションと違い `getCsrfCookie()` を呼んでいない（`src/features/auth/api/useLogin.ts` / `useRegister.ts` / `useUpdateProfile.ts` 等は必ず呼ぶ）。XSRF-TOKEN クッキーが未取得／期限切れの状態では `readXsrfToken()` が `null` を返し `X-XSRF-TOKEN` ヘッダーが付かないため、API 側で 419 になる可能性がある。ただしその場合 `apiFetch` が throw して `error` に遷移するはずなので、`保存中` ハング症状の直接原因かは要検証
  - 直近コミット `ad5c77a`（2026-08-30「ログインと新規登録機能のバグ修正」）でセッションクッキー名を `laravel_session` → `laravel-session` に変更している（`src/lib/auth/session-cookie.ts:5-6`）。認証周りの改修が保存経路に副作用を及ぼしていないか要確認
- 関連ドキュメント:
  - `docs/screen_spec.md` 「2. セクション編集」の「仕様（単一項目）」— 「入力後 debounce 800ms で自動保存。保存状態を『保存中…／保存しました』で示す。失敗時はトースト＋再試行」
- 類似の過去 Issue: なし（`gh issue list --state all --search "..."` で該当なし）

## 補足
- 調査時は DevTools Network タブで PATCH `/note-fields/basic` の (a) リクエストが発火しているか (b) レスポンスステータスとボディ (c) 419 なら XSRF-TOKEN クッキー / `X-XSRF-TOKEN` ヘッダーの有無、を確認するとよい
- 「保存中」のまま止まる場合、`useAutoSave.ts:63` の `mutation.mutateAsync(diff)` が resolve/reject していない状態。React DevTools で `SectionFormBody` の TanStack Query 状態（`mutation.status`）を確認すると、`pending` のまま止まっているか、そもそも呼ばれていないかが切り分けられる
