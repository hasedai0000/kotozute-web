# Issue #17 — W2-05 [F-03] ダッシュボード（挨拶・全体進捗・セクションカード・家族状況）

- URL: https://github.com/hasedai0000/kotozute-web/issues/17
- ラベル: frontend, week-2
- マイルストーン: MVP-Week2

## Issue 概要
`/dashboard` を、認証必須エリアの入口として実装する。上から (1) 挨拶＋全体進捗、(2) 「次にやること」1 件（owner のみ）、(3) 7 セクションカード＋「大切な人へ」の 8 枚（モバイル 2 列 / デスクトップ 3〜4 列）、(4) 家族の共有状況（アバター＋人数、未招待時は「家族を招待しませんか」CTA）を並べる。ローディングはスケルトン、失敗時は `EmptyState` ＋再試行で扱う。**Week 2 時点では notebook / family の API が未実装**のため、TanStack Query の**フックの器**を feature 側に用意して、返り値が空でもレイアウトが崩れない状態まで作る。API 完成後（Week 3/4）に差し替える。

## 調査結果

### 関連ドキュメント
- `CLAUDE.md` 絶対ルール — 「1. features 単位で割る」「2. サーバ状態は TanStack Query が唯一の真実」「4. トークンをフロントで保持しない」「5. デザイントークンを使う」「6. `TimingBadge` で色分け（今回のダッシュボードでは家族の共有状況以外は既定色）」「8. 死後開示は API が返さない限り存在しない前提」。**本 Issue は API がまだ無い段階でも「Query の器」だけは作り、コンポーネント側は fetch を持たない**。
- `docs/frontend_design.md` §「画面とパス」— `/dashboard` は `(app)` 配下・認証必須。既存 `src/app/(app)/layout.tsx:1-21` で `AppAuthGuard` と `Header` はすでに敷いてある。
- `docs/frontend_design.md` §「状態管理の役割分担」— サーバー状態は `features/*/api` の TanStack Query に集約。**進捗のような派生値を `useState` に写し取らない**（`useMemo` は可）。
- `docs/screen_spec.md` §1 ダッシュボード — レイアウト 5 項目（ヘッダー／挨拶＋全体進捗／次にやること／セクションカード一覧／家族の共有状況）を上から順に配置。**進捗＝`記入済み項目数 ÷ 全項目数`**。カードは「7 領域＋大切な人へ」の 8 枚。**家族ロールでは「次にやること」を出さない**。**未招待（メンバー 0 人）は『家族を招待しませんか』を目立たせる**（本サービスの価値が未達のため）。
- `docs/screen_spec.md` §「共通仕様 → 状態の出し分け」— ローディング＝スケルトン（スピナー単体は禁止）、空＝説明＋一次アクション、エラー＝内容＋再試行、権限起因なら「閲覧権限がありません」。**本ダッシュボードもこの規約に従う**。
- `docs/screen_spec.md` §「共通コンポーネント」— `SectionProgress` / `EmptyState` は既存。`SectionCardSkeleton` は本 Issue で新設（Issue 本文で明示）。

