# Issue #4 — W1-04 [infra] Playwright 導入 + サンプル E2E

- URL: https://github.com/hasedai0000/kotozute-web/issues/4
- ラベル: infra, week-1
- マイルストーン: MVP-Week1

## Issue 概要

主要シナリオ（記入 → 家族招待 → 家族閲覧）を E2E で守るための土台を用意する。`@playwright/test` を devDependencies に加え、`playwright.config.ts`（`webServer` は `npm run dev`）と `e2e/lp.spec.ts` の 1 ケース（LP タイトル表示）を追加。`npm run test:e2e` を用意し、CI 上で Playwright ブラウザインストール + 実行を **別ジョブ**で行う。

## 調査結果

### 関連ドキュメント

- `CLAUDE.md` — 「コマンド」節に `npm run test:e2e`（Playwright）を明記。「テスト」節に「Playwright（E2E）：記入 → 家族招待 → 家族が閲覧、の主要シナリオ」。
- `docs/frontend_design.md` — 「テスト」節で **Vitest（単体）／Playwright（E2E）** を確定。
- `docs/screen_spec.md` — LP `/` は SSG。ヒーローに「ことづて」＋タグライン「いまを生きるための、終活ノート」。現状の実装（後述）はほぼタグラインだけの暫定 LP。

### 関連コード

- `package.json` scripts — 現状 `dev` / `build` / `start` / `lint` / `test`。**`test:e2e` は未定義**。Playwright 系 devDependencies も未追加。
- `/e2e/` ディレクトリ — **未作成**。
- `playwright.config.ts` — **未作成**。
- `src/app/(marketing)/page.tsx` — LP 実体。`<h1>ことづて</h1>` + `いまを生きるための、終活ノート。` の暫定実装（本格実装は #12 W1-12 で行う）。**サンプル E2E のアサート対象として素直に使える**（heading か title で判定可能）。
- `src/app/layout.tsx` — `metadata.title = "ことづて"` を設定済み。`expect(page).toHaveTitle(/ことづて/)` でも判定可能。
- `vitest.config.mts` — `include: ["src/**/*.test.{ts,tsx}"]`。E2E は `e2e/*.spec.ts` に置くので Vitest とは自然に棲み分く（`.test` = Vitest / `.spec` = Playwright、W1-03 プランの命名規約と一致）。
- `tsconfig.json` — `include: ["**/*.ts", "**/*.tsx", ...]` のため **`e2e/*.spec.ts` と `playwright.config.ts` は `tsc --noEmit` の対象**。`@playwright/test` が devDependencies にあれば型解決可能。
- `.github/workflows/ci.yml` — 単一 `ci` ジョブ（lint / typecheck / test / build）。Issue は E2E を **別ジョブ** と明記。
- `.gitignore` — Playwright 用の除外（`/playwright-report`, `/test-results`, `/playwright/.cache` など）は未追加。
- Docker / Next.js 設定 — E2E からは影響なし。`npm run dev` を Playwright の `webServer` で立てる想定。

### 依存関係

- 先に必要: **なし**（Issue #1 Docker / #2 CI / #3 Vitest はいずれも closed 済み）。
- 直接的な後続: **#38 W4-08「Playwright: 記入 → 家族招待 → 家族閲覧のシナリオ」** がこの土台を使う（artifact 保存等はそちらで完成させる）。
- 関連（LP 本実装）: #12 W1-12 LP 実装（現在のサンプル E2E は暫定 LP を対象にする）。

## やること

- [ ] `devDependencies` に追加
  - `@playwright/test`
- [ ] `playwright.config.ts` を追加
  - `testDir: './e2e'`
  - `webServer: { command: 'npm run dev', url: 'http://127.0.0.1:3000', reuseExistingServer: !process.env.CI, timeout: 120_000 }`
  - `use: { baseURL: 'http://127.0.0.1:3000', trace: 'on-first-retry' }`
  - `projects`: 初期は `chromium` のみ（`{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }`）
  - `fullyParallel: true`, `forbidOnly: !!process.env.CI`, `retries: process.env.CI ? 2 : 0`
  - `reporter`: ローカル `list`、CI では `[['list'], ['html', { open: 'never' }]]`（HTML レポートは artifact 化用）
- [ ] `e2e/lp.spec.ts` を追加
  - シナリオ: `page.goto('/')` → `expect(page).toHaveTitle(/ことづて/)` もしくは `getByRole('heading', { name: 'ことづて' })` の可視性を確認
  - Issue の DoD「LP のタイトルが表示される」1 件のみ
- [ ] `package.json` scripts に追加
  - `"test:e2e": "playwright test"`
- [ ] `.gitignore` に Playwright 生成物を追記
  - `/playwright-report`, `/test-results`, `/blob-report`, `/playwright/.cache`
