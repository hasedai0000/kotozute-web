# Issue #6 — W1-06 [基盤] React Hook Form + Zod 導入と共通 FormField

- URL: https://github.com/hasedai0000/kotozute-web/issues/6
- ラベル: frontend, week-1
- マイルストーン: MVP-Week1

## Issue 概要

フォーム実装を宣言的に統一するための土台整備。`react-hook-form` / `zod` / `@hookform/resolvers` を追加し、shadcn の `form` コンポーネントを取り込む。あわせて最初の利用例として `src/features/auth/schema/login.ts`（email / password のみの Zod スキーマ）を作成し、Vitest でスキーマ単体のテストを 1 件通す。CLAUDE.md の絶対ルール「フォームは RHF + Zod」を全機能の入力画面（登録・ログイン・EntryDialog・手紙・設定など）で使えるようにするための共通基盤を先に用意する回。

## 調査結果

### 関連ドキュメント

- `CLAUDE.md` — 技術スタック節でフォームは **React Hook Form ＋ Zod** と明記。features 単位で割る絶対ルールに基づき、Zod スキーマは `src/features/*/schema/` に置く。
- `docs/frontend_design.md` — 「状態管理の役割分担」でフォーム状態は RHF、検証は Zod。「ディレクトリ構成」で `features/auth/schema/`（Zod）が図示されている。
- `docs/screen_spec.md` —
  - 「5. ログイン `/login` ／ 新規登録 `/register`」: 登録項目（氏名・メール・パスワード 8 文字以上・確認用）・ログイン項目（メール・パスワード）を Zod で検証。失敗時は「メールアドレスまたはパスワードが正しくありません」（どちらが誤りか明かさない）。今回は **login のスキーマだけ** をサンプルとして用意する（登録のスキーマは後続 Issue）。
  - 「2. セクション編集」の EntryDialog、「7. 大切な人へ」の手紙、「9. 設定」など、後続のほぼ全ての入力系画面で RHF + Zod を前提にしている。

### 関連コード

- `package.json` — `react-hook-form` / `zod` / `@hookform/resolvers` は **いずれも未追加**。React 19.2.4 / Next 16.2.10 と両立する版を採用する（RHF v7 系、Zod v3 系、@hookform/resolvers v3 系。Zod v4 系が出ている場合は @hookform/resolvers 側の対応状況を確認して固定する）。
- `components.json` — shadcn 設定は既存（`style: base-nova`、`baseColor: neutral`、`cssVariables: true`、alias は `@/components/ui`）。`shadcn add form` を実行するとこの設定に沿って `src/components/ui/form.tsx` および必要な依存部品（Label など）が追加される。**Radix ではなく `@base-ui/react` を採用済み**（package.json）。shadcn の `form` レジストリが Radix Label を要求する場合、既存のフォーム基盤（base-ui）との整合を確認する必要あり（後述リスク）。
- `src/components/ui/` — 現状は `button.tsx` のみ。`label.tsx` は未追加。`form.tsx` も未追加。`shadcn add form` で必要な依存部品が同時に導入される想定。
- `src/features/auth/` — サブディレクトリ（`api/` `components/` `hooks/` `schema/`）は存在するが、いずれも `.gitkeep` のみで実体ファイルはなし。`schema/login.ts` は今回新規作成。
- `src/app/(auth)/login/page.tsx` — 現在は見出しのみのプレースホルダー。**今回のスコープでは触らない**（フォーム UI の実装は後続 Issue に切り出す。W1-06 は「スキーマと共通部品の土台」だけ）。
- `vitest.config.mts` / `vitest.setup.ts` — `environment: 'jsdom'`, `globals: false`, `include: src/**/*.test.{ts,tsx}`。テストは `import { describe, it, expect } from 'vitest'` を明示。`@testing-library/jest-dom/vitest` はセットアップ済み。既存の `src/lib/utils.test.ts` が参考パターン。
- `tsconfig.json` — `strict: true`, `paths: { "@/*": ["./src/*"] }`。RHF のジェネリクスと Zod の `z.infer` を組み合わせる典型パターンで問題なし。
- grep 結果: `src/` 配下に `react-hook-form` / `zod` / `@hookform/resolvers` の既存参照は **一切なし**（新規導入で確定）。

### 依存関係

- 先に必要: **なし**（#2 Next 初期化, #3 Tailwind + shadcn, #4 Playwright, #5 TanStack Query は closed／merged 済み）。
- 直接の後続:
  - **#10 W1-10 認証画面（ログイン／新規登録・Zod 検証・エラー統一）** — 今回作った `schema/login.ts` と共通 FormField を使ってログイン UI を実装する。**registration のスキーマ追加はここで**。
  - **#22 W3-02 EntryDialog（RHF + Zod・カテゴリ別項目切替）** — 共通 FormField をカテゴリ別 Entry フォームで利用。
  - **#26 W3-06 手紙作成/編集（自動保存）** — RHF の `watch` + debounce と Zod スキーマ検証を利用。
