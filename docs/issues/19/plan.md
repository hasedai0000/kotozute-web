# Issue #19 — W2-07 [F-04] セクション編集ページ骨組み（パンくず・注意書き・進捗）

- URL: https://github.com/hasedai0000/kotozute-web/issues/19
- ラベル: frontend, week-2
- マイルストーン: MVP-Week2

## Issue 概要
`/notebook/[section]` を 8 領域（`basic` / `medical` / `money` / `digital` / `funeral` / `pet` / `other`）で 1 実装するための**骨組み**を作る。表示要素は「パンくず（マイノート ＞ セクション名）」「セクション名 + 進捗」「セクション定数からの説明文」「money / digital のみ機微情報の注意（暗証番号・パスワード禁止）」「前後セクションへの導線」の 5 点。**入力フォーム本体（単一項目・リスト項目）は本 Issue では扱わない**（#20 以降）。

## 調査結果

### 関連ドキュメント
- `CLAUDE.md` 絶対ルール — 「1. features 単位で割る／`src/app/` はルーティング専任」「2. サーバ状態は TanStack Query が唯一の真実」「5. デザイントークン」「7. 複数登録項目は `EntryCard` で統一（本 Issue のスコープ外だが将来の受け皿）」。骨組みは feature 側に部品を置く。
- `docs/frontend_design.md` §「画面とパス」— `/notebook/[section]` の section は 7 種で 1 実装。`section = basic / medical / money / digital / funeral / pet / other`。**認証必須（Route Group `(app)` 配下・`AppAuthGuard` 済）**。
- `docs/screen_spec.md` §2「セクション編集」レイアウト — 上から: **① パンくず（マイノート ＞ セクション名）、② セクション名 + 進捗、③ 説明文、④ 機微情報の注意（money / digital のみ）、⑤ 単一項目、⑥ リスト項目、⑦ 前後セクションへの導線**。本 Issue は ①②③④⑦ の骨組みまで（⑤⑥は #20+）。
- `docs/screen_spec.md` §2「機微情報の注意」— money / digital のみに「暗証番号・パスワードは書かないでください」。**該当以外は出さない**（誤警告防止）。
- `docs/screen_spec.md` §「共通仕様 → ロールによる出し分け」— family ロールは編集 UI を出さない、`posthumous` は API が返さない前提。**本 Issue は骨組みのため入力は無いが**、パンくず・見出し・注意文は owner / family 両方に見える。
- `docs/screen_spec.md` §「共通仕様 → 状態の出し分け」— **ローディングはスケルトン**（スピナー禁止）、エラーは内容 + 再試行。骨組みの静的要素は即描画できるが、**進捗値の取得中は進捗部分のみスケルトン**にする。
- `docs/requirements.md` — `docs/frontend_design.md` と同旨（ルーティング・状態管理の分担）。

