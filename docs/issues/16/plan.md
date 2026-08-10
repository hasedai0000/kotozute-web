# Issue #16 — W2-04 [F-06] 進捗計算ユーティリティ + セクション定数

- URL: https://github.com/hasedai0000/kotozute-web/issues/16
- ラベル: frontend, week-2
- マイルストーン: MVP-Week2

## Issue 概要
ダッシュボード（#17）とセクション編集ページ（#19）の両方から使う「セクションの定義」と「進捗計算」を、共通の場所に固める。具体的には (1) `src/features/notebook/constants/sections.ts` に 7 セクション（basic / medical / money / digital / funeral / pet / other）の定義（slug・ラベル・説明・単一項目 fields・リストカテゴリ）を宣言的に置き、(2) `src/features/notebook/hooks/useSectionProgress.ts` で `記入済み / 全項目` を返す React フックを提供し、(3) Vitest で 0/0・全記入・部分記入の境界値テストを 3 件以上パスさせる。

## 調査結果

### 関連ドキュメント
- `CLAUDE.md` 絶対ルール — 「1. features 単位で割る（`src/features/notebook/`）」「2. サーバ状態は TanStack Query が唯一の真実。API データを `useState` に写し取らない」「8. 死後開示の項目は API が返さない限り存在しない前提」。**本 Issue のフックは「渡された data から純粋に計算する」形にとどめ、フェッチや state 保持は行わない**。
- `docs/frontend_design.md` §「画面とパス」— `/notebook/[section]` の section は「basic / medical / money / digital / funeral / pet / other。1 実装で 8 領域を賄う」。**本 Issue で扱うのはこの 7 slug**。
- `docs/frontend_design.md` §「ディレクトリ構成」— `features/notebook/{api,components,constants,hooks,schema}` の骨格が明示されており、`constants/` と `hooks/` は本 Issue で初めて実体を持つ。
- `docs/screen_spec.md` §「共通仕様 → ロールによる出し分け」— `posthumous` は家族側では **API が返さない**。**進捗計算は「返ってきた fields / entries」だけを見る**（クライアント側で `posthumous` を捨てる処理は書かない）。
- `docs/screen_spec.md` §1 ダッシュボード — 「進捗＝`記入済み項目数 ÷ 全項目数`。`note_fields` は値あり、`note_entries` は 1 件以上で『記入済み』」。**この定義を関数化する**。ダッシュボードカードは「7 領域＋大切な人へ」の 8 枚だが、`messages` は `features/messages` 配下で別実装のため **本 Issue では notebook の 7 slug のみを constants 化**（Issue 本文の列挙とも一致）。
- `docs/screen_spec.md` §2 セクション編集 — 単一項目 (`note_fields`) と、カテゴリ別リスト項目 (`note_entries`：bank_account / insurance / property / loan / account / subscription / pet …) の 2 種類。**進捗の分母は「そのセクションが持つ単一 field 数 + リストカテゴリ数」**、分子は「値のある field + 1 件以上ある category」。
- `docs/screen_spec.md` §2「機微情報の注意（money / digital のみ）」— セクション定数に `sensitive: boolean` を持たせておくと、#19 の注意文表示ロジックを分岐 1 本で書ける（Issue #19 の DoD「money セクションに注意文がある」への布石）。**スコープは #16 の範囲内**（constants の 1 フィールド追加のみ）。

### 関連コード
- `src/features/notebook/constants/` — **空ディレクトリ**（`ls` で確認済み）。新規作成。
- `src/features/notebook/hooks/` — **空ディレクトリ**。新規作成。
- `src/features/notebook/components/SectionProgress.tsx:1-44` — **既存**。`{filled, total, label}` を props で受け取り、`Math.max` / clamp で防御済み（`filled=15, total=10 → 10/10`、`total=0 → 0/0` に対応）。**本 Issue の useSectionProgress の返り値をそのまま渡せる形にする**（後述の型設計）。
- `src/features/notebook/components/SectionProgress.test.tsx:1-25` — 既存のテストパターン（境界値：0/0、clamp、通常）。**`useSectionProgress.test.ts` の書き味を踏襲**。
- `src/features/notebook/components/{TimingBadge,EntryCard}.tsx` — 既存の feature 内命名規則（PascalCase コンポーネント、named export、`type Xxxx = { ... }`、`cn()` で class 結合）。**constants / hooks も同一規約で書く**（`export const SECTIONS = [...]`, `export function useSectionProgress(...)`）。
- `src/features/notebook/api/` — **空**。API 型はまだ生成されていない（`src/types/generated/api.ts` は 61 行の雛形）。**useSectionProgress はここの型に依存させない**（generic な `note_field` / `note_entry` 形の入力を受ける）。
- `src/lib/query/queryKeys.ts:1-6` — 現状 `queryKeys.auth.me` のみ。**本 Issue では触らない**（`queryKeys.notebook(...)` を足すのは #17 or #18 のスコープ）。
- `src/app/dev/components/page.tsx:118-125` — `SectionProgress` の dev プレビューあり。**必要なら `SECTIONS` を map してプレビューを増やす手もあるが、#17 と重複するので本 Issue ではスコープ外**。
- 他 feature（`features/auth/{api,schema,lib}`）のテスト構造 — Vitest の import 方針（`@testing-library/react`, `describe/it/expect` を `vitest` から）は既存に合わせる。フックのテストは `renderHook` を `@testing-library/react` から使う（`useAuth.test.tsx` で採用済み）。