### 関連コード
- `src/app/(app)/dashboard/page.tsx:1-7` — **現状スタブ**（`<h1>ダッシュボード</h1>` のみ）。本 Issue で描画本体を実装する。
- `src/app/(app)/layout.tsx:1-21` — `AppAuthGuard` + `Header` + `Container` はすでに整備済み。**ページ側では `<Container>` のラップは不要**（layout で包まれる）。
- `src/components/layout/Header.tsx:36-40` — ナビは `/dashboard` / `/notebook` / `/family` の 3 本。ダッシュボードはリンクの起点として整合済み。
- `src/components/layout/EmptyState.tsx:1-41` — `title` / `description` / `action` を受ける汎用 UI。**エラー時と未招待時の CTA の両方でこれを再利用**。
- `src/components/ui/{skeleton,avatar,progress,card,button}.tsx` — 部品は揃っている。ダッシュボードのカード枠は `card.tsx`、進捗バーは `progress.tsx`、アバターは `avatar.tsx` を利用。
- `src/features/notebook/constants/sections.ts:1-83`（#16 で完了） — `SECTION_SLUGS`（7 個）／`SECTIONS` レコード／`SECTION_ORDER` を提供。**セクションカード 8 枚のうち 7 枚は `SECTION_ORDER.map(...)` で描く**。8 枚目「大切な人へ」は `messages` feature 由来なので**本 Issue のダッシュボード内で「非セクション枠」として個別に描く**（`SECTIONS` には追加しない）。
- `src/features/notebook/hooks/useSectionProgress.ts:1-51`（#16 で完了） — `useSectionProgress({ section, filledFields, entryCountByCategory })` → `{ filled, total, percent }`。純関数 `computeSectionProgress` も同ファイル。**本 Issue の全体進捗＝全セクションの合計** も、この関数を各セクションで呼んで sum で足すだけで出せる。
- `src/features/notebook/components/SectionProgress.tsx:1-44` — `{filled, total, label?}` を受ける進捗バー UI。**セクションカード内と、全体進捗（`label="全体"`）の両方で再利用**。
- `src/features/notebook/api/` — **空**。今回、`useNoteSummary`（＝全セクションの `filledFields` と `entryCountByCategory` の集約）を**ここに新設**する（実装は fetch を試みつつ、API 未整備の 404 は空扱いに落とす）。
- `src/features/family/api/` — **空**。`useFamilyMembers` を**ここに新設**（同上、404 は空扱い）。**モックデータをフロントにハードコーディングしない**（CLAUDE.md ルール違反）。
- `src/features/auth/hooks/useAuth.ts:1-13` + `src/providers/AuthProvider.tsx:1-31` + `src/features/auth/api/useMe.ts:1-32` — ログインユーザーは `useAuth().user`（`{id, name, email}`）。**ロール（owner / family）情報は未定義**。本 Issue の DoD「家族ロール時に『次にやること』が出ない」は、**ロールを判定する導線が要る**が現状の `AuthUser` には無い（後述「リスク / 確認事項」）。
- `src/lib/query/queryKeys.ts:1-7` — 現状 `auth.me` のみ。**`queryKeys.notebook.summary`（またはそれ相当）と `queryKeys.family.members` を追加する**。将来 `familyId` を含める設計方針（frontend_design.md「queryKeys は lib/query/ に集約」）に合わせ、**関数形（`(familyId?: string) => [...]`）で追加**する。ただし現状の API では `familyId` はセッションから解決される想定なので、**引数なしでも呼べる形**（デフォルト `["notebook", "summary"] as const`）にしておく。
- `src/lib/api/` — `apiFetch` と `ApiError` は `useMe.ts` の実装から実在確認済み。**新設フックはこの `apiFetch` を通す**（`credentials: 'include'` は共通ラッパー側でセット済み）。
- `src/features/messages/` — 中身は空。「大切な人へ」カードは**ダッシュボードから `/messages` へリンクするだけ**。進捗の分母は「手紙が 1 通以上あるか」など docs で明確化されていないので、**Week 2 時点では『件数のみ表示』にとどめる**（進捗バーは持たない）。

### 依存関係
- 先に必要（**完了済み**）:
  - **#16 W2-04** — `SECTIONS` と `useSectionProgress`。本 Issue の中核。
  - **#15 W2-03** — `AuthProvider` によるユーザー配布。挨拶文と `AppAuthGuard` に必要。
- 先に必要（**未完・スコープ内で回避**）:
  - **notebook API（`GET /note-summary` 相当）** — 未実装（`kotozute-api` 側）。本 Issue は**フックの器のみ用意し、404 / 未定義エンドポイントは空扱い**にして UI レイアウトを完成させる。実データ差し替えは Week 3（#20 以降）で行う。
  - **family API（`GET /family/members` 相当）** — 未実装。同上、404 は空（＝未招待扱い）に落とす。
  - **ロール（owner / family）判定** — `AuthUser` に `role` が無い。**Week 2 の暫定**として、**ログインユーザー自身は常に owner とみなす**（Week 4 の #34/#35 で招待受諾フローが入ると family ロールが発生する）。docs の「家族ロール時に『次にやること』を出さない」は、実装上は「role が 'family' の場合のみ隠す」という**分岐だけ入れておき**、判定入力は `useAuth()` から取れる形にする（`user.role` が undefined なら owner 扱い）。
- 関連（後続）:
  - **#18 W2-06 ノート一覧** — 同じ `SECTIONS` / `useSectionProgress` を使う。**ダッシュボードで作ったセクションカード（`SectionCard`）は #18 でも再利用できる**ため、`features/notebook/components/SectionCard.tsx` として feature に置く（`src/app/(app)/dashboard/_components/` に閉じ込めない）。
  - **#31 W4-01 家族・共有管理 一覧** — `useFamilyMembers` を本 Issue で新設しておくと、#31 で fetch 実装を差し替えるだけで済む。**本 Issue で作るのはメンバー配列と『招待済み人数』を返すフックの器のみ**、詳細画面ロジックは #31 のスコープ。

## やること

- [ ] **`src/lib/query/queryKeys.ts`（既存を拡張）**
  - `queryKeys.notebook.summary` と `queryKeys.family.members` を追加（**関数型ではなく静的タプル**：現時点で `familyId` はセッションから解決される想定なため）。
  - 例: `notebook: { summary: ["notebook", "summary"] as const }`, `family: { members: ["family", "members"] as const }`。