### 関連コード
- `src/app/(app)/notebook/[section]/page.tsx:1-15` — **現状スタブ**（`<h1>セクション：{section}</h1>` のみ）。本 Issue で骨組みに差し替える。Next 15 の `params: Promise<{ section: string }>` パターンを採用済み。
- `src/app/(app)/notebook/page.tsx` — #18 で完成済み。ハブから `/notebook/[section]` に遷移する（`SectionCard` の `href`）。**本 Issue の遷移元。触らない**。
- `src/app/(app)/layout.tsx:1-21` — `AppAuthGuard` + `Header` + `<Container>`。**セクションページ側で `<Container>` をラップし直さない**。
- `src/middleware.ts:38-52` — `matcher` に `/notebook/:path*` が含まれ、未認証は `/login?redirect=...` に飛ぶ。**追加変更不要**。
- `src/components/layout/Header.tsx:42-45` — `isActive(pathname, '/notebook')` が `/notebook/[section]` でも真になる。**ヘッダーの「ノート」がアクティブ表示になる。追加変更不要**。
- `src/features/notebook/constants/sections.ts:1-83` — `SECTION_SLUGS` / `SECTION_ORDER` / `SECTIONS`（`slug` / `label` / `description` / `sensitive?` / `fields` / `entryCategories`）。**本 Issue の主要な入力**：`SECTIONS[slug].label` を見出し・パンくずに、`SECTIONS[slug].description` を説明文に、`SECTIONS[slug].sensitive === true` を機微情報の注意の出し分けに使う。**money と digital のみ `sensitive: true`**（`sections.test.ts:34-37` でロック済み）。
- `src/features/notebook/hooks/useSectionProgress.ts:1-51` — `computeSectionProgress({ section, filledFields, entryCountByCategory })` → `{ filled, total, percent }`。純関数フックとして再利用可能。**進捗の唯一の算出口**（`useState` に写し取らない）。
- `src/features/notebook/api/useNoteSummary.ts:1-56` — `queryKey: queryKeys.notebook.summary` で全セクション分の `{ filledFields, entryCountByCategory }` を返す（404 は空返し）。**`/notebook`（#18）と同じキャッシュを共有**するため、ハブとセクションページで進捗値が構造的に一致する。
- `src/features/notebook/components/SectionProgress.tsx:1-45` — `filled`, `total`, `label`, `className` を受けて進捗バー + `filled/total` を描画。**本 Issue でそのまま再利用**（見出し右横または直下に配置）。
- `src/features/notebook/components/SectionCard.tsx:29-45` — `<Link href={`/notebook/${slug}`}>` で本 Issue のページに入る。**遷移元。触らない**。
- `src/features/notebook/components/SectionGrid.tsx:1-66` — #18 で `features/notebook/components/` に配置済み。**関連参照のみ、触らない**。
- `src/components/ui/skeleton.tsx` — 進捗値の取得中に `filled/total` を隠すために利用（骨組みの静的部分は即描画）。
- `src/components/layout/Container.tsx` / `src/components/layout/EmptyState.tsx` — 参考、直接は使わない見込み。
- `e2e/auth-login.spec.ts:1-100` / `e2e/auth-logout.spec.ts:1-89` — Playwright スタブのパターン（`page.route` で API を stub、`middleware` 突破に `laravel_session` の cookie を注入）。**本 Issue の E2E もこの流儀に倣う**。
- `src/components/ui/` — shadcn/ui の `breadcrumb` primitive は**未導入**（現状 21 個の primitive に含まれず）。**新たに shadcn を足すか、素の `<nav>` で組むかを選ぶ**（後述の「意思決定」）。

### 依存関係
- 先に必要（**完了済み**）:
  - **#16 W2-04** — `SECTIONS` / `SECTION_ORDER` / `useSectionProgress`。骨組みが直接使う。
  - **#17 W2-05** — `SectionProgress` / `useNoteSummary`。進捗表示とキャッシュ共有の基盤。
  - **#18 W2-06** — `/notebook` ハブ完成。**本 Issue の遷移元**が既に稼働。
- 先に必要（**未完・スコープ内で回避**）:
  - **notebook API（`GET /note-summary` 相当）** — 未実装。`useNoteSummary` が 404 を空扱いに落とすため、骨組みは進捗 0/0 で問題なく描画できる。
- 関連（後続）:
  - **#20 W2-08** — 単一項目フォーム + 自動保存（debounce 800ms）。本 Issue の骨組みに**単一項目セクション**を差し込む続き。
  - **リスト項目（`EntryCard` + ダイアログ）** — money / digital / pet 等。別 Issue で追加予定。
  - **家族ロールでの読み取り専用化** — 別 Issue で `useAuth` から role を判定して編集 UI を出し分ける（本 Issue は編集 UI 自体が無いため影響を受けない）。

## やること

### 前提の意思決定（**要ユーザー確認**）

以下 3 点は骨組み設計の分岐点。実装前に合意したい。

- **D1. パンくずの実装形式**（推奨: 案 B）
  - 案 A：shadcn/ui の `breadcrumb` primitive を新規追加（`npx shadcn@latest add breadcrumb`）。プロジェクトに新規 primitive を持ち込む。
  - **案 B（推奨）**：素の `<nav aria-label="パンくず">` + `<ol>` + `<Link>` で `src/features/notebook/components/SectionBreadcrumb.tsx` に自作する。骨組み用途に十分・依存を増やさない・CLAUDE.md ルール 1（features 単位）とも整合。
- **D2. 進捗表示の位置**（推奨: 案 A）
  - **案 A（推奨）**：見出し直下に `SectionProgress`（`label` は渡さず `{filled}/{total}` + バーだけ）。ダッシュボード／`/notebook` の各カードと視覚整合。
  - 案 B：見出しの右端に `filled/total` だけ小さく出す（バーは無し）。省スペースだが情報密度が下がる。
