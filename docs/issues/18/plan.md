# Issue #18 — W2-06 [F-04] ノート一覧 /notebook

- URL: https://github.com/hasedai0000/kotozute-web/issues/18
- ラベル: frontend, week-2
- マイルストーン: MVP-Week2

## Issue 概要
`/notebook` を「7 セクション ＋ 大切な人へ」への**ハブページ**として実装する。ダッシュボードの `SectionGrid`（`SectionCard` × 7 + `MessagesCard`）を再利用し、クリックで `/notebook/[section]` へ遷移する。ローディング／エラー／空の挙動は共通仕様に従う。進捗値は**ダッシュボードと同じフック**（`useNoteSummary`）を使い、キャッシュ経由で必ず一致させる。

## 調査結果

### 関連ドキュメント
- `CLAUDE.md` 絶対ルール — 「1. features 単位で割る／`src/app/` はルーティング専任で薄く保つ」「2. サーバ状態は TanStack Query が唯一の真実（`useState` に写し取らない）」。**本 Issue の中心的な移動理由がまさに 1.**：同じグリッドを 2 ページから使うため、`src/app/(app)/dashboard/_components/` に閉じている `SectionGrid` を `features/notebook/components/` に持ち上げる。
- `docs/frontend_design.md` §「画面とパス」— `/notebook` は認証必須（Route Group `(app)` 配下、`AppAuthGuard` はすでに `src/app/(app)/layout.tsx` で敷かれている）。
- `docs/screen_spec.md` §1「ダッシュボード」— セクションカードは「7 領域 ＋ 大切な人へ」の 8 枚。**進捗＝`記入済み項目数 ÷ 全項目数`**、`note_fields` は値あり／`note_entries` は 1 件以上で「記入済み」。
- `docs/screen_spec.md` §2「セクション編集」— カードから遷移する先の URL は `/notebook/[section]`。section の値は `basic` / `medical` / `money` / `digital` / `funeral` / `pet` / `other` の 7 種で 1 実装。**本 Issue はハブのみ**、セクション個別ページ（#19）は先取りしない。
- `docs/screen_spec.md` §「共通仕様 → 状態の出し分け」— ローディング＝スケルトン（スピナー単体は禁止）／エラー＝内容 ＋ 再試行／空＝説明 ＋ 一次アクション。**`/notebook` のハブでも同じ規約**。

