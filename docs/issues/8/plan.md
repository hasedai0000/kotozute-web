---
name: Issue #8 W1-08 plan
description: openapi-typescript + openapi-fetch と generate:api の実装前合意ドキュメント
---

# Issue #8 — W1-08 [基盤] openapi-typescript + openapi-fetch と generate:api

- URL: https://github.com/hasedai0000/kotozute-web/issues/8
- ラベル: frontend, week-1
- マイルストーン: MVP-Week1

## Issue 概要

Laravel（Scramble）が公開する OpenAPI 仕様から、TS 型と型付き fetch クライアントを自動生成する土台を作る。`openapi-typescript` / `openapi-fetch` を追加し、`npm run generate:api` で `src/types/generated/api.ts` を出力。`src/lib/api/openapi.ts` で `createClient<paths>` を初期化し、既存の `apiFetch` / `ApiError`（#7 で導入済み）と併存させて Sanctum クッキー送信・エラー整形を共通化する。生成物は git 管理し、ESLint / prettier からは除外する。**手編集禁止**を README にも明記する。

## 調査結果

### 関連ドキュメント

- `CLAUDE.md`
  - 「絶対ルール」#3: **`src/types/generated/` は手で編集しない**（OpenAPI から再生成する）。→ このスキーマ生成器の導入が本 Issue のスコープ。
  - 「絶対ルール」#4: **トークンをフロントで保持しない**。認証はクッキー（`credentials: 'include'`）。→ `openapi-fetch` の初期化でも `credentials: 'include'` を必ず渡す。
  - 「コマンド」: `npm run generate:api`（OpenAPI → `src/types/generated/`）。→ スクリプト名は既に決まっている。
- `docs/frontend_design.md`
  - 「API 通信と型」#1〜#5: バックの Scramble が OpenAPI を出す真実持ち → フロントは `openapi-typescript`（型）＋ `openapi-fetch`（typed fetch）で `src/types/generated/` に生成 → `lib/api/` の薄いラッパーで `credentials: 'include'` とエラー整形を共通化 → 各 feature の `api/` で TanStack Query フックにする → 契約変更を CI でビルド検出。→ 本 Issue はこの生成パイプラインの入口。
- `docs/screen_spec.md`
  - 「共通仕様 - 状態の出し分け」: エラーは `ApiError` を通して一貫した UX を提供する。→ `openapi-fetch` の `error` レスポンスも `ApiError` に整形する（#7 の `fromResponse` を再利用）。

### 関連コード

- `src/lib/api/client.ts` / `errors.ts` — **#7 で完成済み**。`apiFetch`（自前 fetch 薄ラッパー）＋ `ApiError` ＋ `fromResponse(res)` が揃っている。本 Issue の `openapi.ts` はこれらを **再利用**（重複実装しない）:
  - `credentials: 'include'` の強制
  - `Accept: application/json` / `X-Requested-With: XMLHttpRequest` の付与
  - エラーレスポンスの `ApiError` 変換（`fromResponse`）
  - ネットワーク失敗の `ApiError.networkError` 変換
  - **注意**: `errors.ts` の `fromResponse` は現在 `export async function fromResponse` としてエクスポート済み（`client.ts` から `import { ApiError, fromResponse } from "./errors"`）。openapi.ts からも同じシンボルを import する。
- `src/lib/api/index.ts` — 現状 `apiFetch` / `ApiRequestInit` / `ApiError` のみ再エクスポート。**本 Issue で `apiClient`（openapi-fetch の型付きクライアント）を追加**する。
- `src/types/generated/` — `.gitkeep` のみ。**`.gitkeep` は残したまま**、`api.ts` を追加で生成する（`.gitignore` の除外対象ではないため、生成物は git 管理される）。
- `.gitignore` — `src/types/generated/` の除外指定は **無い**。→ Issue の「生成物は git 管理する方針」と一致。追加変更は不要。
- `eslint.config.mjs` — 現在の `globalIgnores` は `.next/**`, `out/**`, `build/**`, `next-env.d.ts` のみ。**本 Issue で `src/types/generated/**` を追加**する。
- **prettier 設定は無い**（`.prettierrc*` / `prettier.config.*` いずれも未配置、`package.json` に prettier 依存も無い）。→ DoD に「prettier で生成物を除外」とあるが、prettier 自体が未導入。方針判断が要る（下記「リスク」参照）。
- `package.json`
  - 依存に `openapi-typescript` / `openapi-fetch` は無し → 本 Issue で追加。
  - `scripts` に `generate:api` は無し → 追加。
