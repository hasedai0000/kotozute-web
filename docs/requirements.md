# ことづて ― フロントエンド設計書（確定 / v1.0）

対象：`kotozute-web`（Next.js）。バックエンドは別リポジトリ `kotozute-api`（Laravel API）。

## 技術選定（確定）

| 項目 | 採用 | 理由 |
|---|---|---|
| フレームワーク | **Next.js（App Router）＋ TypeScript** | LP は SSG／SSR で SEO、本体は認証付き SPA |
| ディレクトリ | **features 単位（機能で割る）** | バックの境界づけられたコンテキストと同じ言葉で対応づく |
| サーバ状態 | **TanStack Query** | 取得・キャッシュ・再取得・楽観的更新を宣言的に扱う標準 |
| UI 状態 | **React 標準（useState／useReducer）＋ 必要な所だけ Context** | 全体共有したい UI 状態が少ないため最小構成で足りる。増えたら Zustand を後入れ |
| フォーム | **React Hook Form ＋ Zod** | 入力の多いアプリ。検証とエラー表示を宣言的に |
| API 通信 | **OpenAPI（Laravel＝Scramble）→ openapi-typescript で TS 型・クライアント自動生成** | 別言語・別リポジトリでも契約が 1 か所に固定され、ズレをビルドで検出 |
| 認証 | **Laravel Sanctum の SPA 認証（httpOnly クッキー）** | JS から読めず XSS 耐性が高い。機微情報を扱うため優先 |
| UI 実装 | **Tailwind CSS ＋ shadcn/ui** | 部品コードが手元に来るのでデザイントークンを流し込める。a11y も土台から |
| テスト | **Vitest（単体）／Playwright（E2E）** | |
| デプロイ | **Docker（`output: 'standalone'`）→ ECS Fargate** | バックと同一の Docker→ECR→ECS パイプライン |

## ディレクトリ構成

```
kotozute-web/
├─ src/
│  ├─ app/                        # App Router：ルーティング専任（薄く保つ）
│  │  ├─ (marketing)/page.tsx     # LP（SSG）
│  │  ├─ (auth)/login/…  register/…
│  │  ├─ (app)/dashboard/…        # 認証必須エリア
│  │  ├─ (app)/notebook/[section]/…
│  │  ├─ (app)/family/…           # 招待・共有管理
│  │  ├─ (app)/settings/…         # 公開タイミング・待機日数
│  │  └─ layout.tsx
│  ├─ features/                   # ← 実体はここ（バックのコンテキストと対応）
│  │  ├─ auth/                    # ← Account
│  │  │  ├─ api/                  # useLogin, useRegister（TanStack Query）
│  │  │  ├─ components/
│  │  │  ├─ hooks/
│  │  │  └─ schema/               # Zod
│  │  ├─ notebook/                # ← Notebook（中核）
│  │  │  ├─ api/                  # useNote, useEntries, useAddEntry…
│  │  │  ├─ components/           # SectionForm, EntryCard, EntryDialog, TimingBadge
│  │  │  ├─ constants/            # セクション定義・カテゴリ定義
│  │  │  ├─ hooks/
│  │  │  └─ schema/
│  │  ├─ family/                  # 招待・メンバー
│  │  ├─ messages/                # 大切な人へ（手紙）
│  │  └─ disclosure/              # ← Disclosure（v1。MVP は枠のみ）
│  ├─ components/ui/              # shadcn/ui の基礎部品
│  ├─ components/layout/          # Header, Nav, Container
│  ├─ lib/
│  │  ├─ api/                     # 生成クライアント・fetch ラッパー・エラー整形
│  │  ├─ query/                   # QueryClient 設定・queryKeys
│  │  └─ utils.ts
│  ├─ providers/                  # QueryProvider, AuthProvider(Context), ThemeProvider
│  ├─ types/generated/            # ← OpenAPI から自動生成（手で編集しない）
│  └─ styles/globals.css          # Tailwind＋デザイントークン
├─ public/
├─ Dockerfile
├─ docker-compose.yml（api・db・redis と合わせてローカル起動）
└─ next.config.ts                 # output: 'standalone'
```