- **D3. 前後導線のふるまい**（推奨: 案 A）
  - **案 A（推奨）**：`SECTION_ORDER` の前後があるときのみ「← 前へ / 次へ →」を表示（端では該当ボタンを描画しない）。ラップしない（`other → basic` に戻さない）。
  - 案 B：常に 2 つ表示し、端ではリンクを無効化（グレーアウト）。冗長。
  - 案 C：ラップする（`other` の次は `basic`）。誤操作を招きやすい。

意思決定後は下記「作るもの」に反映して着手する。以降の記述は **D1=B / D2=A / D3=A** を仮定して書く。

### 作るもの

- [ ] **`src/features/notebook/components/SectionBreadcrumb.tsx`（新規）**
  - Props: `sectionLabel: string`
  - 出力: `<nav aria-label="パンくず"><ol>` に「マイノート（`<Link href="/notebook">`）」 → 現在地「セクション名（`<span aria-current="page">`）」の 2 段。区切りは `/` またはアイコン（`ChevronRight` from lucide-react、他コンポーネントと整合）。
  - a11y: `aria-current="page"` を末尾に付ける（キーボード操作は `<Link>` 標準）。
  - 見た目: 小さめのミュートテキスト（`text-sm text-muted-foreground`）+ ホバーで下線。
- [ ] **`src/features/notebook/components/SectionSensitiveNotice.tsx`（新規）**
  - Props なし（コンテンツ固定）。
  - 出力: 「暗証番号・パスワード・マイナンバーは入力しないでください（在りかのみを残します）」を、注意カラー（`bg-amber-50 text-amber-900` 系の**トークン化された色**、または既存の `TimingBadge` と同系のアンバー）で表示。左に鍵アイコン（`ShieldAlert` / `Lock` などから選定）。
  - `role="note"` を付け、a11y に配慮。**CLAUDE.md ルール 5**：直値の HEX を書かず、Tailwind のトークン（既存の `amber-*` / `warning-*` があれば優先）を使う。既存トークンで表現しきれない場合は `docs/frontend_design.md` の意味色に沿って追加を検討（本 Issue のスコープ内で新規トークンを増やすかは判断）。
- [ ] **`src/features/notebook/components/SectionNav.tsx`（新規、D3=A 前提）**
  - Props: `currentSlug: SectionSlug`
  - `SECTION_ORDER` を参照して前後の slug を計算。**端では該当ボタンを描画しない**（表示位置は右揃え／左揃えで確保、両端は空セル）。
  - 出力: `<nav aria-label="セクション間の移動">` に「← 前へ：〈前セクション名〉」「次へ：〈次セクション名〉 →」の 2 つの `<Link>`。ボタンではなくリンク（画面遷移のため）。
- [ ] **`src/features/notebook/components/SectionProgressLive.tsx`（新規、Client Component）**
  - 目的: Server Component の `page.tsx` から進捗表示だけを切り出し、TanStack Query を Client 側に閉じ込める。
  - Props: `slug: SectionSlug`
  - 実装: `useNoteSummary()` → `data?.perSection[slug]` を取り、`useSectionProgress({ section: slug, filledFields, entryCountByCategory })` で `{ filled, total }` を得て `SectionProgress` を描画。**取得中は `Skeleton`**、**エラー時は `SectionProgress` に 0/0 を描画（本 Issue ではエラー UI をここに出さない）** — 骨組みなので致命的でなく、ハブ側（`/notebook`）で `EmptyState` が出ている前提。要判断（後述リスク）。
- [ ] **`src/app/(app)/notebook/[section]/page.tsx`（既存スタブを差し替え）**
  - Server Component のまま（`async` + `params: Promise<{ section: string }>`）。
  - `SECTION_SLUGS` に含まれないパラメータは `notFound()`（from `next/navigation`）で 404 に落とす。
  - 骨組み（上から）:
    1. `<SectionBreadcrumb sectionLabel={def.label} />`
    2. 見出し `<h1 className="text-2xl font-semibold">{def.label}</h1>`
    3. `<SectionProgressLive slug={slug} />`（Client 子コンポーネント）
    4. 説明文 `<p className="text-sm text-muted-foreground">{def.description}</p>`
    5. `def.sensitive === true` のときのみ `<SectionSensitiveNotice />`
    6. **（本 Issue の入力領域プレースホルダは置かない）** — 空白のまま。#20 で `SectionForm` が入る場所。
    7. `<SectionNav currentSlug={slug} />`
  - `<Container>` でラップしない（`(app)/layout.tsx` が包む）。
  - `useState` にサーバ状態を写し取らない（進捗は `SectionProgressLive` 内の Query キャッシュのみ）。
