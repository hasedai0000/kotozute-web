# kotozute-web

終活エンディングノートを家族と「常時共有」する Web サービス **ことづて** のフロントエンド（Next.js）。
バックエンドは別リポジトリ [`kotozute-api`](https://github.com/hasedai0000/kotozute-api)（Laravel API）。

詳細な設計・仕様は `docs/` を参照:

- [`docs/frontend_design.md`](docs/frontend_design.md) — フロント設計
- [`docs/screen_spec.md`](docs/screen_spec.md) — 画面設計
- [`docs/requirements.md`](docs/requirements.md) — 要件定義

## ローカル起動

### 1. 環境変数

`.env.example` を `.env` にコピーして値を調整します。

```bash
cp .env.example .env
```

主な変数:

| 変数 | 説明 |
|---|---|
| `NEXT_PUBLIC_APP_URL` | フロント自身の公開 URL（既定 `http://localhost:3000`） |
| `NEXT_PUBLIC_API_URL` | ブラウザから叩く API URL |
| `API_URL` | サーバー（SSR / Route Handler）から叩く API URL |
| `OPENAPI_URL` | `npm run generate:api` が読み込む OpenAPI 仕様の URL または相対パス。未設定時は `openapi/openapi.dummy.json` を使う |

### 2. npm で起動（フロント単体）

```bash
npm install
npm run dev
```

### 3. Docker Compose で起動

Next.js を standalone ビルドしたイメージを立ち上げます。

```bash
# web だけ起動（LP が http://localhost:3000 で見える）
docker compose up web

# api / db / redis も合わせて起動する場合（../kotozute-api を clone しておく）
docker compose --profile api up
```

## 主なコマンド

| コマンド | 用途 |
|---|---|
| `npm run dev` | 開発サーバ起動 |
| `npm run build` | 本番ビルド（standalone 出力） |
| `npm run lint` | Lint |
| `npm run test` | Vitest（単体テスト） |
| `npm run test:e2e` | Playwright（E2E） |
| `npm run generate:api` | OpenAPI → `src/types/generated/api.ts` を生成（`OPENAPI_URL` 未設定時はダミー spec） |

## API 型の生成

バックエンド `kotozute-api`（Laravel + Scramble）が公開する OpenAPI 仕様から、TS 型と型付き fetch クライアントを自動生成します。

```bash
# ダミー spec で生成（オフラインでも動作）
npm run generate:api

# 実 spec で生成（例）
OPENAPI_URL=http://localhost:8000/docs/api.json npm run generate:api
```

- 出力先: `src/types/generated/api.ts`
- **この生成物は手編集禁止**（`OPENAPI_URL` を差し替えて再生成してください）。
- 生成物は git 管理します（ESLint / prettier からは除外）。
- 型付きクライアントは `src/lib/api/openapi.ts` の `apiClient` として初期化済み。TanStack Query の `queryFn` / `mutationFn` からは常に `unwrap()` を通し、エラーは `ApiError` として throw で扱ってください。
