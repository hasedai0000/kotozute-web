# Issue #3 — W1-03 [infra] Vitest 導入 + サンプルテスト

- URL: https://github.com/hasedai0000/kotozute-web/issues/3
- ラベル: infra, week-1
- マイルストーン: MVP-Week1

## Issue 概要

フック・スキーマ・ユーティリティの単体テストの土台を作る。`vitest` / `@testing-library/react` / `jsdom` を devDependencies に加え、`vitest.config.ts` を用意し、`src/lib/utils.test.ts` のサンプルテストを走らせる。`npm run test` を追加し、CI にも `test` ジョブを組み込む。

## 調査結果

### 関連ドキュメント

- `CLAUDE.md` — 「コマンド」節に `npm run test`（Vitest）を明記。「テスト」節に「CI（GitHub Actions）で lint・型チェック・テストを毎 PR 実行」。
- `docs/frontend_design.md` — 「テスト」節に **Vitest（単体）／Playwright（E2E）** と技術選定が確定済み。Vitest は「フック・スキーマ・ユーティリティ」の単体テスト用途。
- `docs/screen_spec.md` — テスト対象自体の記述はないが、フォームの Zod スキーマ等が Vitest の主要対象になる（W1-06 以降）。

### 関連コード

- `package.json` — scripts は `dev` / `build` / `start` / `lint` のみ。**`test` / `typecheck` は未定義**。Vitest 系 devDependencies も未追加。
- `tsconfig.json` — `paths: { "@/*": ["./src/*"] }` を利用。Vitest でも同じ alias を効かせるため `vite-tsconfig-paths` プラグイン（もしくは `resolve.alias` 手書き）が必要。`moduleResolution: "bundler"`、`strict: true`、`jsx: "react-jsx"`。
- `src/lib/utils.ts` — `cn(...inputs)` を `clsx + tailwind-merge` で実装。**サンプルテストの対象として素直**（純関数、副作用なし、jsdom 不要）。
- `src/lib/utils.test.ts` — 未作成。
- `vitest.config.ts` — 未作成。
- `.github/workflows/ci.yml` — W1-02 で作成済み。現状ジョブは `lint / typecheck / build` の 1 ジョブ（`ci`）にステップとして並ぶ形。**`test` ステップまたは別ジョブの追加が必要**。
- React 19 + Next 16 系の構成のため、`@testing-library/react` は **v16 以降**（React 19 対応）を選ぶ必要がある。

### 依存関係

- 先に必要: **なし**。W1-01（Docker）/ W1-02（CI）はいずれも closed 済み。
- 関連（今後 Vitest を使う予定）:
  - #5 W1-05 TanStack Query 導入（`useXxx` フックのテスト）
  - #6 W1-06 React Hook Form + Zod 導入（Zod スキーマのテスト）
  - #7 W1-07 lib/api ラッパー（エラー整形のテスト）
  - #11 W1-11 共通部品（`TimingBadge` 等の render テスト）

## やること

- [ ] devDependencies を追加
  - `vitest`（最新安定）
  - `@vitejs/plugin-react`（React 19 コンポーネントを Vitest で解決するため）
  - `@testing-library/react`（React 19 対応版）
  - `@testing-library/jest-dom`（マッチャ拡張。`toBeInTheDocument` などで有用。今回のサンプルでは使わないが `setupFiles` で読み込む前提で入れる）
  - `@testing-library/user-event`（将来のインタラクション用。初期スコープに含めるか実装時に判断）
  - `jsdom`
  - `vite-tsconfig-paths`（tsconfig の `@/*` を Vitest から解決）
- [ ] `vitest.config.ts` を追加
  - `plugins: [react(), tsconfigPaths()]`
  - `test.environment: 'jsdom'`
  - `test.globals: true`（`describe/it/expect` を import 不要にするか、明示 import にするかは実装時に決定。ドキュメント整合のため **明示 import 推奨**）
  - `test.setupFiles: ['./vitest.setup.ts']`（`@testing-library/jest-dom` を読み込む）
  - `test.css: false`（テスト対象に無関係な CSS を無視）
