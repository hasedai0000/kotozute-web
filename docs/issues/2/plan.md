## Issue 概要

PR ごとに `lint` / `typecheck` / `build` を強制する GitHub Actions ワークフローを追加し、`main` を常にグリーンに保つ。ブランチ保護で CI 緑を必須にする。

## 調査結果

### 関連ドキュメント

- `CLAUDE.md` — 「テスト」節に `CI（GitHub Actions）で lint・型チェック・テストを毎 PR 実行」と明記。「ワークフロー」節に「PR 必須、CI が緑でなければマージ不可」。
- `docs/frontend_design.md` — 同上「テスト」節（W1-02 の趣旨と一致）。
- Issue が挙げるコマンド：`npm ci` → `npm run lint` → `npx tsc --noEmit` → `npm run build`。

### 関連コード

- `.github/` — **未作成**。ワークフローも protection も無い。
- `package.json` scripts — `dev` / `build` / `start` / `lint` のみ。**`typecheck` / `test` は未定義**（CLAUDE.md には記載あり）。
  - Issue の指示は `npx tsc --noEmit` を直接叩く形なので、そのまま踏襲すれば新スクリプト追加は不要。
- `tsconfig.json` — `noEmit: true` 設定済み。`tsc --noEmit` で型チェック可能。
- `eslint.config.mjs` — ESLint 9 flat config、`eslint-config-next` 適用済み。`npm run lint` は `eslint`（引数なし）で全体をチェック。
- `Dockerfile` / `docker-compose.yml` — W1-01 で導入済み（CI との干渉は無し）。
- Node バージョン指定：`package.json` / `.nvmrc` に固定なし。ワークフロー側で Node 22 を pin する。

### 依存関係

- 先に必要: **なし**（Issue #1「W1-01 Docker skeleton」は既にコミット済み）。
- 関連: この後のフロント Issue 群（W1-11, W1-12, W2 系…）はこの CI が受け皿になる。

### リポジトリの前提

- リポジトリ: `hasedai0000/kotozute-web`（private）。
- 現状ブランチ: `feature/w1-01-docker-skeleton`。デフォルトブランチ: `main`。
- **ブランチ保護 API が 403（"Upgrade to GitHub Pro or make this repository public"）を返す** — private + Free プランではブランチ保護 UI/API がロックされている（重要リスク、下記参照）。

## やること

- [ ] `.github/workflows/ci.yml` を追加
  - トリガー: `pull_request`（対象: `main`）+ `push`（対象: `main`）
  - `runs-on: ubuntu-latest`
  - `actions/checkout@v4`
  - `actions/setup-node@v4` で **Node 22 (LTS) を pin**、`cache: 'npm'` を有効化
  - ステップ: `npm ci` → `npm run lint` → `npx tsc --noEmit` → `npm run build`
  - `concurrency` で同一 PR の古い run をキャンセル（推奨）
- [ ] リポジトリを public 化（`gh repo edit --visibility public`）
  - ブランチ保護 API 解禁のための前提。実行前にユーザーへ最終確認する（不可逆・公開範囲変更のため）。
- [ ] main ブランチ保護の設定
  - 「Require status checks to pass before merging」を有効化し、CI ジョブ名（`ci`）を必須チェックに指定
  - 「Require a pull request before merging」で main への直接 push を禁止
  - `gh api -X PUT repos/hasedai0000/kotozute-web/branches/main/protection` で設定（body は実装時に確定）
- [ ] （任意）動作確認用のダミー PR を作成し、全ジョブが green を確認 → 型エラーを入れて red 化を確認
  - この確認作業は本 Issue のスコープ内だが、`/issue-ship` 側で実施する

## 完了条件（DoD）

Issue の DoD を転記:

- [ ] ダミー PR で全ジョブが green
- [ ] 意図的に型エラーを入れると red になる
- [ ] main への直接 push が禁止されている

## リスク / 確認事項

1. **リポジトリを public 化する（決定済み）**
   - ユーザー選択: (a) public 化。
   - 影響: コード・Issue・PR がインターネットに公開される。**不可逆な操作ではないが影響が大きい**ため、`/issue-ship` 側で実際に `gh repo edit --visibility public` を叩く直前にもう一度ユーザーに確認する。
   - コミット履歴に秘匿情報（`.env` の実値、鍵、内部 URL 等）が入っていないかを事前チェックする。`.env` は `.gitignore` 済みだが、過去コミットに紛れていないか `git log --all -- .env` などで念のため確認。
2. **`npm run typecheck` スクリプト未定義**
   - CLAUDE.md は `npm run typecheck` を前提とするが `package.json` には未定義。
   - Issue の指示どおり CI 側は `npx tsc --noEmit` を直接叩く方針で問題ない。ローカル利便性のため `scripts.typecheck` を足すかは別途判断（今回のスコープ外）。
3. **テストジョブは未追加**
   - Vitest / Playwright は W1 の他 Issue で導入予定。本 Issue のスコープには含まれない（Issue にも記載なし）。
4. **Node バージョン固定の粒度**
   - Issue は「Node 22 LTS」。CI では `node-version: '22'` を採用（メジャー固定）。`.nvmrc` を足すかは今回スコープ外。
5. **`concurrency` 設定の是非**
   - PR 連続 push 時のリソース節約のため推奨。含めるかは実装時に確認。

## 参照

- `CLAUDE.md`
- `docs/frontend_design.md`（テスト / MVP 節）
- Issue: https://github.com/hasedai0000/kotozute-web/issues/2