### 依存関係
- 先に必要: **なし**（既存の `SectionProgress` コンポーネントと Vitest 環境のみで完結。認証系 #9/#13/#14/#15 とは独立）。
- 関連（後続）:
  - **#17 W2-05 ダッシュボード** — `SECTIONS` を map してセクションカードを描画。`useSectionProgress` で各カードとヘッダーの全体進捗を算出。**本 Issue の import 契約が後続の実装スピードを決める**。
  - **#18 W2-06 ノート一覧 `/notebook`** — セクション一覧の同型。
  - **#19 W2-07 セクション編集ページ骨組み** — `SECTIONS[section]` から `label` / `description` / `sensitive` / `fields` / `entryCategories` を取り、パンくず・注意書き・進捗を描画。**`sensitive: true` を money / digital に付けておくことで #19 の DoD「money に注意文」を 1 分岐で実現できる**。
- API 側依存: **なし**（本 Issue はクライアント側の純粋計算とデータ定義のみ）。将来 `note_fields` / `note_entries` の API 型が生成されたら、`useSectionProgress` の入力型をそれに合わせて絞り込む（後続 Issue で）。

## やること

- [ ] **`src/features/notebook/constants/sections.ts`（新規）**
  - `SECTION_SLUGS = ["basic", "medical", "money", "digital", "funeral", "pet", "other"] as const`。
  - `export type SectionSlug = (typeof SECTION_SLUGS)[number]`。
  - `type SectionDefinition = { slug: SectionSlug; label: string; description: string; sensitive?: boolean; fields: readonly string[]; entryCategories: readonly string[] }`。
  - `export const SECTIONS: Record<SectionSlug, SectionDefinition>` を宣言。ラベル・説明は日本語で、`docs/screen_spec.md` の意図に沿って**過不足なく**書く（例：`basic` = 「基本情報」／「氏名・生年月日・血液型・緊急連絡先など基本の情報を残します」）。
  - `fields` と `entryCategories` は **docs で列挙されている範囲のみ**入れる（`money` に `bank_account` / `insurance` / `property` / `loan` を、`digital` に `account` / `subscription` を、`pet` に `pet` を、など）。**docs にない項目は空配列で置き、後続 Issue で埋める**（勝手にスコープを広げない）。
  - `sensitive` は **`money` と `digital` にのみ `true`**（screen_spec.md §2 の注意書き対象）。
  - `export const SECTION_ORDER: readonly SectionSlug[]` を提供（ダッシュボードのカード表示順、`SECTION_SLUGS` と同順で OK）。
- [ ] **`src/features/notebook/constants/sections.test.ts`（新規、任意だが推奨）**
  - `SECTION_SLUGS.length === 7`、`SECTIONS[slug].slug === slug` の一致、`sensitive` が付いているのは `money` / `digital` のみ、の 3 件程度。**Issue の DoD「ユニットテスト 3 件以上」は次項の hook 側でも満たすので、こちらは冗長なら省略可**。（推奨：hook が SECTIONS を暗黙に使うため、定数の健全性を先に固めると回帰が減る）