### 関連コード
- `src/app/(app)/notebook/page.tsx:1-7` — **現状スタブ**（`<h1>マイノート</h1>` のみ）。本 Issue で描画本体を差し替える。
- `src/app/(app)/notebook/[section]/page.tsx` — 空スタブが存在（#19 で実装）。**遷移先が存在すること自体は問題なし**、本 Issue でも触らない。
- `src/app/(app)/layout.tsx:1-21` — `AppAuthGuard` + `Header` + `Container` を提供。**`/notebook/page.tsx` 側で `<Container>` をラップし直さない**（既に layout が包む）。
- `src/app/(app)/dashboard/_components/SectionGrid.tsx:1-66` — **今回の再利用対象**。`useNoteSummary()` を呼び、`SECTION_ORDER.map(SectionCard)` ＋ `MessagesCard` を 8 枚グリッドで描画。ローディングは `SectionCardSkeleton` を 8 枚、エラーは `EmptyState` ＋再試行ボタン。**本ロジックは `/notebook` ハブでもそのまま欲しい**ため、feature 側に持ち上げる（詳細は「やること」）。
- `src/app/(app)/dashboard/_components/MessagesCard.tsx:1-53` — 手紙アイコン ＋ 通数 ＋ `/messages` リンク。`SectionGrid` の 8 枚目として使われる。同様に feature 側へ移す。
- `src/app/(app)/dashboard/page.tsx:1-23` — `SectionGrid` を `./_components/SectionGrid` から import している。**移動後は import パスを更新**する（動作は不変）。
- `src/app/(app)/dashboard/page.test.tsx:1-107` — `DashboardPage` レンダリングテスト。移動先変更で内部実装は変わるが**テスト対象の外形（データフロー）は同じ**なので、既存テストは追加変更なしで通る想定。走らせて確認する。
- `src/features/notebook/api/useNoteSummary.ts:1-56` — `apiFetch<NoteSummary>("/note-summary")` を試み、404 は空返し。`retry: false`, `staleTime: 30_000`。**同一 `queryKey`（`queryKeys.notebook.summary`）でキャッシュ共有**され、`/dashboard` と `/notebook` の**進捗値が自動的に一致する**（DoD「進捗値がダッシュボードと一致」を構造的に保証）。
- `src/features/notebook/components/SectionCard.tsx:1-60` — `slug` を受けて `Card` + `Link` で `/notebook/[slug]` にリンクを張る。`useSectionProgress` で `filled/total` を算出。**そのまま再利用**。
- `src/features/notebook/components/SectionCardSkeleton.tsx:1-30` — `role="status"` ＋ `Skeleton` によるスケルトン。**そのまま再利用**。
- `src/features/notebook/constants/sections.ts:1-83` — `SECTION_ORDER`（7 件）と `SECTIONS`。`SECTION_ORDER.length + 1 = 8` がスケルトン枚数（`SectionGrid` 内で使用）。
- `src/features/notebook/hooks/useSectionProgress.ts:1-51` — `SectionCard` 内で呼ばれる純粋関数フック。触らない。
- `src/components/layout/EmptyState.tsx:1-41` — `title` / `description` / `action` を受ける汎用 UI。エラー時のガイドに使用。**そのまま再利用**。
- `src/components/layout/Header.tsx:36-40` — ナビは `/dashboard` / `/notebook` / `/family`。`/notebook` はすでに登録済みで、`isActive` は `pathname === '/notebook' || pathname.startsWith('/notebook/')` を満たす（`isActive` の実装 L42-45）。**ナビの変更不要**。
- `src/features/messages/` — 中身は空。`MessagesCard` はダッシュボード配下に置かれているが**本質は「大切な人へ」への入口カード**。`features/messages/components/` に移すのが CLAUDE.md ルール 1（features 単位）に整合するが、ダッシュボードの `SectionGrid` と一体で扱われる部品でもある。**選択肢の整理は「やること」冒頭に記載**。

### 依存関係
- 先に必要（**完了済み**）:
  - **#16 W2-04** — `SECTIONS` / `useSectionProgress`。`SectionCard` の基盤。
  - **#17 W2-05** — `SectionGrid` / `SectionCard` / `MessagesCard` / `useNoteSummary` が本 Issue の再利用対象。
- 先に必要（**未完・スコープ内で回避**）:
  - **notebook API（`GET /note-summary` 相当）** — 未実装。`useNoteSummary` が 404 を空扱いに落とすので、UI レイアウトは完成できる（実データ差し替えは Week 3 の #20 以降）。
- 関連（後続）:
  - **#19 W2-07 セクション編集ページ** — 本 Issue のカードのリンク先。**本 Issue では先取り実装しない**。
  - **#25/#26 大切な人へ** — 「大切な人へ」カードのリンク先。**本 Issue では先取り実装しない**（既にリンクだけは張られている）。

## やること

### 前提の意思決定（ユーザー確認済み）

- **案 A で進める**：`SectionGrid` を `src/features/notebook/components/SectionGrid.tsx` に、`MessagesCard` を `src/features/messages/components/MessagesCard.tsx` に**移動**する。理由：CLAUDE.md ルール 1（features 単位）と、ダッシュボード／ノート一覧の 2 か所から使うため。ダッシュボードは import パスの差し替えのみで挙動不変。
- **`/notebook` にも「家族を招待しませんか」CTA を出す**：`FamilyStatusCard` を `src/features/family/components/FamilyStatusCard.tsx` に持ち上げて **`/dashboard` と `/notebook` の両方から再利用**する。

### 移動・整理