- [ ] **`src/features/notebook/api/useNoteSummary.ts`（新規）**
  - 返り値：`{ perSection: Record<SectionSlug, { filledFields: number; entryCountByCategory: Partial<Record<string, number>> }>; messagesCount: number }`。
  - `apiFetch<...>("/note-summary")` を試み、`ApiError` かつ `status === 404` の場合は**全セクション 0 件・messagesCount 0 を返す**（Week 2 で API 未整備を明示する `TODO(#20+)` コメントを付ける）。それ以外のエラーはそのまま throw（`useQuery` がエラー状態にする）。
  - `retry: false`, `staleTime: 30_000`（`useMe` と同じ規約）。
  - **モックデータをフロントに埋めない**（CLAUDE.md ルール違反）。fetch が失敗したら空を返すだけ。
- [ ] **`src/features/notebook/api/useNoteSummary.test.ts`（新規、任意）**
  - `apiFetch` をモックし、(a) 成功、(b) 404 → 空返し、(c) 500 → error 状態 の 3 パターン。
- [ ] **`src/features/family/api/useFamilyMembers.ts`（新規）**
  - 返り値：`FamilyMember[]`（`{ id, name, email, role, joinedAt }` の最小形。**将来 OpenAPI 生成型に差し替える TODO を明記**）。
  - `apiFetch<FamilyMember[]>("/family/members")` を試み、404 は `[]` に落とす。
  - `retry: false`, `staleTime: 30_000`。
- [ ] **`src/features/family/api/useFamilyMembers.test.ts`（新規、任意）**
  - 上と同じく 3 パターン。
- [ ] **`src/features/notebook/components/SectionCard.tsx`（新規）**
  - Props: `{ slug: SectionSlug; filledFields: number; entryCountByCategory: Partial<Record<string, number>> }`。
  - 内部で `useSectionProgress({ section: slug, ... })` を呼び、`Card` の中に「セクション名」「説明（1 行、`line-clamp-2`）」「`SectionProgress`（`filled`/`total`）」を並べる。カード全体を `Link` で `/notebook/[slug]` に飛ばす（キーボードフォーカス・aria-label 対応）。
  - デザイントークンで組み立て（直値のカラーは書かない）。**a11y**：`role="link"`（or `Link` の a）、フォーカスリング、十分な hit area。
- [ ] **`src/features/notebook/components/SectionCard.test.tsx`（新規、任意）**
  - 「タイトルと `filled/total` が描画される」「セクション slug がリンク先に反映される」の 2 件程度。
- [ ] **`src/features/notebook/components/SectionCardSkeleton.tsx`（新規）**
  - `Card` レイアウトを保ったまま、タイトル用・説明用・進捗バー用の `Skeleton` を積む（`role="status"` + `aria-label="読み込み中"`）。
- [ ] **`src/app/(app)/dashboard/_components/DashboardGreeting.tsx`（新規、page 専用）**
  - `useAuth()` から `user.name` を取り、「◯◯さん、こんにちは」を表示。
  - 続けて**全体進捗**（`SectionProgress` を `label="全体の記入状況"` で使い、`filled = Σ perSection.filled`, `total = Σ perSection.total`）。
  - `useNoteSummary` の `isPending` 中はスケルトンを見せる。
- [ ] **`src/app/(app)/dashboard/_components/NextActionCard.tsx`（新規、page 専用、owner のみ描画）**
  - `perSection` から**進捗率（filled/total）が最も低いセクション**を選び、「次はここを書きましょう」＋そのセクションへの導線を出す。**全セクションが 0/0 のとき（＝定数上 total===0）は「基本のこと」に固定**（docs の並び順先頭）。
  - **家族ロールでは呼び出し元で描画をスキップ**（このコンポーネント自体はロール判定を持たない＝関心事の分離）。
- [ ] **`src/app/(app)/dashboard/_components/FamilyStatusCard.tsx`（新規、page 専用）**
  - `useFamilyMembers` の返り値を見て：
    - **メンバー 0 人（未招待）** → `EmptyState` に「家族を招待しませんか」／「常時共有が始まって、はじめて『ことづて』の価値が届きます」／`action`＝`家族を招待` ボタン（`Link href="/family"`）を出す。**目立たせる（強めのアクセント色枠、上下余白多め）**。
  - **メンバーあり** → メンバーのアバターを最大 5 個並べ、超過は「+N」バッジ。`/family` へのリンク付き。
  - ローディングは `Skeleton`、エラーは `EmptyState`（title="家族情報を読み込めませんでした" + 再試行ボタン）。