- [ ] **`src/features/notebook/hooks/useSectionProgress.ts`（新規）**
  - **設計方針**: 純粋計算に徹する。フェッチはしない（TanStack Query の呼び出しは含めない）。API 側のスキーマがまだ確定していないため、入力はセクション定数と「渡されたデータ」から自己完結で計算できる形にする。
  - シグネチャ（案 A・推奨）:
    ```ts
    type SectionProgressInput = {
      section: SectionSlug;
      // API 前提が固まる前でも計算できるよう、入力は「値の有無」だけを渡す形にする。
      // note_fields: { [fieldName: string]: unknown } のうち値ありの数（実装は Object.entries で null/undefined/'' 以外を数える）。
      filledFields?: number;
      // note_entries: カテゴリごとの件数マップ。1 件以上あれば「記入済み」1 カウント。
      entryCountByCategory?: Partial<Record<string, number>>;
    };
    type SectionProgress = { filled: number; total: number; percent: number };
    export function useSectionProgress(input: SectionProgressInput): SectionProgress;
    ```
  - 内部で `useMemo` を使って、`SECTIONS[section]` の `fields.length + entryCategories.length` を分母、`Math.min(filledFields ?? 0, fields.length) + entryCategories.filter(c => (entryCountByCategory?.[c] ?? 0) > 0).length` を分子とする（**上限クランプを掛ける**：既存 `SectionProgress` コンポーネントの clamp と揃える）。
  - `percent`: `total === 0 ? 0 : (filled / total) * 100`（0 除算防止。`SectionProgress.tsx:19` と同じ規約）。
  - **併せて純関数 `computeSectionProgress(input): SectionProgress` も同ファイルに export**。テストしやすく、非 React コンテキスト（サーバーコンポーネント等）から使いたくなった時に再利用可能。**hook は純関数を `useMemo` で包むだけ**。
  - **依存配列**: `[section, filledFields, entryCountByCategory]`（`entryCountByCategory` はオブジェクトなので、呼び出し側が安定参照を渡す前提。ダッシュボードは各セクションでカウントを 1 度だけ集計するので問題ない。**hook 内で JSON.stringify 等の workaround は入れない**）。
- [ ] **`src/features/notebook/hooks/useSectionProgress.test.ts`（新規、DoD の 3 件以上を担保）**
  - Vitest。`renderHook` を `@testing-library/react` から import（既存の `useAuth.test.tsx` と同じ）。
  - **境界値 A: 0/0**（constants の fields/entryCategories が空のセクション、または全セクションで入力が空）— `total === (fields.length + entryCategories.length)`、`filled === 0`、`percent === 0`。
  - **境界値 B: 全記入**（`money` セクションで、fields すべてに値あり相当の `filledFields`、`entryCountByCategory` の全カテゴリ ≥ 1）— `filled === total`、`percent === 100`。
  - **境界値 C: 部分記入**（`money` で fields の半分、entryCategories の 1 つだけ 0 件、他は ≥ 1）— `filled` が期待値と一致、`percent` が 0 < x < 100。
  - **追加テスト（推奨、DoD 超過）**:
    - **clamp テスト**: `filledFields` が `fields.length` を超えても `filled` は超えない。
    - **entryCountByCategory に定義外カテゴリを渡しても無視**（`entryCategories` に無いキーはカウントに含めない）。
    - **純関数 `computeSectionProgress` を直接呼んでも同じ結果になる**（hook との等価性）。
- [ ] **`src/features/notebook/index.ts` からの re-export は今回入れない**
  - features のバレル export は現状使っていない（`grep` で確認済）。**規約に無いパターンを持ち込まない**。呼び出し側は `@/features/notebook/constants/sections` / `@/features/notebook/hooks/useSectionProgress` を直接 import する。
- [ ] **既存コードへの影響なし**
  - `SectionProgress.tsx` / `SectionProgress.test.tsx` / `src/app/dev/components/page.tsx` は**変更しない**。返り値 `{filled, total}` をそのまま props に渡せる形にしてある。
- [ ] **`npm run typecheck` / `npm run lint` / `npm run test` を通す**
  - CI に合わせる。Playwright（`test:e2e`）は本 Issue の対象外（純粋なユニット層）。

## 完了条件（DoD）

Issue の DoD を転記:
- [ ] ユニットテスト 3 件以上パス
  - `src/features/notebook/hooks/useSectionProgress.test.ts` の 0/0・全記入・部分記入の 3 件（＋ clamp / 純関数の等価性の追加分）。
