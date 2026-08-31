# Bug #79 — [Bug] 「基本のこと」で名前（full_name）を入力しても「保存中…」のまま完了しない

- URL: https://github.com/hasedai0000/kotozute-web/issues/79
- ラベル: bug
- 報告日: 2026-08-31

## 症状
`/notebook/basic`（「基本のこと」）の「氏名」欄に文字を入力すると、右上の保存インジケータが `保存中…` に切り替わるが、その後 `保存しました` にも `保存できませんでした` にも遷移せず、`保存中…` の表示が残り続ける。

## 再現手順
1. `npm run dev` でローカル起動し、owner ロールでログインする
2. `/notebook/basic` に遷移する
3. 「氏名」欄に任意の文字列（例: `山田 太郎`）を入力する
4. 入力を止めて 1 秒ほど待つ
5. 画面右上の保存インジケータ（`SavingIndicator`）を確認する

## 期待動作 / 実際の動作
- 期待: 入力停止から 800ms 後に PATCH `/note-fields/basic` が発火し、`保存中…` → `保存しました` に遷移する。失敗時は `保存できませんでした` トースト＋`error` 状態
- 実際: `保存中…` のまま `saved` / `error` のいずれにも遷移しない

## エラー情報
```
未記載（Issue 本文でも「未記載」。DevTools Console / Network の情報が未取得）
```

## 環境
- OS: macOS（darwin 23.5.0）
- ブラウザ: 未記載
- 環境: ローカル開発（`npm run dev`）、API は `http://localhost:8000/api`（`.env`）
- 発生日: 2026-08-31

## 調査結果

### 関連コード

**保存経路（フロント側の呼び出しチェーン）:**
- `src/features/notebook/components/SectionForm.tsx:118` — `useAutoSave({ form, mutation, delayMs: 800 })` で自動保存を装着
- `src/features/notebook/hooks/useAutoSave.ts:60-71` — `flush()` は `setStatus("saving")` → `await mutation.mutateAsync(diff)` を実行し、成功時 `saved`／catch 時 `error` に遷移。`mutateAsync` が resolve も reject もしなければ `saving` のまま止まる
- `src/features/notebook/api/usePatchNoteFields.ts:12-22` — `patchNoteFields(section, input)` が `PATCH /note-fields/${section}` を送信。ヘッダーは `readXsrfToken()` が非 null のときのみ `X-XSRF-TOKEN` を付与
- `src/lib/api/client.ts:22-73` — `apiFetch` は `credentials: "include"` 固定。`fetch` 失敗（TypeError 等）は try/catch で `ApiError.networkError` に変換して throw、`!res.ok` は `fromResponse(res)` を throw
- `src/lib/api/errors.ts:77-93` — `fromResponse` は content-type が JSON でなければ statusText のみで `ApiError` を作る

**CSRF 取得の非対称性（重要な発見）:**
| 経路 | `getCsrfCookie()` 呼び出し | `readXsrfToken()` |
|---|---|---|
| auth 系全部（`useLogin` / `useRegister` / `useLogout` / `useUpdateProfile` / `useChangePassword` / `useDeleteAccount`） | あり | あり |
| settings 系全部（`useUpdateDefaultTiming` / `useUpdateNotifications` / `useUpdateGracePeriod`） | あり | あり |
| **notebook 系全部（`usePatchNoteFields` / `useAddEntry` / `useUpdateEntry` / `useDeleteEntry`）** | **なし** | あり |

`grep -rn "getCsrfCookie" src/features/notebook/api/` で notebook 側は誰も `getCsrfCookie()` を呼んでいない。auth/settings は必ずミューテーション実行前に `await getCsrfCookie()` を呼び、XSRF-TOKEN クッキーを最新化してから本リクエストを送っている。

