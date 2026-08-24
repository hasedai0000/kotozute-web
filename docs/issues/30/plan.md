# Issue #30 — W3-10 [F-13] プレビュー画面（全セクション縦表示・印刷 CSS・未記入トグル）

- URL: https://github.com/hasedai0000/kotozute-web/issues/30
- ラベル: frontend, week-3
- マイルストーン: MVP-Week3

## Issue 概要
`/preview` に **全 7 セクション（basic/medical/money/digital/funeral/pet/other）＋大切な人へ** を縦に整形表示するプレビュー画面を実装する。`posthumous` の項目には鍵バッジを添え（本人のみ全件見える）、「未記入も表示」トグル（既定オフ）で埋まっている項目だけを見せる。`@media print` でナビ・ボタンを隠し、`window.print()` 経由の PDF 保存を可能にする。家族ロールでは API が返す範囲だけを描画する（フロントで隠すのは禁止）。

## 調査結果

### 関連ドキュメント
- `CLAUDE.md` 絶対ルール — 「1. features 単位で割る」→ **新規 feature `src/features/preview/`** を作り `components/` に描画部品を集約。`src/app/(app)/preview/page.tsx` は薄い配線のみ。「2. サーバ状態は TanStack Query が唯一の真実」→ 既存の `useNoteFields(section)`／`useEntries(section)`／`useMessages()` を **そのまま並列に呼ぶ**（プレビュー用にサーバ状態を写し取らない）。「5. デザイントークンを使う」→ Tailwind のトークン（`text-foreground` / `text-muted-foreground` / `bg-card` 等）と `timing-*` トークンで表現。直値カラーコードは書かない。「6. 意味で色分け（`TimingBadge`）」→ `posthumous` 表示に既存 `TimingBadge` を再利用。「8. 死後開示の項目は API が返さない限り存在しない前提」→ 家族ロール向けに **フロント側で「隠す」実装を禁止**。API から来たものを素直に描画する。
- `docs/screen_spec.md` §8 プレビュー／書き出し — 「見出し（遺し文＝控え）」「書き出しボタン（PDF／印刷）」「全セクションを縦に整形表示」「`always` と `posthumous` を通しで表示し、**死後開示の項目には鍵バッジ**（本人のみ全件）」「未記入項目は既定で非表示。**『未記入も表示』トグル**で切替」「印刷用スタイル（`@media print`）：ナビ・ボタンを隠し、ページ区切りをセクション単位に」「PDF は印刷経由で可（MVP）。専用出力は v1（F-09）」「家族ロール：閲覧できる範囲のみ出力」「出力は `audit_logs` に記録」— 監査ログは **バック側の責務**（MVP のフロントには API がまだない）。
- `docs/screen_spec.md` §共通仕様「状態の出し分け」— ローディング＝スケルトン（レイアウトを保つ）、エラー＝再試行ボタン、空＝説明文＋一次アクション。プレビューは複数クエリを並列で待つため、**セクション単位** でのスケルトン／エラーが読みやすい。
- `docs/screen_spec.md` §共通仕様「ロールによる出し分け」— 「編集 owner 可 / family 不可」「`posthumous` の項目：owner は常に見える（鍵バッジ付き）／family は解放前は **存在しない**（API が返さない）」。プレビューでも同じ規則を再適用。
- `docs/frontend_design.md` §UI — 「白基調・カード型・角丸・フラット」。プレビューは印刷を主目的とするため、**カードで囲うより素直な縦フロー**（見出し＋定義リスト風）が印刷 CSS と相性が良い。ただし `EntryCard` は既存流儀があるため、リスト項目は EntryCard 互換の見た目で並べる（アクション無しの `readOnly` 形態）。
- `docs/frontend_design.md` §アクセシビリティ — 「高齢の家族も閲覧者」。プレビューは印刷前提でもオンライン閲覧が発生するため、**十分な文字サイズ・行間・ページ内見出し階層（h1→h2→h3）** を維持。`prefers-reduced-motion` は既に `globals.css` で対応済み。