- [ ] `vitest.setup.ts` を追加（`@testing-library/jest-dom/vitest` を import）
- [ ] `src/lib/utils.test.ts` を追加
  - `cn()` の代表的な挙動（クラス結合、falsy 排除、Tailwind の衝突マージ）を 1〜2 ケース検証
- [ ] `package.json` scripts に `"test": "vitest run"` を追加
  - 対話モード（`vitest`）と分けるかは実装時に判断。CI では `vitest run` が必要。
- [ ] `.github/workflows/ci.yml` に test ステップを追加
  - 既存 `ci` ジョブ末尾に `- name: Test / run: npm run test` を追記する方針（別ジョブに分けるかは実装時に判断）
- [ ] `.gitignore` に Vitest のキャッシュ（`node_modules/.vitest` 等）を追記する必要があるか確認

## 完了条件（DoD）

Issue の DoD を転記:

- [ ] `npm run test` がローカルと CI で 1 件パスする
- [ ] 型エラー / import エラーなし

## リスク / 確認事項

1. **`@testing-library/react` と React 19 の互換性**
   - React 19 対応は `@testing-library/react@^16` 以降。npm install 時に peer 依存の警告が出る可能性があるため確認する。
2. **`vitest.config.ts` の型解決**
   - `vitest/config` を使う場合、`tsconfig.json` の `types` に `vitest/globals` を追加すべきかは `globals` 設定次第。明示 import 方針なら不要。
3. **CI で `test` を別ジョブにするか、既存 `ci` に足すか**
   - Issue は「CI ワークフローに `test` ジョブ追加」と表現。厳密に別ジョブにすると checkout / setup-node / npm ci が二重実行になりコストが増える。**既存 `ci` ジョブの末尾に `Test` ステップを追加**する方が実用的だが、Issue の文言との整合を確認したい。
4. **`typecheck` スクリプト未定義（W1-02 でも指摘）**
   - 本 Issue のスコープ外だが、`test` を追加するついでに `typecheck: "tsc --noEmit"` を足すかは別途判断。今回は Issue に無いため触らない。
5. **カバレッジ設定**
   - Issue には要求なし。今回のスコープ外。将来 `@vitest/coverage-v8` を検討。
6. **Playwright との棲み分け**
   - `.test.ts` は Vitest、`.spec.ts` は Playwright にするなど命名規約を決めておくと後で楽。W1-04（Playwright）で確定させる前提で、今回は Vitest の対象を `**/*.test.ts(x)` に絞る設定を入れる（Playwright 未導入なので実害はない）。
7. **`shadcn` パッケージが dependencies に入っている**
   - 本 Issue とは無関係だが、通常は CLI（devDependency 相当）。将来的な整理対象としてメモに留めるのみ。
8. **実装時の判断メモ（実装後追記）**
   - `@vitejs/plugin-react` v6 が `shadcn` の babel と peer 衝突したため、SWC ベースの `@vitejs/plugin-react-swc` を採用。
   - Vitest v4 は rolldown のネイティブバインディングを必要とし、開発機の Node 21 では optional binding が engine 要件で skip されたため、Vite ベースの Vitest v3.x に固定。
   - 同様に `jsdom@30` は依存の `@exodus/bytes` が ESM 専用で Vitest v3（CJS 経由 require）と衝突するため `jsdom@^26` を採用。
   - Vitest 設定は ESM 専用プラグイン（`@vitejs/plugin-react-swc` / `vite-tsconfig-paths`）を使う都合上 `vitest.config.mts` にした。
   - CI は「別ジョブ追加」ではなく既存 `ci` ジョブ内の `Test` ステップとして追加（checkout / setup-node / npm ci の重複コストを避けるため）。

## 参照

- `CLAUDE.md`（コマンド節・テスト節）
- `docs/frontend_design.md`（テスト節）
- Issue: https://github.com/hasedai0000/kotozute-web/issues/3
- 既存 CI: `.github/workflows/ci.yml`
- 既存プラン: `docs/issues/2/plan.md`（W1-02 で作った CI 構成に増築する）