- [ ] `.github/workflows/ci.yml` に **別ジョブ**で E2E を追加（Issue 指示に忠実）
  - job 名: `e2e`（既存 `ci` ジョブとは分離）
  - `runs-on: ubuntu-latest`
  - `actions/checkout@v4` → `actions/setup-node@v4`（Node 22, `cache: 'npm'`）→ `npm ci`
  - Playwright ブラウザキャッシュ（`actions/cache@v4`, path `~/.cache/ms-playwright`, key に `package-lock.json` のハッシュを含める）
  - `npx playwright install --with-deps chromium`（キャッシュヒット時も `install-deps` は必要）
  - `npm run test:e2e`
  - 失敗時の HTML レポートを artifact に保存（`actions/upload-artifact@v4`, `if: always()`, path `playwright-report/`）
- [ ] （任意）`tsconfig.json` の `exclude` に E2E を入れる必要があるか実装時に判断（`@playwright/test` があれば typecheck を通せるはずなので、原則そのまま）

## 完了条件（DoD）

Issue の DoD を転記:

- [ ] `npm run test:e2e` がローカルで 1 件パスする
- [ ] CI でも実行される

## リスク / 確認事項

1. **`webServer: npm run dev` の初回遅延**
   - Next.js dev はオンデマンドコンパイル。初回 `page.goto('/')` でコンパイル待ちが発生し、CI で timeout する恐れ。
   - 対策: `webServer.timeout` を 120s 以上に設定。`retries: 2`（CI）で救う。
   - 代替案: `npm run build && npm run start` を webServer にするほうが安定・速い。ただし Issue は明確に `npm run dev` を指定しているため、**方針変更が必要ならユーザー確認**。
2. **CI ジョブ分割 vs. 単一ジョブへのステップ追加**
   - Issue は「別ジョブ」と明記。W1-03 プランでは checkout / setup-node / npm ci の重複コストを理由に単一ジョブ内ステップとしたが、E2E は Playwright ブラウザインストール（時間・キャッシュ管理）が独立して重いため **別ジョブが妥当**。Issue 指示と実務的判断が一致するのでそのまま従う。
3. **Playwright ブラウザキャッシュ**
   - `~/.cache/ms-playwright` を `actions/cache` でキャッシュ。キー衝突を避けるため `package-lock.json` のハッシュを含める（Playwright のバージョンが lock で決まるため）。
   - `--with-deps` は OS 依存パッケージ（フォント等）を都度インストールする必要があるので、キャッシュヒットしても `npx playwright install-deps chromium` は残す方針も検討。
4. **ブラウザは chromium のみでよいか**
   - Issue は特定なし。MVP では 1 ブラウザで十分。将来 firefox / webkit を足す場合は `projects` に追加するだけ。
5. **`.spec.ts` と Vitest の衝突**
   - Vitest の `include` は `src/**/*.test.{ts,tsx}` に限定済みなので、`e2e/*.spec.ts` は Vitest から拾われない。命名規約: **`.test` = Vitest / `.spec` = Playwright** を継続。
6. **ESLint 設定と E2E ディレクトリ**
   - `eslint-config-next` の flat config は Next のルールを全体に適用。E2E ファイルで Next 固有ルールが誤検知する可能性は低いが、必要なら flat config で `e2e/**` にオーバーライドを追加する（実装時に警告が出たら対応）。
7. **artifact 保存範囲**
   - Issue #4 の DoD には「artifact 保存」は含まれない（それは #38 W4-08 の DoD）。ただし失敗時に切り分けができるよう **HTML レポートの upload-artifact だけは今回のスコープに含める**。trace / screenshot 設定の高度化は W4-08 に譲る。
8. **`tsc --noEmit` が e2e ファイルを型チェックする**
   - `tsconfig.include` が `**/*.ts` のため対象になる。`@playwright/test` を devDependencies に入れれば解決するが、CI の typecheck ステップが遅くなる可能性はごくわずか。問題があれば `tsconfig.exclude` に `e2e` を足す（Playwright は自身のトランスパイラを持つため実行には影響しない）。
9. **`playwright.config.ts` が Next の tsconfig plugin の下で警告を出さないか**
   - Next プラグインは `.next/types/**/*` を扱うためのもの。Playwright config 自体には影響しない見込み。

## 参照

- `CLAUDE.md`（コマンド節・テスト節）
- `docs/frontend_design.md`（テスト節）
- `docs/screen_spec.md`（LP `/` 仕様）
- Issue: https://github.com/hasedai0000/kotozute-web/issues/4
- 関連 Issue: #38 W4-08（この土台を使う本命 E2E）、#12 W1-12（LP 本実装）
- 既存 CI: `.github/workflows/ci.yml`
- 既存プラン: `docs/issues/3/plan.md`（Vitest 側の命名規約と棲み分け）