- [ ] ダッシュボード / セクション編集の両方から import できる
  - `SECTIONS`, `SECTION_SLUGS`, `SECTION_ORDER`, `useSectionProgress`, `computeSectionProgress`, 型 `SectionSlug` / `SectionDefinition` / `SectionProgress` を named export し、`@/features/notebook/constants/sections` および `@/features/notebook/hooks/useSectionProgress` から解決できる状態にする。#17 / #19 の実装で actual import することで最終的に担保されるが、**本 Issue では型と export の存在を typecheck で担保**（他 feature の import を fake で追加はしない）。

追加（Issue「作業内容」より）:
- [ ] `src/features/notebook/constants/sections.ts`：basic / medical / money / digital / funeral / pet / other + `fields` の総数
- [ ] `src/features/notebook/hooks/useSectionProgress.ts`：`{filled}/{total}`

## リスク / 確認事項

- **「8 セクション」表現のブレ**: Issue タイトル・本文および `frontend_design.md` は「1 実装で 8 領域を賄う」と書きつつ、実際に列挙される slug は 7 個（basic / medical / money / digital / funeral / pet / other）。`screen_spec.md` §1 は「7 領域＋大切な人へ」で `messages` を 8 枚目に数えている。**本 Issue のスコープは notebook 7 slug のみ**とする（`messages` は `features/messages` 配下で別実装、ダッシュボード側で合算する）。**この解釈で進めてよいか要確認**。
- **各セクションの `fields` / `entryCategories` の具体項目**: `screen_spec.md` に列挙されているのはリスト項目（bank_account / insurance / ...）の**カテゴリ別の入力項目**で、各セクションの「単一 field 一覧」は明文化されていない。**本 Issue では docs に明示されているカテゴリのみ `entryCategories` に入れ、`fields` は空 or 最小限にとどめる**（勝手に増やさない）。field 定義の具体化は #19 / #20（W2-08 単一項目フォーム）に委ねる。**この最小主義で OK か要確認**。
- **API 型の未確定**: `src/types/generated/api.ts` は 61 行の雛形で `note_fields` / `note_entries` の型はまだ無い。**本 Issue の hook は API 型に依存させない**（`filledFields: number`, `entryCountByCategory: Partial<Record<string, number>>` の generic な入力）。将来 API 型が生成されたら、`countFilledFields(fields)` / `countEntriesByCategory(entries)` のヘルパを別 Issue で追加してブリッジする。**サーバ状態は TanStack Query 一本**の絶対ルールを守るため、hook 内で `useQuery` を呼ぶ設計は採らない（呼び出し側が useQuery のデータを整形して渡す）。
- **`entryCountByCategory` の参照安定性**: JS のオブジェクトを props/引数で渡すと `useMemo` の依存が毎レンダー変わりうる。**呼び出し側（ダッシュボード #17）で 1 度だけ集計する**運用を前提とする。hook 側で JSON.stringify 等の workaround は入れない（不要なコスト・不透明な挙動を避ける）。
- **`SECTIONS` の label / description の文言**: docs に断片はあるが定訳が固定されていない。**本 Issue で決めた文言はそのまま dashboard / section-edit に載る**ため、Issue #17 / #19 の実装時に一貫性チェックが必要。**サンプル文言案は PR レビュー時に確定**する。
- **`sensitive` フラグの導入**: Issue 本文には無い項目だが、#19 の DoD「money セクションに注意文がある」を無理なく満たすための布石として `SECTION_DEFINITION.sensitive?: boolean` を **money / digital のみに** 付ける。**スコープ拡張と見なされるなら削除可**。判断を仰ぐ。
- **`useSectionProgress` を「フック」で提供する必然性**: 実質は純関数 + `useMemo` にすぎない。**Issue が hook 指定なのでその形にする**が、実装は `computeSectionProgress` 純関数と hook ラッパの 2 段で提供（テストと再利用性を確保）。

## 参照

- `CLAUDE.md`（絶対ルール 1: features 単位 / 2: TanStack Query が真実 / 8: 死後開示は API 依存）
- `docs/frontend_design.md`（画面とパス／ディレクトリ構成）
- `docs/screen_spec.md` §共通仕様、§1 ダッシュボード、§2 セクション編集
- 既存参照: `src/features/notebook/components/SectionProgress.tsx`, `src/features/notebook/components/SectionProgress.test.tsx`, `src/features/auth/hooks/useAuth.test.tsx`（renderHook のテスト規約）
- 関連 Issue plan: `docs/issues/15/plan.md`（同フォーマット）
- 後続 Issue: #17（ダッシュボード）, #18（ノート一覧）, #19（セクション編集骨組み）