**GET と PATCH の 404 挙動の非対称性:**
- `src/features/notebook/api/useNoteFields.ts:19-22` — GET は 404 を「バック未実装 or 空データ」として吸収し `{ fields: {} }` を返す（**コメントに明記**: `// まだ何も保存されていない or バック未実装。空を返して UI を落とさない。`）
- `src/features/notebook/api/usePatchNoteFields.ts:12-22` — PATCH には同等のガードなし。404 は throw されて `error` 状態になる

これは「バックエンドの `/note-fields/:section` が未実装でも UI は落ちない」設計を GET だけ担保していることを意味する。実装状況次第では PATCH 側で 404 が返る可能性がある。

### 関連ドキュメント / 仕様
- `docs/screen_spec.md` 「2. セクション編集」の「仕様（単一項目）」— 「入力後 debounce 800ms で自動保存。保存状態を『保存中…／保存しました』で示す。失敗時はトースト＋再試行」。仕様どおりの UI は実装済み
- `docs/frontend_design.md` 認証章 — 「ログイン前に CSRF クッキーを取得 → ログイン」と記載。ログイン以降の保護されたミューテーションでの CSRF 再取得ポリシーは明記されていない（＝仕様ギャップ）

### 関連する過去の変更 / Issue
- コミット `ad5c77a` (2026-08-30, `ログインと新規登録機能のバグ修正`) — セッションクッキー名を `laravel_session` → `laravel-session` に変更（`src/lib/auth/session-cookie.ts:5-6`）。認証まわりの直近改修
- コミット `445d5cc` — `useAutoSave` と `SavingIndicator` 追加
- コミット `4ab488b` — `usePatchNoteFields` 追加（この時点で `getCsrfCookie()` を呼ばない実装）
- 類似の過去 Issue / PR: なし

## 原因仮説

### 仮説 A（本命）: XSRF-TOKEN クッキー未取得／期限切れによる CSRF エラー（＋見え方が「hang」になっている）
- **根拠**:
  - `usePatchNoteFields.ts:16` は `readXsrfToken()` のみで、token が null なら `X-XSRF-TOKEN` ヘッダーを付けずに PATCH を送る
  - Laravel Sanctum の SPA 認証では POST/PATCH/PUT/DELETE で CSRF トークンが要求され、不一致・欠落は **419 Page Expired** を返す
  - auth/settings 側の全ミューテーションは必ず `await getCsrfCookie()` を先に呼んでいる（8 箇所）。notebook 側は 0 箇所（4 箇所とも呼ばない）
  - XSRF-TOKEN の有効期限は Laravel の `session.lifetime` に依存し、ログイン直後は付与されるが時間経過や別タブでの操作で失効する余地がある
- **「hang に見える」ことの補足**: 419 が返れば `apiFetch` は throw して `error` 状態になるはずだが、
  - トーストが一瞬出て消える可能性
  - `useAutoSave.ts:74-93` の watch は `flush()` の完了状態に関わらず動くので、`error` になった直後にユーザーが 1 文字追加 → 800ms 後に再度 `flush()` → `setStatus("saving")` に上書き、というループで **常時 `saving` に見える**
  - ユーザーは 419 のトーストを見落とし、常時「保存中…」だけを認識している可能性
- **影響範囲**: notebook 系 4 ミューテーション（`usePatchNoteFields` / `useAddEntry` / `useUpdateEntry` / `useDeleteEntry`）全て。基本セクションに限らず全セクションの単一項目編集、および全カテゴリの EntryDialog CRUD
- **検証方法**:
  1. DevTools Network タブで PATCH `/note-fields/basic` のリクエストヘッダーに `X-XSRF-TOKEN` があるか確認
  2. レスポンスステータスが 419 かを確認
  3. アプリケーション → クッキー で `XSRF-TOKEN` の有無・値・Expires を確認
  4. `document.cookie` を Console で叩き `XSRF-TOKEN=...` があるか確認