- `.env.example` — `NEXT_PUBLIC_API_URL=http://localhost:8000/api` / `API_URL=http://localhost:8000/api`。**OpenAPI 仕様の取得元 URL は別で必要**（Scramble が公開する `/docs/api.json` 等）。→ 環境変数 `OPENAPI_URL` を新設し、フォールバックとしてリポジトリ内のダミー spec を読むようにする（DoD「ダミー spec で成功する」を満たすため）。
- `README.md` — 「主なコマンド」テーブルに `generate:api` を追記できる場所がある。手編集禁止の方針もここに明記する。
- `src/features/*/api/` — 全て空（`.gitkeep` のみ）。→ 本 Issue のスコープは「配管まで」。実際に typed client を呼ぶのは #13 以降の features/*/api。
- 検索: `openapi-fetch`, `openapi-typescript`, `createClient` の既存参照は **一切なし**（純新規導入で確定）。

### 依存関係

- 先に必要: **#7 W1-07 lib/api ラッパー（`ApiError` / `fromResponse`）**。closed 済み。本 Issue はこの `ApiError` を openapi-fetch 側でも共通利用する形で組み込む。
- 直接の後続:
  - **#9 W1-09 AuthProvider + middleware ガード** — `/api/me` 等の呼び出しで、typed client（本 Issue 成果）または手動 `apiFetch`（#7 成果）のどちらかを使う。CSRF cookie 取得（`/sanctum/csrf-cookie`）は spec に載らないため手動 `apiFetch` を使う想定。→ 本 Issue の完了後、#9 の設計選択が固まる。
  - **#13 以降の features/*/api** — `useNote` / `useAddEntry` などで typed client を直接 import して TanStack Query の `queryFn` / `mutationFn` に渡す。
- 関連（Issue 本文に無いが把握しておくべきこと）:
  - バックエンド `kotozute-api` の Scramble 公開 URL の実体が未確定。ローカルでは `http://localhost:8000/docs/api.json`（Scramble 既定）を想定するが、本 Issue のスコープは「取得元 URL を差し替え可能にする」までで、実 URL 疎通確認はしない（ダミー spec のみ検証）。

## やること

- [ ] 依存追加
  - `npm install --save openapi-fetch`
  - `npm install --save-dev openapi-typescript`
  - `package.json` の `dependencies` / `devDependencies` に反映されることを確認
- [ ] `openapi/openapi.dummy.json` を新規作成（ダミー spec）
  - 最小構成の OpenAPI 3.1 spec を 1 本コミット（`GET /health` などのダミーエンドポイント 1 つで十分）
  - 用途: `OPENAPI_URL` 未設定時のフォールバック、および `npm run generate:api` がオフラインでも成功することの保証（DoD 対応）
- [ ] `package.json` に `generate:api` スクリプトを追加
  - `"generate:api": "openapi-typescript ${OPENAPI_URL:-./openapi/openapi.dummy.json} -o src/types/generated/api.ts"`（zsh/bash パラメータ展開）
  - 環境変数 `OPENAPI_URL` が未設定ならダミーを使う運用
  - Windows の PowerShell 対応は非スコープ（開発機は macOS/Linux 前提）
- [ ] `src/lib/api/openapi.ts` を新規作成
  - `import createClient from "openapi-fetch"`
  - `import type { paths } from "@/types/generated/api"`
  - `import { ApiError, fromResponse } from "./errors"`
  - `apiClient = createClient<paths>({ baseUrl, credentials: "include", headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" } })` を初期化
  - openapi-fetch は成功時 `{ data }`、失敗時 `{ error, response }` を返す設計だが、features 側でも `ApiError` として `throw` されているほうが `apiFetch` と扱いが揃う。→ **薄いヘルパー `unwrap<T>(promise)` を同ファイルで提供**して、`throw` 変換したい呼び出し側だけが使えるようにする（openapi-fetch 素の返り値も併用可能にする）
    - 実装イメージ: 成功時 `data` を返す／`error` があれば `new ApiError({ status: response.status, message, ...fromResponse で組み立て相当 })` を throw／`fetch` 例外は `ApiError.networkError` に変換
    - `fromResponse` は `Response` を受け取り再度 `.json()` を試みる実装のため、openapi-fetch の `error` 由来で使うと body の二重読みで壊れる可能性がある → `unwrap` 内では `fromResponse` を直接呼ばず、`error`（既にパース済み JSON）から `message` / `code` / `fields` を組み立てる別ヘルパー `errorFromParsed(status, body)` を `errors.ts` に追加する
- [ ] `src/lib/api/errors.ts` を微修正
  - `errorFromParsed(status: number, body: unknown): ApiError` を追加エクスポート（`fromResponse` の body 解釈ロジックを共有）
  - `fromResponse` はこの内部関数を呼び出す形にリファクタ（振る舞い不変 → 既存テストは通り続けるはず）
- [ ] `src/lib/api/index.ts` を更新
  - `export { apiClient, unwrap } from "./openapi"` を追加
- [ ] ESLint 除外
  - `eslint.config.mjs` の `globalIgnores([...])` に `"src/types/generated/**"` を追加