## 状態管理の役割分担（迷わないための決め）

| 状態の種類 | 置き場所 |
|---|---|
| API から来るデータ（ノート・口座・家族一覧…） | **TanStack Query**（`features/*/api`） |
| 画面ローカル（モーダル開閉・タブ・ステップ） | `useState` / `useReducer` |
| 入力フォーム | **React Hook Form**（＋ Zod で検証） |
| 全体共有のごく少数（ログインユーザー・テーマ） | **Context**（`providers/`） |

**YOU MUST**：サーバ状態を `useState` に写し取らない（TanStack Query のキャッシュを唯一の真実とする）。

## API 通信と型

1. Laravel 側で **Scramble** が **OpenAPI 仕様**を自動生成（バックが契約の真実を持つ。レスポンス型は Resource で固定）。
2. フロントは **openapi-typescript**（＋ typed fetch の openapi-fetch）で `src/types/generated/` に **TS 型＋クライアント**を生成。**手で編集しない。**
3. `lib/api/` に薄いラッパーを置き、`credentials: 'include'`（クッキー送信）とエラー整形を共通化。
4. 各 feature の `api/` で TanStack Query のフックにする（例：`useAddEntry`）。
5. 契約変更はバック→再生成→フロントの型エラーで検出、という流れを CI に組む。

`queryKeys` は `lib/query/` に集約（例：`['notebook', familyId, section]`）。更新時は関連キーを invalidate。

## 認証（Sanctum SPA・クッキー）

- ログイン前に CSRF クッキーを取得 → ログイン。以後はブラウザが httpOnly クッキーを自動送信。**フロントはトークンを保持しない。**
- 全リクエストで `credentials: 'include'`。API 側で CORS（`supports_credentials`）と `SANCTUM_STATEFUL_DOMAINS` を設定。
- フロント `app.kotozute.com` と API `api.kotozute.com` は**同一サイト（kotozute.com）**なのでクッキー共有が成立。
- 認証必須エリアは Route Group `(app)` ＋ middleware でガード。未認証は `/login` へ。
- ログインユーザーは `AuthProvider`（Context）で配る。

## UI・デザイン実装

- 白基調・カード型・角丸・フラット。モダンなゴシック（和文＋Inter 系）。**グリーンをブランドアクセント**。
- **デザイントークン**（色・余白・角丸・字間）を Tailwind の theme に定義し、直値を使わない。
- 意味で色を使う：**常時共有＝グリーン**、**死後開示＝アンバー＋鍵アイコン**（`TimingBadge` として部品化）。
- 複数登録できる項目（口座・保険・契約…）は **`EntryCard` のリスト＋「追加」ボタン**で統一（追加・編集・削除・並べ替え）。
- **アクセシビリティ（YOU MUST）**：高齢の家族も閲覧者。十分な文字サイズ・コントラスト、キーボード操作、`prefers-reduced-motion`、ダークモード考慮。

## セキュリティ

- パスワード・暗証番号・マイナンバー番号は**入力させない／保存しない**（在りかのみ）。UI にも注意書きを出す。
- 死後開示の項目は、API が返さない限り**フロントに存在しない**前提で作る（クライアント側で隠すだけの実装は禁止）。
- 死後開示の発動は、確認モーダル＋再認証を UI で必ず経由させる（v1）。

## テスト

- **Vitest**：フック・スキーマ・ユーティリティ。
- **Playwright（E2E）**：記入 → 家族招待 → 家族が閲覧、の主要シナリオ。
- **アクセシビリティ**：コントラスト・キーボード操作を確認。
- CI（GitHub Actions）で lint・型チェック・テストを毎 PR 実行。

## MVP / v1 の線引き

- **MVP（1 ヶ月）**：LP、認証、ダッシュボード、ノート編集（リスト型含む）、家族招待、常時共有閲覧。
- **v1（翌月）**：disclosure（発動・待機・撤回の UI）、書き出し、リマインド。
