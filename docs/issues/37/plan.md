# Issue #37 — W4-07 [F-11] a11y 検証（コントラスト・キーボード・reduced-motion）

- URL: https://github.com/hasedai0000/kotozute-web/issues/37
- ラベル: frontend, week-4
- マイルストーン: MVP-Week4

## Issue 概要
高齢の家族も閲覧者となるサービスとして、a11y の最低ラインを担保する。Playwright + axe-core で LP / login / dashboard / notebook を自動検査し、キーボード操作のみで家族招待までの主要フローが完走できることを保証する。あわせて `prefers-reduced-motion` でアニメーションが止まること、コントラスト比が WCAG AA 以上であることを確認する。DoD は「axe-core の critical 違反 0」と「keyboard-only で family 招待まで完走できる」。

## 調査結果

### 関連ドキュメント
- `CLAUDE.md` — 「アクセシビリティ（YOU MUST）」で十分な文字サイズ・コントラスト、キーボード操作、`prefers-reduced-motion` への対応を必須指定。
- `docs/frontend_design.md` §UI・デザイン実装 — 同上（YOU MUST）。ダークモード考慮も明記。§テスト — 「アクセシビリティ：コントラスト・キーボード操作を確認」「CI（GitHub Actions）で lint・型チェック・テストを毎 PR 実行」。
- `docs/screen_spec.md` §共通仕様 — ロードは「スケルトン」、空は `EmptyState`、エラーは再試行ボタン等、状態出し分けの一貫性が a11y にも寄与。

### 関連コード（現状）

**プロジェクト基盤**
- `package.json` — Playwright は `^1.62.0` を devDeps に持つ。`@axe-core/playwright` は未導入（`axe-core` 自体は `jsdom` 経由で transitively 存在するのみで、直接インポートはされていない）。
- `playwright.config.ts` — `./e2e` を対象、chromium プロジェクトのみ、`webServer: npm run dev` が起動する構成。
- `.github/workflows/ci.yml` — `e2e` ジョブが `npm run test:e2e` を実行済み。追加テストは自動で走る。

**既存 a11y 実装**
- `src/styles/globals.css:153-161` — グローバルに `@media (prefers-reduced-motion: reduce)` を定義し、`animation-duration` / `transition-duration` / `scroll-behavior` を強制的に抑制。
- `src/components/layout/Header.tsx` — `aria-label="主要ナビゲーション"`、`aria-current="page"`、`aria-label="メニューを開く"` / `"ユーザーメニュー"`、`aria-busy` などランドマーク・状態通知が整備済み。モバイル用トリガーもラベル付き。
- `src/app/(app)/layout.tsx:15` / `(marketing)/layout.tsx:11-41` / `(auth)/login|register/page.tsx` / `invitations/[token]/page.tsx` — `<main>` `<header>` `<nav aria-label="…">` のランドマークが概ね揃っている。
- `src/components/layout/EmptyState.tsx` — `aria-hidden="true"` でアイコンを装飾扱い。
- `src/features/family/components/InviteDialog.tsx`（既存想定）— radix-ui / base-ui ベースのモーダルでフォーカストラップは既定で担保。

**未整備領域（本 Issue で扱うのが妥当）**
- `@axe-core/playwright` を用いた **軸検査の自動化テストが存在しない**（`e2e/` 配下に a11y スペックなし）。
- **キーボードのみで家族招待まで完走する E2E** が存在しない（`family-invite.spec.ts` はマウス相当の `click()` 主体）。
- `prefers-reduced-motion` の**回帰検知テスト**が存在しない。CSS 側は対応済みだが、後続で `motion-safe:animate-*` などを追加した際に破ることを検知できていない。
- コントラスト比の実測値は未計測（デザイントークンは `oklch(...)` で意味色（timing-always: green / timing-posthumous: amber）を定義済みだが、`--muted-foreground` / `--primary-foreground` などの実測は axe-core の `color-contrast` ルールで一括検査するのが妥当）。

### 依存関係
- 前提: #36（家族ロール閲覧専用モード） は CLOSED。家族側の DOM は既に安定しているため、a11y 検査の対象状態が確定している。
- 関連（並走）: #38 W4-08 E2E「記入 → 家族招待 → 家族閲覧」は本 Issue と対象が近い（family 招待完走）。**本 Issue はキーボード操作＋axe 検査に軸を絞り、シナリオ網羅は #38 に任せる**（責務分離）。ケースの重複を避けるため、招待ダイアログ操作は最小限のフローに留める。

## やること

- [ ] `@axe-core/playwright` を devDependency として追加する（`axe-core` は transitive で既に入っているが、Playwright バインディングは別パッケージ）。
- [ ] `e2e/a11y.spec.ts` を新設し、以下の 4 画面で axe-core を実行し **critical 違反 0** をアサートする:
  - `/`（LP）
  - `/login`
  - `/dashboard`（`family-invite.spec.ts` と同じ手法でセッションクッキー＋API スタブを設定）
  - `/notebook/basic`（同上。owner ロールでのフォーム画面）
  - 実装方針: `AxeBuilder(page).withTags(["wcag2a", "wcag2aa"]).analyze()` を叩き、`.violations` を critical のみ抽出（`impact === "critical"`）。0 でなければ違反内容を `console.log` してから `expect(critical).toEqual([])` で落とす。