- [ ] **`src/features/notebook/components/SectionGrid.tsx`（新規＝dashboard から移動）**
  - `src/app/(app)/dashboard/_components/SectionGrid.tsx` の内容を移動。
  - `MessagesCard` の import パスを `@/features/messages/components/MessagesCard` に更新。
  - コンポーネントは Client Component のまま（`useNoteSummary` を呼ぶため `"use client"` を維持）。
  - **API は変えない**：`data`, `isPending`, `isError`, `refetch` の 4 値を扱う。エラー時の `EmptyState` 文言（「ノート情報を読み込めませんでした」）と再試行ボタンも変えない。
- [ ] **`src/features/messages/components/MessagesCard.tsx`（新規＝dashboard から移動）**
  - `src/app/(app)/dashboard/_components/MessagesCard.tsx` の内容を移動。実装は不変。
  - features/messages 直下に `components/` が無ければ作る（`.gitkeep` 相当は不要、コンポーネントを置けば OK）。
- [ ] **`src/features/family/components/FamilyStatusCard.tsx`（新規＝dashboard から移動）**
  - `src/app/(app)/dashboard/_components/FamilyStatusCard.tsx` の内容を移動。実装は不変。
- [ ] **`src/app/(app)/dashboard/_components/SectionGrid.tsx` / `MessagesCard.tsx` / `FamilyStatusCard.tsx` を削除**
  - `dashboard/page.tsx` の import を `@/features/notebook/components/SectionGrid` / `@/features/family/components/FamilyStatusCard` に差し替え。
- [ ] **ダッシュボードのテストが通ることを確認**（`src/app/(app)/dashboard/page.test.tsx` は外形のみを見ているので、import 移動で影響なし想定）。

### `/notebook` ページ本体

- [ ] **`src/app/(app)/notebook/page.tsx`（既存スタブを差し替え）**
  - Client Component にする（`"use client"`）。理由：`SectionGrid` が Client Component（`useNoteSummary` を呼ぶ）。
  - 骨組み（上から）:
    1. 見出し `<h1>マイノート</h1>`（既存の文字列を踏襲、`text-2xl font-semibold` は据え置き）。
    2. 説明文（1〜2 行）：「7 つの領域と『大切な人へ』を分けて残せます。気になるところから書きはじめましょう。」— docs の §1／§2 の主旨に沿う静かなトーン。
    3. `<SectionGrid />`（import: `@/features/notebook/components/SectionGrid`）。
    4. `<FamilyStatusCard />`（import: `@/features/family/components/FamilyStatusCard`）。未招待時に「家族を招待しませんか」CTA を出す。
  - **`<Container>` でラップしない**（layout が既に包む）。
  - `useState` にサーバ状態を写し取らない（そのまま `SectionGrid` / `FamilyStatusCard` が Query から取る）。

### レイアウト・アクセシビリティ

- [ ] **グリッド列数**は `SectionGrid` 側の既定（`grid-cols-2 md:grid-cols-3 xl:grid-cols-4`）に従う。ダッシュボードと視覚的に揃う。
- [ ] **見出しの階層**は `/notebook` の h1 が「マイノート」、`SectionGrid` 内は見出しを持たないので階層は破綻しない。
- [ ] **ヘッダーの `aria-current`**：`Header.tsx` L44 の `isActive` により `/notebook` および `/notebook/[section]` で「ノート」がアクティブ表示になる（既実装）。**追加変更なし**。
- [ ] **キーボード操作**：`SectionCard` は `<Link>` ＋ `focus-visible:ring-2` を持つ（既実装）。**追加変更なし**。
- [ ] **prefers-reduced-motion**：`Skeleton` は shadcn の既定で対応。追加のトランジションは入れない。

### テスト（推奨）

- [ ] **`src/app/(app)/notebook/page.test.tsx`（新規、任意だが推奨）**
  - React Testing Library ＋ `QueryClientProvider`。`fetch` を stub して以下 3 件:
    1. 見出し「マイノート」が描画される。
    2. `/note-summary` が 200 で空サマリを返したとき、8 枚のセクションカード（`role="link"` × 7 + 「大切な人へ」1 枚）が並び、`money` カードのリンクが `href="/notebook/money"` を持つ。
    3. `/note-summary` が失敗したとき、`EmptyState`（「ノート情報を読み込めませんでした」）と再試行ボタンが描画される。