### 関連コード
- `src/app/(app)/preview/page.tsx:1-7` — 現状は `<h1>` のみのスタブ。**本 Issue で `PreviewContent` を配線**（`AppLayout` の中で描画される）。
- `src/app/(app)/layout.tsx:6-21` — `AppAuthGuard` → `Header` → `<main>` の構造。`Header` は `sticky top-0`。印刷時に非表示にするため、**`Header.tsx` の `<header>` に `print:hidden` を付与**（Tailwind v4 の `print:` バリアント）。`<main>` の `py-6` は印刷時に潰したいので、page 側で `print:pt-0` を当てる。
- `src/components/layout/Header.tsx:206` — `<header className="sticky top-0 z-40 ...">` に `print:hidden` を追加。ユーザーメニュー内の「プレビュー」導線（`src/components/layout/Header.tsx:186`）は現状すでにある。
- `src/features/notebook/constants/sections.ts:6-14, 41-127` — `SECTION_SLUGS`／`SECTIONS`／`SECTION_ORDER` から **セクション一覧と各セクションの `fields` 定義**（`FieldDefinition[]`：`key`/`label`/`kind`）を引ける。プレビューはこれを見出し・定義リストのラベル源にする。
- `src/features/notebook/constants/categories.ts:50-303` — `CATEGORIES[category].fields`／`primaryKey`／`metaKeys` から **リスト項目（口座・保険等）のラベルと表示順** を引ける。プレビューでは `primaryKey` を見出し、`fields` 全件をラベル＋値で並べる（EntryCard の meta より詳しくして「印刷に耐える」情報密度にする）。`aftermath` / `account_type` の `select` は `options.label` に解決する必要あり。
- `src/features/notebook/api/useNoteFields.ts:27-34` — `useNoteFields(section)` はキャッシュに乗るため、**プレビューで 7 回呼んでも既に開いたセクションはヒットする**。404 は空を返す設計。プレビュー側でこの流儀を活用。
- `src/features/notebook/api/useEntries.ts:38-45` — `useEntries(section)` 同上。
- `src/features/messages/api/useMessages.ts:25-32` — `useMessages()` はセクションではないので単独で呼ぶ。既定タイミングは `posthumous`（`src/features/messages/schema/message.ts:14-25`）だが、レコード単位の `timing` を持つため描画時は `TimingBadge` を付与。
- `src/features/notebook/components/TimingBadge.tsx:1-36` — `variant: "always" | "posthumous"` の共通部品。`posthumous` は自動で鍵アイコン付きになる。プレビューでも **同じ TimingBadge をそのまま使う**（追加コンポーネント不要）。
- `src/features/notebook/components/EntryCard.tsx:1-77` — `readOnly=true` で `onEdit`/`onDelete` を出さない形態が既に用意されている。プレビューでリスト項目を並べる際、`readOnly` で再利用できる。ただし印刷での可読性を優先し、**プレビュー専用の縦フロー描画**（`PreviewEntry`）を新設して各カテゴリの `fields` 全件を「ラベル：値」で並べる方針を採る（EntryCard の meta は 3 行程度に丸めているため印刷情報として不足）。
- `src/features/auth/api/useMe.ts:8-14` — `AuthRole = "owner" | "family"`。`user.role === "family"` を判定に使う。未定義は owner 扱い。
- `src/features/auth/hooks/useAuth.ts:1-13` — `useAuth()` で参照。既に `SettingsPage`／`DashboardPage` で同じパターンあり。
- `src/lib/query/queryKeys.ts:5-27` — プレビュー専用のキーは **不要**（既存 notebook/messages キーに相乗り）。追加なし。
- `src/styles/globals.css:142-163` — `@layer base` に `prefers-reduced-motion` はあるが **`@media print` は未定義**。本 Issue では **`globals.css` に手を入れず、Tailwind の `print:` バリアント（`print:hidden` / `print:break-before-page` / `print:p-0` / `print:bg-white`）でクラス側に閉じる**。理由：印刷 CSS の副作用（他画面への波及）を避け、preview feature 内に完結させる。
- `src/components/ui/switch.tsx` — 既に存在（`NotificationsSection.tsx` で使用）。「未記入も表示」トグルに再利用可能。
- `src/components/layout/Container.tsx` — 幅の共通コンテナ。プレビューは印刷時に幅制約を緩めたい（`print:max-w-none print:px-0`）ため、**page 側で Container の内側にラッパを置き、そこにレスポンシブ／印刷クラスを当てる**。