- [ ] `e2e/a11y-keyboard.spec.ts` を新設し、**キーボード操作のみで家族招待まで完走する** ケースを追加する:
  - ログイン済み状態を `family-invite.spec.ts` と同じ cookie / route スタブ で構築（新規スタブヘルパは作らず、既存パターンを流用）。
  - `page.goto("/dashboard")` → `Tab` / `Shift+Tab` / `Enter` のみで Header の「家族」リンク → `/family` → 「家族を招待」ボタン → ダイアログ内メール入力 → 「送信」まで到達し、`InvitationsCard` に招待が反映されることをアサート。
  - フォーカスの可視性を最小限確認: 主要ステップで `document.activeElement` の `aria-label` / `textContent` を検査する（`page.evaluate` 経由）。
- [ ] `e2e/a11y-reduced-motion.spec.ts` を新設し、**`prefers-reduced-motion: reduce` を Playwright の `contextOptions` で強制**した状態で LP を開き、任意の要素の `computed style` の `animation-duration` / `transition-duration` が `0.01ms` 相当に丸められていることを検証する。
  - 実装方針: `test.use({ colorScheme: "light" })` に加えて `page.emulateMedia({ reducedMotion: "reduce" })` を使う。対象要素は既存 LP 内で animation/transition を持つセレクタ（例: shadcn の button hover トランジション）。
- [ ] axe-core の `color-contrast` ルール違反が critical に該当した場合の対処（トークン修正 or 例外扱い）を Issue コメントに残せるようフォーマットしておく。**まずは違反を洗い出すことを最優先**とし、修正が必要になった場合はスコープ内で対応するが、意味色（timing-always / timing-posthumous）の色相を変える判断はユーザー確認事項とする（後述リスク）。
- [ ] `docs/frontend_design.md` の §テスト「アクセシビリティ：コントラスト・キーボード操作を確認」を実測手段（自動テスト）で満たしたことを、Issue の DoD チェックとして確認する。ドキュメントの追記は不要（既に方針が書かれている）。

## 完了条件（DoD）

- [ ] `@axe-core/playwright` が `devDependencies` に追加され、`npm ci` から解決可能。
- [ ] `e2e/a11y.spec.ts` を `npm run test:e2e` で実行し、`/`, `/login`, `/dashboard`, `/notebook/basic` の 4 画面で `impact === "critical"` の axe 違反が **0 件**。
- [ ] `e2e/a11y-keyboard.spec.ts` が緑：キーボード操作（Tab / Shift+Tab / Enter / Space / Escape のみ）で `/dashboard` → `/family` → 招待ダイアログを開いて送信 → `InvitationsCard` に反映、まで完走。
- [ ] `e2e/a11y-reduced-motion.spec.ts` が緑：`emulateMedia({ reducedMotion: "reduce" })` の下で対象要素の `transition-duration` / `animation-duration` が 0.01ms 以下に抑制されている。
- [ ] `npm run lint` / `npx tsc --noEmit` / `npm run test` / `npm run test:e2e` すべて緑。
- [ ] CI（`.github/workflows/ci.yml` の `e2e` ジョブ）で新規スペックが自動実行される（追加設定不要のはず）。

## リスク / 確認事項

- **axe-core の color-contrast 違反が出た場合の意味色トークンの扱い**: `--timing-always`（green）や `--timing-posthumous`（amber）は CLAUDE.md ルール 6 で意味づけが確定しており、色相を勝手に変えてよいか判断が要る。まず違反内容（対象要素・現在の contrast ratio・必要な ratio）を Issue コメントで報告してから、修正か例外か（axe の `disableRules` ではなく、限定的な color adjustment）をユーザー判断で決めたい。
- **キーボードフローの分岐**: `/family` の招待ダイアログは radix / base-ui 実装のため、フォーカストラップと Esc クローズは既定で担保されている想定。ただし `NewMessageLink` などの `<Link>` は `Enter` で発火するはずが、内部で `<button>` ラップされていると `Space` も必要になる可能性。テスト実装時に `press("Enter")` で不足なら `Space` を併用する形で調整する（実装方針の細部は E2E 実装時に確定）。
- **#38 との重複回避**: 招待完走シナリオ自体は #38 の主題でもある。本 Issue のキーボード E2E は「入力操作をキーボードに限定する」ことに主眼を置き、招待送信後の家族閲覧までは踏み込まない（担当分離）。
- **`prefers-reduced-motion` テストの対象要素**: LP や shadcn 由来の `transition-*` クラスがある要素をピンポイント指定するので、後続の UI 変更でセレクタが壊れるリスクあり。安定した要素（LP のヒーロー CTA ボタンなど）を選ぶ。

## 参照
- `CLAUDE.md`
- `docs/frontend_design.md`
- `docs/screen_spec.md`
- 既存 E2E: `e2e/family-invite.spec.ts`（スタブ手法の雛形）
- 既存 CSS: `src/styles/globals.css:153-161`（reduced-motion）
- 既存 a11y 属性: `src/components/layout/Header.tsx`