### 仮説 B: バックエンドの `PATCH /note-fields/:section` エンドポイントが未実装
- **根拠**:
  - `useNoteFields.ts:20` のコメントに `バック未実装` の記述があり、少なくとも過去の時点で API 側が完成していない前提でフロントが書かれた形跡がある
  - `useNoteFields.ts:8` に `TODO(#20+): OpenAPI に /note-fields/:section が定義され次第、src/types/generated から型を差し替える。` と TODO が残っている
  - GET は 404 を握りつぶすが PATCH は握りつぶさない → 未実装なら PATCH は 404/405 を返し `error` に遷移するはず
- **未検証の点**: 実 API（`kotozute-api` リポジトリ）の実装状況は本リポジトリからは確認不可
- **「hang に見える」ことの補足**: 仮説 A と同じく、`error` → 次のキー入力で `saving` に上書きされてループしている可能性
- **検証方法**: `curl -X PATCH http://localhost:8000/api/note-fields/basic -H 'Content-Type: application/json' -d '{"fields":{"full_name":"x"}}'` のステータスコード確認、または API リポジトリの routes を確認

### 仮説 C: API サーバー（`http://localhost:8000`）が起動していない／CORS プリフライト失敗による fetch 停止
- **根拠**:
  - `.env` の `NEXT_PUBLIC_API_URL=http://localhost:8000/api` に API が居ることを前提としている
  - ローカルで `npm run dev` はフロントのみを起動し、API は別プロセス（compose 等）で起動する必要がある
- **未検証の点**: API プロセスが起動しているかは実行時状況依存
- **「hang」との整合**: `fetch` は失敗時 TypeError で reject（apiFetch が捕捉 → `error` 状態）するのが通常。ただし OS/ネットワーク層で TCP 接続が SYN 待ちのまま停止すると、ブラウザは数分間 pending にすることがある（＝ true な hang として観察されうる）
- **検証方法**: DevTools Network で PATCH のステータス欄が `(pending)` のまま停止していないか、`curl -v http://localhost:8000/api/health` などで API 到達性を確認

### 仮説 D: `useAutoSave` 側で `saving` → `error` 遷移が別の状態遷移で覆される描画バグ
- **根拠**:
  - `useAutoSave.ts:120-127` の `useEffect` は `prevStatusRef.current !== "error"` の判定でトーストを 1 回だけ出すため、`error` → `saving` → `error` のような遷移でも 2 回目のトーストは出ない
  - ただし SavingIndicator 自体は `status === "saving"` を素直に表示するだけなので、状態がループしていれば「常に保存中」に見える
- **未検証の点**: 実際にループしているかは React DevTools で `SectionFormBody` の `auto.status` を観察しないと分からない
- **「hang」との整合**: 上記のとおり、error → saving の遷移が高頻度で発生していれば「常に保存中」に見える

## 修正方針

### 案 1（推奨）: `usePatchNoteFields`（および notebook 系ミューテーション 4 種）で `getCsrfCookie()` を先に呼ぶ
- **変更対象**:
  - `src/features/notebook/api/usePatchNoteFields.ts` の `patchNoteFields` 関数
  - 同じパターンで `src/features/notebook/api/useAddEntry.ts` / `useUpdateEntry.ts` / `useDeleteEntry.ts` も揃える
- **概要**: 各関数の先頭で `await getCsrfCookie();` を呼び、その後 `readXsrfToken()` で最新のトークンを読み取る（auth/settings の各ミューテーションと同じパターン）
- **副作用 / リスク**:
  - 各ミューテーションで往復が 1 回増える（軽微）
  - `getCsrfCookie` が 401/419 を返すケースの取り扱いは既存パターンを踏襲すればよい
  - 破壊的変更なし
- **追加すべきテスト**:
  - `usePatchNoteFields.test.ts` に「PATCH 前に `/sanctum/csrf-cookie` GET が呼ばれる」ケースを追加
  - `useAddEntry.test.ts` / `useUpdateEntry.test.ts` / `useDeleteEntry.test.ts` も同様
  - リグレッションガードとして `src/features/notebook/api/` の全ミューテーションで `getCsrfCookie` を呼ぶことを保証する（既存の `sanctum.test.ts` パターンを参考に）