- [ ] **`src/features/notebook/components/SectionGrid.test.tsx`（新規、任意）**
  - 移動先で単体テストを持たせるなら、ローディング／エラー／成功（8 枚描画）の 3 件。**既存 `SectionCard.test.tsx` / `useNoteSummary.test.ts` と重複する内容にはしない**。

### 触らないもの

- **ナビ／ヘッダー**（`Header.tsx`）：既に `/notebook` を含む。
- **`SectionCard` / `SectionCardSkeleton` / `useSectionProgress` / `useNoteSummary`**：そのまま再利用（改修不要）。
- **`/notebook/[section]/page.tsx`**：#19 のスコープ。
- **`/messages` / `/family` ページ**：#25/#26/#31 のスコープ。

## 完了条件（DoD）
Issue の DoD を転記:
- [ ] 7 セクション + 大切な人へ が並ぶ
- [ ] 進捗値がダッシュボードと一致（同じフックを使う）

上記の実現手段は「やること」に対応：
- 8 枚並び → `SectionGrid` を再利用（`SECTION_ORDER.map(SectionCard)` ＋ `MessagesCard`）。
- 進捗一致 → 同一 `queryKeys.notebook.summary` を持つ `useNoteSummary` を共有し、TanStack Query のキャッシュ経由で自動一致（`useState` に写し取らない）。

## リスク / 確認事項
- **`SectionGrid` / `MessagesCard` の移動を伴う**：ダッシュボードから import パス変更が発生する（振る舞いは不変）。→ **要ユーザー確認**：案 A（feature 側に移動）で進めてよいか、それとも本 Issue のスコープでは移動を避け、`/notebook/page.tsx` から `@/app/(app)/dashboard/_components/SectionGrid` を直接 import する（案 B）にとどめるか。**推奨は案 A**（CLAUDE.md ルール 1）。
- **`MessagesCard` の置き場所**：案 A では `features/messages/components/` を新設する（現状 `src/features/messages/` は空）。**もし「Week 2 は messages feature に手を付けたくない」なら、暫定で `features/notebook/components/MessagesCard.tsx` に置く**（ハブ用の複合部品として扱う）。要判断。
- **「大切な人へ」の進捗表現**：`SectionCard` は進捗バーを持つが、`MessagesCard` は件数のみ（進捗バーなし）。**#17 の計画で既にこの方針**なので本 Issue でも踏襲する。
- **未招待時の CTA**：ダッシュボードでは `FamilyStatusCard` が「家族を招待しませんか」を出すが、**`/notebook` はハブ機能に集中**するため CTA を持たせない（Issue 本文にも該当記述なし、`screen_spec.md` §1 の記述はダッシュボード限定）。**要ユーザー確認**：`/notebook` にも同 CTA を持たせたい場合は追加スコープになる。
- **空状態**：`useNoteSummary` は 404 でも空サマリを返す（＝常にセクション名だけは並ぶ）ので、「そもそも 0 枚」というケースは発生しない。→ 空 UI（`EmptyState` 単体表示）は必要なく、エラー時のみ `EmptyState`。Issue 本文の「空 / エラー状態の共通挙動」はエラー分岐で満たす。
- **notebook API 未実装**：`useNoteSummary` は 404 を空扱い、他エラーは throw して `isError`。実 API 完成時（#20+）に差し替え予定（本 Issue は影響なし）。
- **スコープ外の誘惑**：`/notebook/[section]`（#19）や `/messages` の中身（#25/#26）は先取りしない。**本 Issue はハブと再利用整理のみ**。

## 参照
- CLAUDE.md（絶対ルール 1・2）
- docs/frontend_design.md（§画面とパス、§ディレクトリ構成、§状態管理の役割分担）
- docs/screen_spec.md §1 ダッシュボード（進捗の定義、8 枚構成）、§2 セクション編集（遷移先 URL 規約）、§共通仕様（ローディング／エラーの規約）
- 前提 Issue #16（SECTIONS / useSectionProgress）、#17（SectionGrid / useNoteSummary）
- 後続 Issue #19（`/notebook/[section]` 実装）