- [ ] 生成の初回実行
  - `npm run generate:api` を実行し、`src/types/generated/api.ts` が出力されることを確認
  - `.gitkeep` は残す（`src/types/generated/.gitkeep`）
  - `api.ts` は git 管理する（`git add src/types/generated/api.ts`）
- [ ] `src/lib/api/openapi.test.ts`（Vitest）を追加
  - `unwrap` の成功パス（`{ data }` → 値が返る）
  - `unwrap` のエラーパス（`{ error, response }` → `ApiError` として throw、`status` / `message` が正しい）
  - 通信失敗（fetch reject）→ `ApiError.networkError`
  - openapi-fetch 自体を network 越しに叩くのは避け、`createClient` を呼ばず `unwrap` を単体で検証する（fetch モックは不要）
- [ ] `src/lib/api/errors.test.ts` の追記
  - `errorFromParsed(422, { message, errors: {...} })` が既存 `fromResponse` と同じ shape の `ApiError` を返すこと
- [ ] README 更新
  - 「主なコマンド」テーブルに `npm run generate:api`（OpenAPI → `src/types/generated/api.ts`）を追記
  - **`src/types/generated/api.ts` は手編集禁止**（`OPENAPI_URL` を差し替えて再生成する）ことを明記
  - `OPENAPI_URL` 環境変数の説明（未設定時はダミー spec を使う）
- [ ] `.env.example` に `OPENAPI_URL` を追記（コメント付き。既定値はコメントに記載、環境変数自体はコメントアウト状態でよい）

## 完了条件（DoD）

Issue の DoD を転記:

- [ ] `npm run generate:api` がダミー spec で成功する
- [ ] `src/types/generated/` に `api.ts` が出力される
- [ ] ESLint / prettier で生成物を除外している
- [ ] （追加）`npm run test` が緑（新規テスト含む既存テストも壊れないこと）
- [ ] （追加）`npm run lint` が緑（生成物が除外されているため lint エラーにならない）

## リスク / 確認事項

- **prettier が未導入**: DoD に「prettier で生成物を除外」とあるが、リポジトリに prettier 設定・依存が無い。以下のいずれかで扱いを決めたい。
  1. `.prettierignore` だけ作成し、`src/types/generated/**` を書いておく（prettier 自体は後日別 Issue で導入）。**推奨**：将来の Issue で prettier を追加した瞬間から除外が効く。
  2. 「prettier 未導入なので該当なし」として DoD の該当項目をスキップ（コメントを Issue に残す）。
  3. 本 Issue で prettier + `prettier-plugin-tailwindcss` を追加する（スコープ拡大）。
- **`generate:api` スクリプトのシェル依存**: `${OPENAPI_URL:-./openapi/openapi.dummy.json}` は zsh/bash では動くが、Windows の cmd では展開されない。macOS/Linux 前提でよいか（現状のワークフローは Docker + macOS 中心なので問題無い想定）。
- **openapi-fetch の返り値スタイル**: 成功 `{ data }` / 失敗 `{ error }` の型付きレスポンスは、features 側から見ると `try/catch` 一本槍の `apiFetch` と扱いが変わる。`unwrap` を提供することで整えるが、features 側で両方使えるようにすると学習コストが二重化する。**方針として「TanStack Query の `queryFn` / `mutationFn` からは常に `unwrap` を通す（`throw` 統一）」を README / lib/api の JSDoc に明記したい**。
- **ダミー spec の粒度**: 最小の 1 エンドポイントだけ入れる想定だが、後続の features 開発者が「型が空すぎて何も import できない」となる可能性。→ 本 Issue ではダミーで十分（DoD 通り「生成が成功する」を検証する目的）。実 spec への切替は #9 前後で実施する前提。
- **`fromResponse` の二重 read 問題**: openapi-fetch の `error` プロパティは既にパース済みの JSON body。`fromResponse` は `Response` を受け取り `.json()` を再度呼ぶため、openapi-fetch からそのまま渡すと壊れる。→ 「やること」で `errorFromParsed` を切り出す設計にしているが、命名/API 面でユーザー確認したい（`errorFromResponse` / `errorFromBody` 等の別案あり）。
- **`baseUrl` の解決**: `apiClient` は SPA から使う想定なので `process.env.NEXT_PUBLIC_API_URL` を既定にする。SSR / Route Handler 経由（`API_URL`）は現状呼び出し実績が無いため対応しない（必要になった時点で別 Issue）。
- **Scramble の実 URL**: バック側の実 URL は本 Issue で疎通確認しない（ダミー spec のみ）。実 URL 疎通は `kotozute-api` 側で Scramble のパスが確定してから別 Issue で扱う。

## 参照

- `CLAUDE.md`
- `docs/frontend_design.md`（「API 通信と型」節）
- `docs/screen_spec.md`（「共通仕様 - 状態の出し分け」）
- 直前 Issue: [#7 W1-07 lib/api ラッパー](../7/plan.md)
