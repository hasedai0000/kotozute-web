---
name: Issue #7 W1-07 plan
description: lib/api ラッパー（credentials:include + エラー整形）の実装前合意ドキュメント
---

# Issue #7 — W1-07 [基盤] lib/api ラッパー（credentials:include + エラー整形）

- URL: https://github.com/hasedai0000/kotozute-web/issues/7
- ラベル: frontend, week-1
- マイルストーン: MVP-Week1

## Issue 概要

すべての API 呼び出しに `credentials: 'include'`（Sanctum クッキー送信）を強制し、レスポンスエラーの形（status / code / message / fields）を `ApiError` としてアプリ全体で共通化するための土台。`src/lib/api/client.ts`（`fetch` 薄ラッパー）と `src/lib/api/errors.ts`（`ApiError`）を新規追加し、Vitest で成功パスとエラー整形の振る舞い分岐（401 / 422 / 429）を検証する。

## 調査結果

### 関連ドキュメント

- `CLAUDE.md`
  - 「絶対ルール」#4: **トークンをフロントで保持しない**。認証はクッキー（`credentials: 'include'`）。localStorage に認証情報を置かない。
  - 「絶対ルール」#3: `src/types/generated/` は手で編集しない（次 Issue #8 で生成される openapi-fetch と、この Issue のラッパーは分離。openapi-fetch は独自に `credentials` を渡す必要があるので、ここで作る `client.ts` は **通常の fetch 用薄ラッパー**として整理する）。
- `docs/frontend_design.md`
  - 「API 通信と型」#3: **`lib/api/` に薄いラッパーを置き、`credentials: 'include'`（クッキー送信）とエラー整形を共通化する**。
  - 「認証（Sanctum SPA・クッキー）」: ログイン前に CSRF クッキー取得 → ログイン。以後ブラウザが httpOnly クッキーを自動送信。**全リクエストで `credentials: 'include'`**。フロントはトークンを保持しない。
- `docs/screen_spec.md`
  - 「共通仕様 - 状態の出し分け」: エラーは「内容と再試行ボタン」、権限起因なら「閲覧権限がありません」。→ `ApiError` から 401/403 を区別できるようにしておく。
  - 「5. ログイン」: 失敗時は「メールアドレスまたはパスワードが正しくありません」（どちらが誤りか明かさない）。→ サーバから来る `message` をそのまま出す設計で足りる（フロントで解釈しない）。
  - 「共通仕様 - オフライン／通信失敗」: 「保存できませんでした」トースト＋再試行。→ ネットワーク層の失敗（fetch reject）も `ApiError` に包む必要がある。

### 関連コード

- `src/lib/api/` — 現状 `.gitkeep` のみ。**client.ts / errors.ts はいずれも新規作成**。
- `src/lib/query/queryClient.ts` — TanStack Query は `retry: 1`（クエリ）／`retry: 0`（ミューテーション）で設定済み。→ `ApiError.status === 401 / 422` などのリトライしても意味がないケースは、この Issue のスコープではなく features 側の `queryFn` / `mutationFn` 側でハンドリング（今回はハンドラを提供する型設計だけを行う）。
- `.env.example` — `NEXT_PUBLIC_API_URL=http://localhost:8000/api`（クライアント公開）、`API_URL=http://localhost:8000/api`（サーバ専用）。**BASE_URL は `NEXT_PUBLIC_API_URL` を使う**（クライアント側 fetch なので）。SSR/RSC 経由で叩く場合は将来 `API_URL` を優先する分岐を入れられるように、`baseUrl` 引数で上書き可能にしておく（過剰実装は避け、既定値だけ提供）。
- `src/app/layout.tsx` — `QueryProvider` はセット済み。`AuthProvider` は未導入（Issue #9 の担当）。→ この Issue は Provider に依存しない純ロジックのみ。
- `src/features/*/api/` — 全て空（`.gitkeep` のみ）。features 側の TanStack Query フックは後続 Issue で書かれるが、そこから `import { apiFetch, ApiError } from '@/lib/api'` で使える形にしておく。
- `vitest.config.mts` — `environment: 'jsdom'`, `globals: false`, `include: src/**/*.test.{ts,tsx}`, `setupFiles: ['./vitest.setup.ts']`。**`describe/it/expect` は明示 import**。既存パターン: `src/lib/utils.test.ts`。
- grep 結果: `credentials`, `X-Requested-With`, `ApiError` の既存参照は **一切なし**（新規導入で確定）。

### 依存関係