- [ ] **`src/app/(app)/dashboard/page.tsx`（既存スタブを差し替え）**
  - Client Component にする（`"use client"`）。理由：`useAuth` / TanStack Query hooks を使うため。
  - 骨組み（上から）:
    1. `<DashboardGreeting />`
    2. **owner のみ** `<NextActionCard />`（`user.role !== "family"` で描画。現状 role 未定義なので暫定的に常に描画されるが、条件分岐だけは書く）
    3. `<section aria-label="セクション">`：`SECTION_ORDER.map(slug => <SectionCard ... />)` ＋ 8 枚目として「大切な人へ」カード（`Card` に手紙アイコン＋件数＋`/messages` リンク、進捗バーは持たない）。
       - **グリッド**：`grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4`（DoD「モバイル 2 列 / デスクトップ 3〜4 列」を満たす）。
       - `isPending` 中は `<SectionCardSkeleton />` を 8 枚。
       - エラー時は `EmptyState`（title="ノート情報を読み込めませんでした" + 再試行）。
    4. `<FamilyStatusCard />`
  - **YOU MUST**：`useNoteSummary` の返り値を `useState` に写し取らない（そのまま参照する）。
- [ ] **`src/app/(app)/dashboard/page.test.tsx`（新規、任意だが推奨）**
  - React Testing Library。TanStack Query の provider を wrap して、以下の 3 件程度:
    1. 未招待時に「家族を招待しませんか」CTA が見える（DoD）。
    2. 家族ロール（`user.role === "family"`）時に「次にやること」が描画されない（DoD）。
    3. ローディング中に `SectionCardSkeleton` が 8 枚描画される。
- [ ] **ナビ・ヘッダーの変更は不要**（`Header.tsx` は現状のまま）。
- [ ] **prefers-reduced-motion**：`Skeleton` のアニメーションは shadcn の既定で reduced-motion 対応。**追加のトランジションは入れない**（CLAUDE.md a11y ルール）。

## 完了条件（DoD）
Issue の DoD を転記:
- [ ] 未招待時に「家族を招待しませんか」CTA が目立つ
- [ ] 家族ロール時に「次にやること」が出ない
- [ ] モバイル 2 列 / デスクトップ 3〜4 列

上記の実現手段は「やること」に対応：
- CTA 目立たせ → `FamilyStatusCard` の未招待分岐で `EmptyState` にアクセント枠。
- 家族ロール分岐 → `page.tsx` で `user.role !== "family"` のときのみ `NextActionCard` を描画。
- レスポンシブ列数 → `grid-cols-2 md:grid-cols-3 xl:grid-cols-4`。

## リスク / 確認事項
- **ロール（owner / family）の判定**：現時点で `AuthUser` に `role` が無い。**暫定的に「role 未定義 = owner 扱い」で分岐だけ書く**方針で進めるが、後続 Issue（Week 4 の招待受諾）で `useMe` レスポンスに `role` を追加する必要がある。**この Issue のスコープでは `AuthUser` に `role?: "owner" | "family"` を optional で追加するだけに留め、判定実装（バック側）は別 Issue**。→ **要ユーザー確認**：この暫定でよいか、あるいは Week 2 段階では家族ロール分岐を「TODO コメント + 常に owner 扱い」にとどめるか。
- **notebook / family API 未実装**：本 Issue のフックは 404 を空扱いに落とす。**API 完成時に fetch レスポンスの実型に差し替える TODO を関数直上のコメントに明記**する。**モックデータやハードコーディングはしない**。
- **「大切な人へ」カードの進捗表現**：docs は「7 領域＋大切な人へ」の 8 枚とだけ書き、進捗の定義は無い。**Week 2 は件数のみ表示**（進捗バーなし）で進める提案。**要ユーザー確認**：もし「1 通以上あれば済み」を持たせたい場合は、`useSectionProgress` に混ぜず、`FamilyStatusCard` と同じ独立コンポーネントにする。
- **全体進捗バーの母数**：現状の `SECTIONS` は `fields` / `entryCategories` が一部空。**全体 total が 0 になるセクションが多く、初期表示で「0/0」ばかりになる**が、これは #16 の設計上の想定範囲（後続 Issue で fields/categories を埋める）。ダッシュボード側は「0/0 は 100% と誤解されない」ように `SectionProgress` の既存挙動（percent=0）に任せる。
- **owner の自動 owner 扱い**：ログイン直後は `families` を 1 件自動作成（本人＝owner）する仕様（screen_spec.md §5）。**その API の実装は kotozute-api 側で未完**。本 Issue はフロントの分岐だけ準備。
- **スコープ外の誘惑**：ダッシュボードから飛んだ先の `/notebook/[section]` は #19、`/messages` は #25/#26、`/family` は #31 で実装される。**本 Issue はリンクを張るのみ**（先取り実装しない）。

## 参照
- CLAUDE.md
- docs/frontend_design.md（§画面とパス、§状態管理の役割分担、§API 通信と型）
- docs/screen_spec.md §1 ダッシュボード、§共通仕様
- 前提 Issue #15（AuthProvider）、#16（SECTIONS / useSectionProgress）