- [ ] **`src/features/notebook/components/SectionBreadcrumb.test.tsx`（新規、Vitest）**
  - 「マイノート」リンクが `/notebook` を指す、末尾に渡した `sectionLabel` が `aria-current="page"` で描画される、の 2 件。
- [ ] **`src/features/notebook/components/SectionSensitiveNotice.test.tsx`（新規、Vitest）**
  - 固定文言（「暗証番号・パスワード・マイナンバーは入力しないでください」の要旨）が `role="note"` で描画される 1 件。
- [ ] **`src/features/notebook/components/SectionNav.test.tsx`（新規、Vitest）**
  - `basic`（先頭）では「前へ」が描画されず「次へ：医療のこと」が出る。
  - `other`（末尾）では「次へ」が描画されず「前へ：ペットのこと」が出る。
  - 中間（例 `money`）では両方描画され、それぞれ `/notebook/medical` / `/notebook/digital` を指す。
- [ ] **`src/app/(app)/notebook/[section]/page.test.tsx`（新規、Vitest）**
  - `QueryClientProvider` + `AuthContext` の wrapper で描画。`fetch` を stub して以下:
    1. `basic` を渡すと見出し「基本のこと」・説明文・パンくず末尾が「基本のこと」で描画される（機微注意は出ない）。
    2. `money` を渡すと機微情報の注意（`role="note"`）が描画される。**DoD の 1 件**。
    3. `digital` を渡すと機微情報の注意が描画される。
    4. `other` を渡すと機微情報の注意が描画されない。
  - 無効な slug（例 `foo`）は `notFound()` 経路。Server Component の直接 render はテストしづらいので、**この確認はスキップ**するか、`SECTION_SLUGS` に基づく `generateStaticParams` を追加して型・網羅性で担保する（後述の任意タスク）。
- [ ] **`e2e/notebook-section.spec.ts`（新規、Playwright）**
  - `laravel_session` cookie を仕込み、`GET /user` を 200 stub、`GET /note-summary` を 200 stub（空サマリ）で `/notebook/money` にアクセス。
  - 期待: 見出し「お金のこと」が見える、`role="note"` の要素に「暗証番号」の文字列が含まれる、パンくず内の「マイノート」リンクが押せる。**DoD の 1 件**。

### 触らないもの

- **`/notebook`（ハブ）**：#18 完成済み。
- **ナビ／ヘッダー**：`/notebook/[section]` でも「ノート」がアクティブ表示になる（`Header.tsx:44` の `startsWith(`${href}/`)`）。
- **`useNoteSummary` / `useSectionProgress` / `SectionProgress` / `SECTIONS`**：既に完成、そのまま利用。
- **入力フォーム（単一項目・リスト項目・自動保存・カテゴリダイアログ）**：#20 以降。

### 任意（推奨、時間があれば）

- [ ] `src/app/(app)/notebook/[section]/page.tsx` に `export async function generateStaticParams()` を追加して `SECTION_SLUGS.map(s => ({ section: s }))` を返す。**7 slug のみが静的に生成**され、`notFound()` に依存せずルーターが弾ける。将来スラッグ追加時に静的解析で気付ける。
- [ ] `src/features/notebook/components/SectionProgressLive.tsx` のエラー時に、小さな「進捗を取得できませんでした」テキスト + 再試行リンクを添える（`/notebook` ハブと同じ挙動を薄く再現）。

## 完了条件（DoD）
Issue の DoD を転記:
- [ ] 8 セクション全てで正しい説明文と注意書きが出る
- [ ] Playwright で money セクションに注意文がある