- 先に必要: **なし**。#5 TanStack Query、#6 RHF+Zod は closed 済みで、この Issue はさらに独立（Provider にも RHF にも依存しない純ユーティリティ）。
- 直接の後続:
  - **#8 W1-08 openapi-typescript + openapi-fetch と generate:api** — 生成された openapi-fetch クライアントに `credentials: 'include'` と `X-Requested-With` を渡す設定を書く際、この Issue の `errors.ts`（`ApiError`）を **共通のエラー型**として再利用する。`client.ts` の薄ラッパー自体は openapi-fetch と併存（自前の fetch が必要な CSRF エンドポイント、後続の Sanctum 前処理などで使う）。
  - **#9 W1-09 AuthProvider + middleware ガード** — Sanctum の CSRF cookie 取得 → login の一連の fetch でこの `client.ts` を使う。401 応答時のリダイレクト判定に `ApiError.status` を使う。
- 関連: 以降ほぼ全ての features/*/api（#13, #17 以降）でこの `ApiError` に依存する。

## やること

- [ ] `src/lib/api/errors.ts` を新規追加
  - `ApiError` クラス（`extends Error`）を定義
    - フィールド: `status: number`（HTTP ステータス）、`code?: string`（サーバ側で付与される機械可読コード。無ければ `undefined`）、`message: string`（表示可能なメッセージ）、`fields?: Record<string, string[]>`（Laravel の 422 レスポンス `errors` 形式）
    - コンストラクタで `super(message)` して `this.name = 'ApiError'` を設定
    - `static isApiError(err: unknown): err is ApiError` のガード関数（`instanceof` チェックだけで OK。features 側で `if (ApiError.isApiError(err))` で分岐できるように）
  - 便宜ヘルパー（過剰実装しない範囲）:
    - `is401(): boolean` / `is422(): boolean` / `is429(): boolean` はメソッドで生やさず、features 側で `err.status === 401` と書く方針（コードを短く保つ）。
  - Response から `ApiError` を生成する `async fromResponse(res: Response): Promise<ApiError>` を **同ファイル内でエクスポート**（テストしやすく、client.ts から使う）
    - JSON パース失敗時は `message = res.statusText || 'Request failed'` にフォールバック
    - Laravel の 422 レスポンス shape `{ message, errors: { field: string[] } }` を検出したら `fields` に詰める
    - サーバから `code`（もしくは相当のキー）が返っていれば拾う（無ければ `undefined`）
  - ネットワーク失敗用に `ApiError.networkError(cause: unknown): ApiError` を用意（`status = 0`, `message = 'ネットワークに接続できませんでした'`）
- [ ] `src/lib/api/client.ts` を新規追加
  - `const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ''`（無ければ相対 URL でフォールバック）
  - `export type ApiRequestInit = Omit<RequestInit, 'headers'> & { headers?: HeadersInit; json?: unknown; baseUrl?: string }`
  - `export async function apiFetch<T = unknown>(path: string, init?: ApiRequestInit): Promise<T>` を実装
    - `path` が絶対 URL でなければ `baseUrl + path` に解決（`baseUrl` は引数優先、無ければ `BASE_URL`）
    - **必ず `credentials: 'include'` を強制**（呼び出し側が `credentials: 'omit'` を渡しても上書きされる。ドキュメント文字列に「Sanctum クッキー必須のため上書き禁止」と明記）
    - デフォルトヘッダ: `Accept: application/json`, `X-Requested-With: XMLHttpRequest`（Laravel の AJAX 判定用。呼び出し側 `headers` とマージ）
    - `init.json` が渡されたら `body: JSON.stringify(json)` にして `Content-Type: application/json` を付ける
    - `fetch` を `try/catch` で包み、reject（ネットワーク失敗）は `throw ApiError.networkError(cause)`
    - `!res.ok` なら `throw await ApiError.fromResponse(res)`
    - 204 / `Content-Length: 0` は `return undefined as T`（呼び出し側で `void` 型を指定）
    - それ以外は `return res.json() as Promise<T>`
  - **CSRF cookie の取得は client.ts に組み込まず**、Sanctum 特化の関数（例: `await apiFetch('/sanctum/csrf-cookie', { method: 'GET' })`）を呼ぶだけで済ませる。ラッパー内で自動発火はしない（副作用を持たせない）。→ 実際のログインフロー結線は #9 の担当。
- [ ] `src/lib/api/index.ts` を新規追加
  - `export { apiFetch, type ApiRequestInit } from './client'`
  - `export { ApiError } from './errors'`
  - features 側は `import { apiFetch, ApiError } from '@/lib/api'` の 1 行で済む
- [ ] `src/lib/api/errors.test.ts` を新規追加（Vitest）
  - **422 のパース**: `fromResponse` に `Response` モックを渡し、`fields` に `{ email: ['...'] }` が入ることを検証
  - **401 のパース**: `code` / `message` が抽出され、`status === 401` になることを検証
  - **429 のパース**: `status === 429` かつ `message` が拾えることを検証（`Retry-After` は将来拡張。今回は保持しない）
  - **JSON パース失敗のフォールバック**: `Response` が `text/html` を返した場合、`message = statusText` にフォールバック
- [ ] `src/lib/api/client.test.ts` を新規追加（Vitest）
  - `globalThis.fetch` を `vi.stubGlobal('fetch', vi.fn())` でモック（`vitest` の `vi` を使う）
  - **成功パス**: `fetch` が 200 + JSON を返すとき、`apiFetch` がその JSON をそのまま返す
  - **credentials 強制**: `fetch` に渡された init の `credentials` が `'include'` であることを assert（呼び出し側で `credentials: 'omit'` を渡しても上書きされる）
  - **X-Requested-With ヘッダ**: `fetch` に渡された Headers に `X-Requested-With: XMLHttpRequest` が入ることを assert
  - **エラーで throw**: 422 レスポンスに対して `apiFetch` が `ApiError` を throw し、`err.fields` に入ることを assert
  - `.gitkeep` を削除

## 完了条件（DoD）

Issue に記載の DoD を転記:

- [ ] `ApiError` の型が features 側から `import { ApiError } from '@/lib/api'` で使える
- [ ] 429 / 401 / 422 のケースで振る舞い分岐（`status` / `code` / `fields` の抽出）が Vitest で検証される
- [ ] （追加）`npm run typecheck` と `npm run test` が通る
- [ ] （追加）`npm run lint` が通る

## リスク / 確認事項

- **エラー shape の想定**: 現時点で kotozute-api の OpenAPI（Scramble 出力）が確定していないため、Laravel 標準の 422 形式 `{ message, errors: { [field]: string[] } }` と、任意フィールド `code` を前提に実装する。実 API が異なる shape を返す場合は #8 で openapi-fetch の型と突き合わせて再調整する。→ この Issue では **`code` は optional** とし、無くても動くように書く。
- **openapi-fetch との重複**: 次 Issue #8 で openapi-fetch が入る。openapi-fetch は自前で fetch を持つので、この Issue の `apiFetch` は **CSRF cookie 取得や、生成外エンドポイント（存在しないなら将来削除）で使う汎用フェッチャ**として位置づける。ただし `ApiError` は両者共通の戻り値エラー型とする。→ 実装コメントで「openapi-fetch と併存。ApiError を共有する」ことを 1 行だけ書く。
- **`X-Requested-With` の必要性**: Laravel は伝統的にこのヘッダで AJAX を判定して 419 / 401 のリダイレクトを抑止する。付けても害はないので付ける。ただし CORS のプリフライトが増える点は許容（同一サイトなら影響小）。
- **`NEXT_PUBLIC_API_URL` の空フォールバック**: 未設定時に `''` にすると相対 URL 呼び出しになり、SSR コンテキストで壊れる可能性がある。→ 今回はクライアント fetch を想定しているので許容。SSR で叩くパスが出てきたら `API_URL` を使う別ラッパーを足す（今回のスコープ外）。
- **CSRF cookie 取得の自動化**: `apiFetch` 内で自動的に `/sanctum/csrf-cookie` を叩く設計は **採用しない**（副作用増、テスト難、初回以外は冗長）。呼び出し側（#9 の AuthProvider / useLogin）で明示的に叩く方針で合意したい。
- **エクスポート面**: `ApiError` を class で export するか、type + factory で export するかは class 一択（`instanceof` 判定のため）。TanStack Query の `throwOnError` などの機構と相性が良い。

## 参照

- `CLAUDE.md`（絶対ルール #3 #4）
- `docs/frontend_design.md`（「API 通信と型」「認証（Sanctum SPA・クッキー）」）
- `docs/screen_spec.md`（「共通仕様 - 状態の出し分け」「5. ログイン」）
- 既存: `src/lib/query/queryClient.ts`（retry ポリシー）、`src/lib/utils.test.ts`（テストパターン）、`.env.example`（`NEXT_PUBLIC_API_URL`）