### 依存関係
- **先行**: #21〜#26（Week 3 の EntryDialog / EntryCard / TimingBadge / 手紙一覧）— 全て **close 済み**。データ源とバッジ部品はすでに揃っている。
- **並列**: なし（Week 3 の他 Issue はすべて close 済み）。
- **参照のみ**: 
  - **F-09**（v1 の書き出し API）— PDF 専用出力はスコープ外。MVP は `window.print()` 経由の PDF 保存で完結する（Issue DoD 通り）。
  - **監査ログ**（`audit_logs` への出力記録）— screen_spec §8 にあるが **バック側の責務**。フロントは印刷ボタン押下時に mutation を叩く仕様が API 側で定義されていない現時点では実装しない（TODO コメントで残す）。
  - **家族ロール判定**（Week 4 の招待受諾フロー #34/#35 系）— まだ `role` は API から返らない前提の実装だが、`useMe.ts` のコメント通り「未定義は owner 扱い」で動く。family ロールになった際の挙動は **API がフィルタして返す前提**（`useNoteFields`／`useEntries`／`useMessages` の戻りをそのまま描画するだけ）で自動的に成立する。

## やること

### feature 骨格
- [ ] `src/features/preview/` を新設
  - `components/PreviewContent.tsx`（トップコンポーネント：ツールバー＋全セクション＋メッセージを縦に並べる。`showUnfilled` の `useState` を保持）
  - `components/PreviewToolbar.tsx`（「PDF を保存」ボタン＝`window.print()`、「未記入も表示」`Switch`。`print:hidden`）
  - `components/PreviewSection.tsx`（1 セクション分：見出し＋説明＋単一項目＋リスト項目。`print:break-before-page` を 2 番目以降に付与）
  - `components/PreviewFields.tsx`（`SECTIONS[slug].fields` を「ラベル：値」の定義リストで描画。`useNoteFields(slug)` を呼び、未記入判定＋トグル制御）
  - `components/PreviewEntries.tsx`（`useEntries(slug)` を呼び、各エントリを `PreviewEntry` で描画。`TimingBadge` 付き）
  - `components/PreviewEntry.tsx`（1 エントリ：`CATEGORIES[category].primaryKey` を見出し、`fields` 全件を「ラベル：値」で並べる。`select` は `options.label` に解決）
  - `components/PreviewMessages.tsx`（`useMessages()` を呼び、宛先＋本文を縦に並べる。`TimingBadge` 付き）
  - `components/PreviewSectionSkeleton.tsx`（セクション単位のスケルトン。レイアウトを保つ）
- [ ] `hooks/` は当面不要（`showUnfilled` は `PreviewContent` の `useState` で十分）

### 描画ルール（プレビュー固有）
- [ ] セクション見出しは `<h2>`、カテゴリ／エントリ見出しは `<h3>` を使い、印刷での見出し階層を維持
- [ ] `posthumous` の項目は `TimingBadge variant="posthumous"` を必ず添える（owner が全件見られる根拠）
- [ ] 未記入判定
  - `note_fields`：`fields[key]` が `undefined` / 空文字なら未記入
  - `note_entries`：セクションで `entries.length === 0` なら未記入
  - `messages`：`messages.length === 0` なら未記入
- [ ] `showUnfilled === false`（既定）のとき、未記入項目・空セクションを描画しない。ただし **セクション見出しは常に表示**（「〇〇のこと（未記入）」の薄い表記で存在は示す）
- [ ] `showUnfilled === true` のとき、未記入は「（未記入）」プレースホルダで並べる

### 印刷 CSS（Tailwind print: バリアント）
- [ ] `src/components/layout/Header.tsx:206` の `<header>` に `print:hidden` を付与
- [ ] `PreviewToolbar` 全体に `print:hidden`
- [ ] `PreviewContent` ラッパに `print:p-0 print:max-w-none`
- [ ] `PreviewSection` の 2 番目以降に `print:break-before-page`（`data-first` 属性で先頭を判定）
- [ ] リンク／ボタンなど全ての操作系に `print:hidden`（プレビューには元々ないが、`Header` の `UserMenu` 等は Header 全体を隠すので副次的に消える）
- [ ] `globals.css` は **編集しない**（副作用回避）

### ページ配線
- [ ] `src/app/(app)/preview/page.tsx` を `PreviewContent` の render に差し替え（"use client" 指定）
- [ ] タイトル `<h1>プレビュー・書き出し</h1>` は `PreviewContent` の中で保持（現ページの `<h1>` を移設）
- [ ] `useAuth()` で `role` を取り、必要なら `PreviewContent` に prop で渡す（現時点では API が返す範囲を描画するだけなので **role prop は不要**、`showUnfilled` の初期値のみ管理）

