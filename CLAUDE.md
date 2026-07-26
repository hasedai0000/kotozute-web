# ことづて Web — Claude Code プロジェクトメモリ

終活エンディングノートを家族と「常時共有」する Web サービス **ことづて** のフロントエンド（Next.js）。
バックエンドは別リポジトリ **kotozute-api**（Laravel API）。

## 詳細ドキュメント

@docs/frontend_design.md — フロント設計（構成・状態管理・API・認証・UI）
@docs/screen_spec.md     — 画面設計・仕様（全画面・ロール別の出し分け・状態）
@docs/requirements.md    — 要件定義（機能・画面・非機能）

## 技術スタック

- **Next.js（App Router）＋ TypeScript**
- サーバ状態：**TanStack Query** ／ UI 状態：**React 標準＋Context** ／ フォーム：**React Hook Form ＋ Zod**
- API：**OpenAPI から型・クライアントを自動生成**（`src/types/generated/`）
- 認証：**Laravel Sanctum の SPA 認証（httpOnly クッキー）**
- UI：**Tailwind CSS ＋ shadcn/ui**
- デプロイ：Docker（`output: 'standalone'`）→ **AWS ECS Fargate**

## 絶対ルール（YOU MUST）

1. **features 単位で割る**：実体は `src/features/{auth,notebook,family,messages,disclosure}`。`src/app/` は**ルーティング専任**で薄く保つ。
2. **サーバ状態は TanStack Query が唯一の真実**。API データを `useState` に写し取らない。
3. **`src/types/generated/` は手で編集しない**（OpenAPI から再生成する）。
4. **トークンをフロントで保持しない**。認証はクッキー（`credentials: 'include'`）。localStorage に認証情報を置かない。
5. **デザイントークンを使う**（色・余白・角丸）。直値のカラーコードを書かない。
6. 公開タイミングは意味で色分け：**常時共有＝グリーン／死後開示＝アンバー＋鍵**（`TimingBadge`）。
7. 複数登録できる項目（口座・保険・契約…）は **`EntryCard` のリスト＋追加ボタン**で統一。
8. **死後開示の項目は、API が返さない限り存在しない前提**で実装する（クライアント側で隠すだけの実装は禁止）。

## セキュリティ（YOU MUST）

- パスワード・暗証番号・マイナンバー番号は**入力させない**（在りかのみ記録）。UI に注意書きを出す。

## アクセシビリティ（YOU MUST）

- 高齢の家族も閲覧者。十分な文字サイズ・コントラスト、キーボード操作、`prefers-reduced-motion` に対応。

## コマンド

- 開発：`npm run dev` ／ ビルド：`npm run build`
- テスト：`npm run test`（Vitest）、`npm run test:e2e`（Playwright）
- 型・整形：`npm run typecheck`、`npm run lint`
- API 型生成：`npm run generate:api`（OpenAPI → `src/types/generated/`）

## ワークフロー

- ブランチ：`main` / `develop` / `feature/*`。PR 必須、CI が緑でなければマージ不可。
- 大きめの変更は **plan mode** で計画を確認してから実行。
- スコープ：1 ヶ月 MVP は **常時共有まで**（LP・認証・ノート編集・家族招待・閲覧）。disclosure は枠のみ、実装は翌月 v1。
- 迷ったら上記ドキュメントを参照し、勝手に方針を変えない。変更提案は先に確認する。