### 案 2（案 1 と併用推奨）: `useAutoSave` にオブザーバビリティを追加し「hang」を目で確認できるようにする
- **変更対象**: `src/features/notebook/hooks/useAutoSave.ts`
- **概要**:
  - `catch` で `console.error(err)` を追加（現状は `lastError` に保持するだけで console に出ない）
  - `mutateAsync` にタイムアウト（例 15 秒）を掛け、超過時は `AbortError` にして `error` へ遷移
  - `flush()` が既に in-flight のときは同時実行を抑止（次回 flush まで待つ）
- **副作用 / リスク**: タイムアウト値の選定次第で正常系が誤 abort される可能性 → 保守的に 15〜30 秒
- **追加すべきテスト**: タイムアウト時に `error` へ遷移することを Vitest で確認

### 案 3: 共通ヘルパを導入して `apiFetch` の書き込み系呼び出しから CSRF ハンドリングを自動化
- **変更対象**: `src/lib/api/client.ts` もしくは新規 `src/lib/api/mutation-fetch.ts`
- **概要**: `apiFetch` に `method: "POST" | "PUT" | "PATCH" | "DELETE"` を検知して自動で `getCsrfCookie()` を呼ぶオプションを追加、もしくは `mutationFetch` ラッパを作る
- **トレードオフ**:
  - メリット: 将来の新規ミューテーションで CSRF 忘れを構造的に防げる
  - デメリット: Issue #79 のスコープからは外れる。既存 8 箇所（auth/settings）の書き換えも必要になり影響が広い
- **推奨度**: 別 Issue に分離した上で v1 以降に検討

## ユーザー確認事項

1. **切り分けのため以下を教えてほしい**（Issue コメントに追記いただけると助かる）:
   - DevTools Network タブで PATCH `/note-fields/basic` の (a) リクエストが発火しているか (b) レスポンスステータス (c) `X-XSRF-TOKEN` ヘッダーの有無
   - DevTools Application → Cookies で `XSRF-TOKEN` クッキーが存在するか
   - API サーバー（`http://localhost:8000`）は起動している状態か
   - React DevTools で `SectionFormBody` の `auto.status` は本当に `"saving"` 固定か、それとも `saving` ⇄ `error` を高速に往復しているか（仮説 D の裏取り）

2. **修正スコープの確認**:
   - 案 1 のみ（`getCsrfCookie` 追加）で先行修正するか
   - 案 1 ＋ 案 2（オブザーバビリティ追加）を同一 PR で対応するか
   - 案 3（共通ヘルパ化）は Issue を別建てにするか

3. **影響範囲の確認**:
   - `useAddEntry` / `useUpdateEntry` / `useDeleteEntry` も同じ欠陥（`getCsrfCookie` 未呼び出し）を持つため、EntryDialog 経由の追加・編集・削除も同様の症状が出ている可能性がある。あわせて修正するか、それとも #79 は `usePatchNoteFields` に閉じるか

## 参照
- `CLAUDE.md` — 認証はクッキー（`credentials: 'include'`）、トークンをフロントで保持しない
- `docs/frontend_design.md` — 認証（Sanctum SPA・クッキー）章
- `docs/screen_spec.md` — セクション編集（単一項目）章
- `src/features/notebook/hooks/useAutoSave.ts`
- `src/features/notebook/api/usePatchNoteFields.ts`
- `src/features/notebook/api/useNoteFields.ts`（GET 404 フォールバックのコメント）
- `src/features/auth/api/sanctum.ts` — `getCsrfCookie` / `readXsrfToken` 定義
- `src/features/auth/api/useLogin.ts` — CSRF 取得の正しいパターン例