### テスト（Vitest / RTL）
- [ ] `PreviewContent.test.tsx`
  - 既定で `showUnfilled === false`：空のセクションは中身が描画されない
  - トグル ON：未記入セクションに「（未記入）」プレースホルダが並ぶ
  - 印刷ボタンをクリックすると `window.print` が呼ばれる（`vi.spyOn(window, "print")`）
- [ ] `PreviewSection.test.tsx`
  - 単一項目のみ／リスト項目のみ／両方あるセクションが正しく描画される
  - `posthumous` エントリに `TimingBadge`（`aria-label="死後開示"`）が付く
- [ ] `PreviewMessages.test.tsx`
  - 手紙 0 通のとき、`showUnfilled=false` では非表示、`true` では「（未記入）」を表示
  - `posthumous` の手紙には鍵バッジが付く
- [ ] 家族ロール相当（API が posthumous を返さない）テスト：`useEntries` のモックで posthumous を空にした状態で `TimingBadge posthumous` が **1 つも描画されない** ことを確認（＝フロント側で隠す実装が入っていない保証）

### 手動確認（DoD 直結）
- [ ] Chrome DevTools の「Rendering → Emulate CSS media type: print」で **ヘッダー・ツールバーが消える** ことを確認
- [ ] `window.print()`（Cmd+P）→ プレビュー画面で **ナビ・ボタンが表示されない** ことを確認
- [ ] 「PDF として保存」でファイル生成できることを確認
- [ ] セクション区切りが **改ページ** で分かれることを確認

## 完了条件（DoD）
Issue 本文の DoD を転記：
- [ ] `window.print()` 経由で PDF 保存できる
- [ ] 印刷プレビューで Nav/Header/CTA が非表示

追加で以下も満たす（screen_spec §8 の記述由来）：
- [ ] 「未記入も表示」トグルが動作する（既定オフ）
- [ ] `posthumous` 項目に鍵バッジ（`TimingBadge posthumous`）が付く
- [ ] 家族ロールで **フロント側で隠す実装が入っていない**（API が返さないものは元から現れない）
- [ ] `npm run lint` / `npm run typecheck` / `npm run test` が緑

## リスク / 確認事項
- **監査ログ（`audit_logs`）**: screen_spec §8 は「出力は `audit_logs` に記録」と書いているが、API が未定義。今回は **フロントでは記録しない**（TODO コメントで残す）。この判断で良いか？
- **プレビュー用の EntryCard 再利用 vs 専用描画**: 既存 `EntryCard` は `readOnly` モードで再利用可能だが、meta が 3 項目程度に丸まっている（`categories.metaKeys`）。**印刷での情報密度を優先し、`PreviewEntry` として全 `fields` を「ラベル：値」で並べる新規部品** を作る方針で進めたい。EntryCard 再利用の方が良ければ指示を。
- **セクション見出しを常に表示 or 空セクションごと隠す**: 「未記入も表示 OFF」のとき、空セクションを完全に隠す方が印刷は綺麗だが、**全体像が見えない不安** もある。今回は **見出しだけ薄い表記で残す** 方針。要否を確認。
- **`globals.css` の `@media print` 追加**: Tailwind の `print:` バリアントで完結できるため触らない方針だが、全体の印刷ベーススタイル（body の背景を白に固定するなど）を CSS に持ちたければ追記する。今回は不要と判断。
- **家族ロールの動作確認**: 現時点で API が role でフィルタする実装が無いため、家族向けの本番動作は Week 4 以降のバック実装まで **モックでの確認に留まる**。それで良いか。
- **PDF ボタンのラベル**: 「PDF を保存」／「印刷」の 2 つに分けるか、「印刷 / PDF 保存」の 1 ボタンで済ませるか。今回は **1 ボタン「PDF を保存（印刷）」で `window.print()` を呼ぶ** 方針。

## 参照
- `CLAUDE.md`
- `docs/frontend_design.md`（§UI、§状態管理、§アクセシビリティ）
- `docs/screen_spec.md` §8 プレビュー／書き出し、§共通仕様
- 既存実装: `src/features/notebook/components/{TimingBadge,EntryCard}.tsx`、`src/features/notebook/api/{useNoteFields,useEntries}.ts`、`src/features/messages/api/useMessages.ts`、`src/features/notebook/constants/{sections,categories}.ts`