- 関連: **#7 W1-07 lib/api ラッパー** — フォーム送信 → API 呼び出しで組み合わせるが、今回のスコープには入れない（サンプルはスキーマ検証のみで API 呼び出しはしない）。

## やること

- [ ] `dependencies` に追加
  - `react-hook-form`（^7）
  - `zod`（Zod v3 系を採用。@hookform/resolvers v3 系との互換性を優先。もし Zod v4 系を採用する場合は resolvers 側の対応版に合わせる）
  - `@hookform/resolvers`（^3）
- [ ] `shadcn add form` を実行して `src/components/ui/form.tsx` を追加
  - 同時に必要な依存（`label.tsx` など）が導入されるため、追加されたファイルを確認して不要な差分がないかチェック
  - `form.tsx` は shadcn 標準の `Form / FormField / FormItem / FormLabel / FormControl / FormDescription / FormMessage` を提供する構成であることを確認（**手で書き換えず素の shadcn 出力のまま**）
  - 追加された `label.tsx` などが `@base-ui/react` を使うか Radix を使うかを確認（Radix なら `@radix-ui/react-label` などを別途 dependencies に追加。後述リスク参照）
- [ ] `src/features/auth/schema/login.ts` を追加
  - Zod スキーマ:
    - `email`: `z.string().email({ message: 'メールアドレスの形式が正しくありません' })`
    - `password`: `z.string().min(1, { message: 'パスワードを入力してください' })`（**ログインは長さ検証を強くしない**。「メールまたはパスワードが正しくありません」の統一エラーはサーバ判定で返す方針。docs/screen_spec.md 準拠）
  - `export type LoginInput = z.infer<typeof loginSchema>;` の型 export
  - `.gitkeep` を削除
- [ ] `src/features/auth/schema/login.test.ts` を追加（Vitest）
  - 少なくとも **1 件のテスト**（DoD 準拠）。以下のいずれかを含む:
    - 正常系: 有効な email + password でパースが成功する
    - 異常系: email 不正時 / password 空時に `safeParse` が失敗し、期待するエラーメッセージが含まれる
  - パターンは `src/lib/utils.test.ts` に合わせ、`import { describe, it, expect } from 'vitest'` を明示
- [ ] 動作確認
  - `npm run test`（Vitest）が **全件パス**すること
  - `npm run lint` / `npm run build` が通ること（型エラー 0）
  - 既存の LP / e2e に影響がないこと（今回は UI に手を入れないので実質確認だけ）

## 完了条件（DoD）

Issue の DoD を転記:

- [ ] Zod スキーマに対する Vitest のテストが 1 件通る
- [ ] 型エラーなし

## リスク / 確認事項

1. **shadcn の `form` が Radix Label を要求する可能性**
   - 本プロジェクトは `@base-ui/react` を採用済み。shadcn の `form.tsx` は内部で `@radix-ui/react-label` に依存するのが標準。`shadcn add form` 実行後に追加される `label.tsx` が Radix ベースだった場合、`dependencies` に `@radix-ui/react-label` が加わる（`@radix-ui/react-slot` も同様）。base-ui との併存で混乱しないか、方針として許容するかを実装前に確認したい。
   - 選択肢: (a) Radix 依存をそのまま受け入れて標準 shadcn の恩恵を取る（最小工数）／(b) base-ui ベースで `form.tsx` を自前実装する（工数増、W1-06 のスコープを超える）。**推奨は (a)**。

2. **Zod のバージョン選択**
   - Zod v4 は破壊的変更あり。`@hookform/resolvers` の対応版を確認して選ぶ必要がある。**推奨は v3 系（安定・互換性重視）**。決めきれない場合はこの Issue で v3 を採用し、v4 移行は別 Issue に切る。

3. **登録スキーマ（`register.ts`）は今回作らない**
   - Issue 本文で明記されているサンプルは `login.ts` のみ。氏名・パスワード確認一致などのより複雑な検証は #10（W1-10 認証画面）で作る。ここに広げるとスコープが膨らむため計画には含めない。

4. **サンプルテストの粒度**
   - DoD は「1 件通る」なので最小 1 ケースで良い。ただし Zod スキーマの安心感を上げるため、正常系 1 + 異常系（email 不正・password 空）2 の計 3 ケースまでは W1-06 の範囲内として許容したい。過剰な網羅は避ける。

5. **FormField 共通部品を独自定義するか、shadcn の form.tsx をそのまま使うか**
   - Issue 本文は「shadcn の `form` を追加 → `src/components/ui/form.tsx` の再利用パターンを確認」までを求めている。**独自ラッパー（`components/form/FormField.tsx` など）は今回作らない**。shadcn 標準の `<FormField control={form.control} name="email" render={...} />` パターンをそのまま採用する。features 側でラッパーが欲しくなった時点で別 Issue で切る。

## 参照

- CLAUDE.md
- docs/frontend_design.md（「状態管理の役割分担」「ディレクトリ構成」）
- docs/screen_spec.md（「5. ログイン ／ 新規登録」）
- docs/issues/5/plan.md（直前の W1-05 基盤 Issue の書式・粒度の参考）