上記の実現手段は「作るもの」に対応:
- 説明文網羅 → `SECTIONS[slug].description` を必ず描画（Server Component の直接参照）。7 セクション（`basic` / `medical` / `money` / `digital` / `funeral` / `pet` / `other`）は `SECTION_SLUGS` の網羅性で担保（`sections.test.ts:11-22` で順序をロック済み）。**Issue 本文「8 セクション」は要文面確認**（→「リスク / 確認事項」参照）。
- 注意書きの正確性 → `def.sensitive === true` の分岐のみで出す。`sections.test.ts:34-37` により「sensitive は money / digital に限定」がロック済み。
- money の注意文 E2E → `e2e/notebook-section.spec.ts` で `/notebook/money` を叩き `role="note"` を検出。

## リスク / 確認事項

- **Issue 本文の「8 セクション」表現**：実際の notebook セクションは 7 種（`SECTION_SLUGS.length === 7`）。`/notebook` ハブでは「7 セクション + 大切な人へ」で 8 枚のカードが並ぶが、**`/notebook/[section]` の骨組みは 7 種**。**要ユーザー確認**：「8 セクション全てで説明文と注意書きが出る」の意図が「7 セクション + 大切な人へ（`/messages`）」までのカバーを含むなら、`/messages` の骨組み（見出し・説明文・パンくず相当）も本 Issue に含めるか、別 Issue に切り出すかを決めたい。**推奨は別 Issue**（`/messages` は #25/#26 のスコープ、本 Issue はセクション編集ページの骨組みに集中）。
- **進捗値の取得失敗ハンドリング**：`SectionProgressLive` の実装で、`useNoteSummary` がエラーになった場合に何を出すか。**推奨**：進捗表示のみ 0/0 に fallback（ハブ側のエラー UI に任せる）。骨組みページで大きなエラー UI を出すと、パンくず・見出し・機微注意まで見えなくなり価値が下がる。
- **`SECTION_SLUGS` に無い slug の扱い**：`notFound()` に落とす方針で問題ないか（例 `/notebook/abc` → 404）。**推奨**：`notFound()` + `generateStaticParams` の両方で守る。
- **パンくずの primitive 選定（D1）**：shadcn/ui の `breadcrumb` を導入するか、素の `<nav>` で組むか。**推奨**：素で組む（案 B）。プロジェクトの primitive 追加は本 Issue の主眼ではない。
- **機微注意のカラー**：Tailwind のトークンに `amber-*` は既定で存在するが、**プロジェクトの意味色（意味論的トークン）に `warning` 等が既に定義済みか未確認**。CLAUDE.md ルール 5「直値のカラーコードを書かない」に沿うため、**既存の意味色トークンがあればそれを優先**する。**要確認**：`src/styles/globals.css` と `tailwind.config`（もし存在すれば）で意味色トークンを走査してから実装する。
- **`SectionProgressLive` の Server / Client 境界**：Server Component の `page.tsx` から Client Component 子（`SectionProgressLive`）を呼び出す構成にする（`useNoteSummary` は Client でしか使えないため）。Server Component 側では `params` を await → `SECTIONS[slug]` を静的参照 → 静的 JSX、という流れ。**この分離により Query キャッシュはハブと共有**され、進捗の齟齬が構造的に生じない。
- **家族ロールでの表示（本 Issue のスコープ外だが要記録）**：骨組みは編集 UI を含まないので family でもそのまま表示して問題ない。ただし将来 `SectionForm` を差し込む Issue（#20 以降）では、role 判定を組み込む必要がある。
- **Playwright の環境変数依存**：`e2e/auth-login.spec.ts:1-8` と同じく `NEXT_PUBLIC_API_URL` の有無で送信先が変わる。`page.route` の URL パターンは regex（例 `/\/(api\/)?note-summary(\?|$)/`）にして両環境を吸収する。
- **`/notebook/[section]` は既に `matcher` に含まれる**（`src/middleware.ts:41` の `/notebook/:path*`）ため、middleware の変更は不要。E2E では `laravel_session` cookie を仕込む既存パターンで問題ない。

## 参照
- CLAUDE.md（絶対ルール 1・2・5・7）
- docs/frontend_design.md（§画面とパス、§ディレクトリ構成、§状態管理の役割分担、§UI・デザイン実装）
- docs/screen_spec.md §2 セクション編集（レイアウト・機微情報の注意）、§共通仕様（状態の出し分け・ロール）
- 前提 Issue #16（SECTIONS / useSectionProgress）、#17（SectionProgress / useNoteSummary）、#18（`/notebook` ハブ）
- 後続 Issue #20（単一項目フォーム + 自動保存）
