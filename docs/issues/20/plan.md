# Issue #20 — W2-08 [F-04] 単一項目フォーム + 自動保存（debounce 800ms・保存状態表示）

- URL: https://github.com/hasedai0000/kotozute-web/issues/20
- ラベル: frontend, week-2
- マイルストーン: MVP-Week2

## Issue 概要
`note_fields`（各セクションの単一項目）を **RHF + debounce 800ms + `useMutation`** の自動保存で書き溜められるようにする。ユーザーが素早くタイプしても送信は 1 回に収束し、失敗時は値を消さずに再試行できる。「保存中…／保存しました」の状態を UI に出し、ネットワーク失敗はトースト + 手動再試行で扱う。#19 で作った `/notebook/[section]` 骨組みに `SectionForm`（新規）を差し込む続き。

## 調査結果

### 関連ドキュメント
- `CLAUDE.md` 絶対ルール — 「1. features 単位で割る」「2. サーバ状態は TanStack Query が唯一の真実」「4. トークンをフロントで保持しない（`credentials: 'include'`）」「5. デザイントークンを使う」。**`useAutoSave` は `features/notebook/hooks/`、API は `features/notebook/api/`、UI は `features/notebook/components/` に置く**。
- `CLAUDE.md` セキュリティ — 「パスワード・暗証番号・マイナンバーは入力させない」。単一項目フォームでも type=password 系の入力欄は作らない。money/digital セクションは #19 で表示済みの `SectionSensitiveNotice` により警告済み。
- `docs/screen_spec.md` §2「セクション編集」→「単一項目」— **入力後 debounce 800ms で自動保存。保存状態を「保存中…／保存しました」で示す。失敗時はトースト + 再試行。値は画面に保持する（消さない）**。DoD の文言と一致。
- `docs/screen_spec.md` §共通仕様 →「状態の出し分け」— **保存中は楽観的更新で即時反映、失敗時ロールバック**。単一項目はローカル値のロールバックはせず、**サーバ側の保存状態だけを差し戻す**（画面上の値は消さない）。
- `docs/screen_spec.md` §共通仕様 →「オフライン／通信失敗」— 「保存できませんでした」トースト + 再試行。
- `docs/frontend_design.md` §状態管理 — **フォームは RHF + Zod、サーバ状態は TanStack Query が唯一の真実**（値を `useState` に写し取らない）。
- `docs/frontend_design.md` §API 通信と型 — `queryKeys` は `lib/query/` に集約。`useAutoSave` の onSuccess で `queryKeys.notebook.summary` を invalidate（進捗値が更新されるため）。

### 関連コード
- `src/app/(app)/notebook/[section]/page.tsx:1-46` — #19 完成の Server Component。`<SectionBreadcrumb />` / `<SectionProgressLive />` / `<SectionSensitiveNotice />` / `<SectionNav />` の間（現在は空白）に **`<SectionForm slug={section} />`（Client Component、新規）** を差し込む。**Server Component のまま維持**（`SectionForm` 側で `"use client"`）。
- `src/features/notebook/constants/sections.ts:1-83` — **現状 `fields: readonly string[]` で全セクション空**。単一項目を書ける状態にするには、**型を `readonly FieldDefinition[]` に拡張**し、少なくとも 1 セクション（推奨: `basic`）に実データを積む必要がある。`sections.test.ts:34-37` が「sensitive は money/digital に限定」をロックしているので、その振る舞いは崩さない。
- `src/features/notebook/hooks/useSectionProgress.ts:1-51` — `computeSectionProgress` は `def.fields.length` を分母に使う。**`fields` を増やせば分母が自動追従**する（既存の純関数フックはそのまま）。
- `src/features/notebook/api/useNoteSummary.ts:1-56` — `queryKey: queryKeys.notebook.summary`。**`useAutoSave` の成功時に invalidate する対象**（`filledFields` が変わるため）。404 は空扱いで落ちる。
- `src/features/notebook/components/SectionProgressLive.tsx` — 進捗表示は `useNoteSummary` のキャッシュ経由。保存成功で invalidate → 自動再描画。
- `src/lib/api/client.ts:22-73` — `apiFetch<T>(path, { json, method })`。`credentials: 'include'` を強制、`ApiError` に整形。**PATCH は現状使われていないが同じラッパーで通せる**。
- `src/lib/api/errors.ts` — `ApiError` に `status` があり、`isApiError()` で型ガード。認可系（401/419/403）とネットワーク系（`networkError`）の分岐に使う。
- `src/lib/query/queryKeys.ts:1-12` — `queryKeys.notebook.summary` のみ。**`queryKeys.notebook.fields(section)` を追加**する必要がある。
- `src/features/auth/api/useLogin.ts:1-30` — `useMutation` の実装例。`onSuccess` で `queryClient.invalidateQueries({ queryKey: ... })` するパターン。`useAutoSave` も同型。
- `src/features/auth/components/LoginForm.tsx:1-147` — RHF + Zod + shadcn `Form` の実装例。`useForm({ resolver: zodResolver(schema), defaultValues, mode: 'onSubmit' })`、`FormField` / `FormItem` / `FormLabel` / `FormControl` / `FormMessage` の階層。**単一項目フォームも同じ部品を使う**。
- `src/features/auth/components/LoginForm.tsx:8, 61` — `import { toast } from "sonner"` → `toast.error(...)`。**失敗時トーストのパターンをそのまま踏襲**。
- `src/app/layout.tsx:5, 41` — `<Toaster />` は既にルートに配置済み。**追加設定不要**。
- `src/components/ui/form.tsx` / `src/components/ui/input.tsx` / `src/components/ui/textarea.tsx` / `src/components/ui/label.tsx` — 使う shadcn primitive はすべて揃っている。**新規 primitive の追加不要**。
- `src/features/auth/api/useLogin.test.ts:1-80` — `fetchMock` を `vi.stubGlobal("fetch", ...)` で差し替え、`jsonResponse()` ヘルパで応答を作るテスト方式。**`useAutoSave` の単体テストも同じ流儀で `fetch` を stub**。
- `src/styles/globals.css:153` — `prefers-reduced-motion` に既に配慮あり。`SavingIndicator` のフェードは `motion-safe:` 修飾で足す。
- `e2e/notebook-section.spec.ts:1-84` — #19 で作成済み。**本 Issue で `basic` セクションの記入 → 保存表示 → 再訪で値が残る、の追加テストをこの流儀で書く**。
- `openapi/openapi.dummy.json:1-47` — 実 API に `note-fields` 系エンドポイントは未定義。**バックとの契約はまだ無い**（後述の意思決定 D3 参照）。
- `src/types/generated/api.ts` — 現状は Health のみ。`note-fields` の型はまだ生成できないので、`useNoteSummary` と同様に**ローカル型 + TODO コメント**で先行実装する。

### 依存関係
- 先に必要（**完了済み**）:
  - **#16 W2-04** — `SECTIONS` / `useSectionProgress`。**`fields` の型拡張は本 Issue で行う**（後方互換に注意、`sections.test.ts` の更新が必要）。
  - **#17 W2-05** — `useNoteSummary`。invalidate 対象。
  - **#19 W2-07** — `/notebook/[section]` 骨組み。**`SectionForm` を差し込む箱が完成**。
- 先に必要（**未完・スコープ内で回避**）:
  - **`GET /note-fields/:section` / `PATCH /note-fields/:section`（kotozute-api 側）** — 未実装。`useNoteSummary` と同様に **404 を空扱い**にし、フロントは stub で動く前提で先行実装する。実 API が来たら `src/types/generated/` に差し替え。
- 関連（後続）:
  - **リスト項目（`EntryCard` + カテゴリ別ダイアログ）** — money/digital/pet 等の複数登録項目。**別 Issue**（W2-09 相当？）。本 Issue のスコープ外。
  - **家族ロールでの読み取り専用化** — `useAuth` の role で `SectionForm` 自体を出さない／`disabled` 化。**別 Issue**。本 Issue は owner 前提で書き、role 分岐の TODO を残す。
  - **エクスポート / プレビュー**（#25 相当）— `note_fields` の値が入力可能になることが前提。本 Issue で下地が整う。

## やること

### 前提の意思決定（**要ユーザー確認**）

以下 6 点は実装の分岐点。実装前に合意したい。

- **D1. `SECTIONS[slug].fields` の型拡張**（推奨: 案 A）
  - **案 A（推奨）**: `readonly string[]` → `readonly FieldDefinition[]`（`{ key: string; label: string; kind: 'text' | 'textarea' | 'date'; maxLength?: number; placeholder?: string; note?: string }`）に拡張。`useSectionProgress` は `def.fields.length` のままで動く。`sections.test.ts` を更新。
  - 案 B: 型は据え置き、フィールド定義は別ファイル（`src/features/notebook/constants/fields.ts`）に切り出す。分散する分、初見の見通しは落ちる。
- **D2. 実データを入れるセクション**（推奨: 案 A）
  - **案 A（推奨）**: `basic` のみに 4 項目（氏名 / 生年月日 / 血液型 / 緊急連絡先の氏名・関係・電話番号を 1〜4 に絞る）。他は空のまま（#25+ で順次追加）。**`basic` は機微でなく、動作確認・E2E に最適**。
  - 案 B: 全 7 セクションに 1〜2 個ずつ即積む。作業ボリュームが増え、レビュー観点も広がる。
  - 案 C: フィールド定義はゼロのまま。`SectionForm` は「単一項目が無いセクションでは何も描画しない」分岐で先送り。E2E は `basic` に 1 個だけ暫定で入れる。
- **D3. API 契約（バック未実装）**（推奨: 案 A）
  - **案 A（推奨）**: `GET /note-fields/:section` → `{ fields: Record<string, string> }`、`PATCH /note-fields/:section` → `{ fields: Partial<Record<string, string>> }`（部分更新、200 or 204）。**セクション単位で 1 mutation**。`useNoteSummary` の invalidate も 1 セクション単位。
  - 案 B: `PATCH /note-fields`（全セクション統合）。フィールドキーが衝突しないよう `section.key` の複合キーが必要。過剰な柔軟性。
  - 案 C: `PUT /note-fields/:section/:key`（1 フィールド 1 リクエスト）。debounce の趣旨（**1 回に収束**）と噛み合わない。
  - **重要**: バック未実装なので、`useAutoSave` は 404 と 5xx を区別し、**404 は「まだ何も保存されていない」として無害に扱う**（`useNoteSummary` と同じポリシー）。ただし PATCH の 404 は「エンドポイント未実装」の可能性が高く、**トーストは出さない**（開発体験を悪化させない）。実 API 到着後にこの分岐は削除。
- **D4. `useAutoSave` の debounce 戦略**（推奨: 案 B）
  - 案 A: RHF `watch(cb)` サブスクリプション + フィールドごとに独立した `setTimeout`。フィールド 4 個で最悪 4 リクエストになる。
  - **案 B（推奨）**: RHF `watch(cb)` + **フォーム全体で 1 本の `setTimeout(800ms)`**。差分を計算して PATCH 1 回。DoD「素早い入力で送信回数が 1 回に収束」と直結。
  - 案 C: `useDebouncedCallback` を汎用ユーティリティとして `src/lib/hooks/` に切り出す。**本 Issue のスコープを広げる**ので保留。
- **D5. 保存状態の見せ方（`SavingIndicator`）**（推奨: 案 A + 失敗時トースト）
  - **案 A（推奨）**: `<h1>` の右隣に「保存中…」→「保存しました」（3 秒後にフェードアウト、`motion-reduce:` 対応）。成功はトーストにしない（雑音）。
  - 案 B: フォーム下部に固定表示のバッジ。常時見えるが視線が下に行く。
  - **失敗時（共通）**: `toast.error("保存できませんでした")` + `SavingIndicator` を「保存できませんでした・再試行」表示に切り替え、**クリックで再送**（RHF の値を再 mutation）。
- **D6. 楽観的更新の範囲**（推奨: 案 B）
  - 案 A: PATCH 発火と同時に `queryKeys.notebook.fields(section)` のキャッシュを楽観的に更新、失敗時ロールバック。`useNoteSummary` の `filledFields` も楽観更新。
  - **案 B（推奨）**: **楽観更新はしない**。RHF のフォーム値がそのままユーザー視点の「最新」であり、サーバ状態のキャッシュはあくまで**次回訪問時の初期値**。保存成功後に `invalidateQueries` で `useNoteSummary` を再取得（進捗値の更新はここで見える）。**単一項目では十分**（リスト項目は別 Issue で楽観更新を検討）。
  - 案 C: 楽観更新あり、ロールバック時にトースト。実装コストが上がる。

意思決定後は下記「作るもの」に反映して着手する。以降の記述は **D1=A / D2=A / D3=A / D4=B / D5=A / D6=B** を仮定して書く。

### 作るもの

- [ ] **`src/features/notebook/constants/sections.ts`（改修、D1=A 前提）**
  - `FieldDefinition = { key: string; label: string; kind: 'text' | 'textarea' | 'date'; maxLength?: number; placeholder?: string; note?: string }` を新規 export。
  - `SectionDefinition.fields` を `readonly string[]` → `readonly FieldDefinition[]` に変更。
  - `basic.fields` に 4 項目（例: `full_name` / `birthdate` / `blood_type` / `emergency_contact_name` — **要ユーザー確認: 具体項目**）。他セクションは `[]` のまま。
  - Zod スキーマ生成用に `key` の文字集合は `^[a-z][a-z0-9_]*$` を守る（テストで担保）。
- [ ] **`src/features/notebook/constants/sections.test.ts`（改修）**
  - `SECTIONS.basic.fields.length` が 4、`sensitive` フラグの制約はそのまま、`key` の命名規則テストを追加。
- [ ] **`src/features/notebook/schema/section-fields.ts`（新規）**
  - `buildSectionFieldsSchema(fields: readonly FieldDefinition[]): ZodObject<...>` を提供。
  - 単一項目は基本的にすべて optional（未記入 OK）、`maxLength` 指定があれば `.max(n, '...文字以内で入力してください')`、`kind === 'date'` は `YYYY-MM-DD` 形式を許容する `string`（`z.string().regex(...)` or `z.string().refine(...)`）で緩めに。
  - **パスワード / 暗証番号 / マイナンバーの key を絶対に受けない**ホワイトリスト検証（`assertNoSensitiveKey`）をユーティリティ化し、テストで担保（CLAUDE.md セキュリティ）。
- [ ] **`src/features/notebook/schema/section-fields.test.ts`（新規、Vitest）**
  - `buildSectionFieldsSchema` が `maxLength` を尊重、`kind: 'date'` の正規表現を検証、`assertNoSensitiveKey` が禁止キー（`password` / `pin` / `mynumber` 等）で throw する 3 件。
- [ ] **`src/lib/query/queryKeys.ts`（改修）**
  - `queryKeys.notebook.fields = (section: SectionSlug) => ['notebook', 'fields', section] as const` を追加。
- [ ] **`src/features/notebook/api/useNoteFields.ts`（新規）**
  - `fetchNoteFields(section)`: `GET /note-fields/{section}` → `{ fields: Record<string, string> }`。**404 は空返し**（`useNoteSummary` と同ポリシー）。
  - `useNoteFields(section)`: `useQuery({ queryKey: queryKeys.notebook.fields(section), queryFn: () => fetchNoteFields(section), retry: false, staleTime: 30_000 })`。
- [ ] **`src/features/notebook/api/useNoteFields.test.ts`（新規、Vitest）**
  - `fetch` を stub して 200 応答時にオブジェクトを返す、404 で空を返す、他 4xx/5xx で throw する 3 件。
- [ ] **`src/features/notebook/api/usePatchNoteFields.ts`（新規）**
  - `patchNoteFields(section, partial)`: `PATCH /note-fields/{section}`、body `{ fields: partial }`。CSRF が必要な場合は `readXsrfToken()`（auth の sanctum 実装を参照）。
  - `usePatchNoteFields(section)`: `useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notebook.summary }) })`。**`queryKeys.notebook.fields(section)` は自分が真実なので invalidate しない**（サーバから戻ってきた値で上書きしたくないため）。
- [ ] **`src/features/notebook/api/usePatchNoteFields.test.ts`（新規、Vitest）**
  - 200 応答で `invalidate` が 1 回呼ばれる、500 で throw、body に差分だけが載る、の 3 件。
- [ ] **`src/features/notebook/hooks/useAutoSave.ts`（新規、Client）**
  - Signature: `useAutoSave<TValues extends Record<string, unknown>>({ form, mutate, delayMs = 800, isEnabled = true }): { status: 'idle' | 'saving' | 'saved' | 'error'; retry: () => void; lastError: ApiError | null }`
  - 実装（D4=B 前提）:
    1. `useEffect` で `form.watch(({ ... }, { name, type }) => { ... })` を購読、`clearTimeout(timerRef.current)` → `timerRef.current = setTimeout(flush, delayMs)`。
    2. `flush()`: RHF の現在値 vs 前回保存値の**差分**を計算 → 差分が空なら何もしない → `setStatus('saving')` → `mutate.mutateAsync(diff)`。
    3. `onSuccess`: `setStatus('saved')`、`savedRef` を更新、`setTimeout(() => setStatus('idle'), 3000)`（`motion-reduce` は即 idle）。
    4. `onError`: `setStatus('error')`、`lastError` を保持、**RHF の値は触らない**、トーストは `SectionForm` 側で表示（フックは通知責務を持たない）。
    5. `retry()`: 現在値と最後の成功値の差分をもう一度 `mutateAsync`。
  - `useEffect` の cleanup で `clearTimeout` + `sub.unsubscribe()`。
  - **サーバ状態を `useState` に写し取らない**（`savedRef` は差分計算専用の内部参照、UI が読む唯一の真実は RHF）。
- [ ] **`src/features/notebook/hooks/useAutoSave.test.ts`（新規、Vitest）**
  - `vi.useFakeTimers()` + `renderHook` + `QueryClientProvider` の wrapper で以下:
    1. **収束テスト（DoD の 1 件目）**: RHF `setValue` を 100ms 間隔で 5 回叩き、`vi.advanceTimersByTime(800)` で 1 回だけ `mutate` が呼ばれる。
    2. **状態遷移**: `idle` → 入力 → `saving` → 成功 → `saved` → 3 秒経過で `idle`。
    3. **失敗時値保持（DoD の 2 件目）**: `mutate` を reject させ、`status === 'error'`、RHF の値が消えていない（`getValues()`）。
    4. **`retry()` で再送**: reject 後に `retry()` を呼ぶと再度 `mutate` が呼ばれ、成功で `saved`。
    5. **差分 0 は送らない**: 何も変えず timer だけ進めても `mutate` が呼ばれない（`watch` は初期発火があるため要注意）。
    6. **cleanup**: unmount で timer が clear される（後続 `advanceTimersByTime` で `mutate` が呼ばれない）。
- [ ] **`src/features/notebook/components/SavingIndicator.tsx`（新規、Client）**
  - Props: `status: 'idle' | 'saving' | 'saved' | 'error'; onRetry?: () => void`
  - 出力: `idle` → 何も描画しない or 微小プレースホルダ。`saving` → 「保存中…」+ 小さなスピナー相当（`aria-live="polite"` + `role="status"`）。`saved` → 「保存しました」+ チェック相当。`error` → 「保存できませんでした」+「再試行」ボタン（`onRetry`）。
  - デザイントークン準拠（`text-muted-foreground` / `text-destructive` / `text-primary` 等）。**直値の HEX 禁止**（CLAUDE.md ルール 5）。
  - `motion-reduce:` で遷移アニメを無効化。
- [ ] **`src/features/notebook/components/SavingIndicator.test.tsx`（新規、Vitest）**
  - 4 状態がそれぞれ想定の a11y ロール/テキストで描画される、`error` 時に「再試行」ボタンをクリックすると `onRetry` が呼ばれる、の 5 件（4 + 1）。
- [ ] **`src/features/notebook/components/SectionForm.tsx`（新規、Client）**
  - Props: `slug: SectionSlug`
  - 実装:
    1. `const def = SECTIONS[slug]`。`def.fields.length === 0` なら **null を返す**（該当セクションに単一項目が無いときは何も描画しない）。
    2. `useNoteFields(slug)` で初期値取得（loading 中は `<Skeleton>` のフィールド 4 本分）。
    3. `useForm({ resolver: zodResolver(buildSectionFieldsSchema(def.fields)), defaultValues: initial, values: initial, mode: 'onChange' })`。**`values` プロップで re-fetch 時に初期化**（RHF の `useForm` の推奨）。
    4. `const patch = usePatchNoteFields(slug)`; `const { status, retry } = useAutoSave({ form, mutate: patch });`
    5. JSX: `<Form {...form}>` の中で `def.fields.map((f) => <FormField ... />)`。`kind === 'text'` → `<Input>`、`'textarea'` → `<Textarea>`、`'date'` → `<Input type="date">`。ラベルは `f.label`、`f.note` があれば `<p className="text-xs text-muted-foreground">`。
    6. 見出し（親側）の右横に `<SavingIndicator status={status} onRetry={retry} />` を描画するため、**`SectionForm` は自分の中で `SavingIndicator` を描画**（`SectionForm` 全体を `<section>` で包み、見出しは既に親で描画済みなので、`SavingIndicator` はフォーム上部に置く）。**要判断**: 見出しの右横に配置するには `page.tsx` から `SectionForm` にステータス表示エリアを渡す必要があるが、Server → Client のレンダリング境界を跨ぐので**`SavingIndicator` は `SectionForm` 内の上部に配置**が実装しやすい（意思決定 D5 の補足）。
    7. `useEffect` で `status === 'error'` になった瞬間に `toast.error('保存できませんでした')` を 1 回だけ発火（トリガの重複防止に `prevStatus` を ref で持つ）。
  - **`type="password" / "tel"` 等の機微入力は作らない**（`kind` に含めない）。
  - 家族ロール判定は本 Issue ではしない（後続 Issue の TODO コメント）。
- [ ] **`src/features/notebook/components/SectionForm.test.tsx`（新規、Vitest）**
  - `QueryClientProvider` + `fetch` stub で以下:
    1. `basic` を渡すと `def.fields` 4 本が RHF/`Form` で描画される。
    2. 空の `fields`（例 `other`）を渡すと何も描画しない（`container.firstChild === null` を確認）。
    3. 入力後 800ms 経過で `PATCH /note-fields/basic` が 1 回だけ呼ばれる。
    4. mutation を reject させると `role="alert"` 相当のトーストが 1 回発火（`sonner` の toast をモック）、RHF の値が消えない。
    5. 「再試行」ボタンで再送される。
- [ ] **`src/app/(app)/notebook/[section]/page.tsx`（改修）**
  - `<SectionSensitiveNotice />` の直後（`<SectionNav />` の直前）に `<SectionForm slug={section} />` を差し込む。**それ以外は触らない**。
  - `SectionForm` は Client Component。`page.tsx` は Server のまま。
- [ ] **`src/app/(app)/notebook/[section]/page.test.tsx`（改修）**
  - 既存 4 ケースに加え、`basic` を渡すと `SectionForm` 由来の入力欄（例: ラベル「氏名」）が描画される 1 件を追加。**フォームの挙動テストは `SectionForm.test.tsx` に集約**、`page.test.tsx` は描画されることだけ確認。
- [ ] **`e2e/notebook-section.spec.ts`（改修）**
  - 既存の「money セクションに機微情報の注意」に加え、**新規テスト**:
    1. `basic` を開き、`GET /note-fields/basic` を空 stub、氏名欄に「山田 太郎」と入力 → 800ms 後に **`PATCH /note-fields/basic` が 1 回だけ発火**（`page.waitForRequest`）、`SavingIndicator` が「保存しました」表示になる。
    2. `PATCH /note-fields/basic` を 500 stub に切り替えて再度入力 → `toast.error` が表示され、RHF の値が消えていない（`inputEl.value` を assert）。
  - **DoD の「素早い入力で 1 回に収束」を E2E で担保**。
- [ ] **`src/features/notebook/api/useNoteSummary.ts`（微修正 or 据え置き）**
  - 型は変わらないが、`filledFields` は「値ありの単一項目数」として扱う。**バック未実装の間はフロントで動作確認できない**ので、実装は据え置き。invalidate だけ `usePatchNoteFields` から呼ぶ。**据え置きで OK**。

### 触らないもの

- **`SectionBreadcrumb` / `SectionNav` / `SectionSensitiveNotice` / `SectionProgress` / `SectionProgressLive`** — #19 完成。
- **`SECTIONS.money.sensitive` などの sensitive フラグ** — 挙動不変（`sections.test.ts` の該当箇所は守る）。
- **`middleware.ts` / `Header.tsx` / `layout.tsx`** — 変更不要。
- **`entryCategories`（リスト項目）** — 別 Issue。本 Issue は `fields`（単一項目）だけを扱う。
- **`useNoteSummary` の内部実装** — invalidate 呼び出しのみで OK。

### 任意（推奨、時間があれば）

- [ ] **オフライン検知**: `window.navigator.onLine` を監視、`offline` 中は `SavingIndicator` を「オフライン中・接続を待っています」に。`online` 復帰で自動リトライ 1 回。**要ユーザー確認**（v1 相当か MVP 相当か）。
- [ ] **`SavingIndicator` を見出しの右横に置く**（D5 案 A の完全形）: `page.tsx` の見出しブロックに `SectionForm` から `status` を上流に伝える仕組みが必要。Zustand や `useSyncExternalStore` を持ち込むほどでもないので、**当面は `SectionForm` 内上部に置く**（本 Issue で見た目を再調整するかは判断）。
- [ ] **`beforeunload` ガード**: `status === 'saving'` のときにページ離脱でブラウザ標準の確認ダイアログ。debounce 中の値も含めて保存が終わっていないケースに配慮。

## 完了条件（DoD）
Issue の DoD を転記:
- [ ] 素早い入力で送信回数が 1 回に収束
- [ ] ネットワークエラー時に値が保持され、再試行で保存される

上記の実現手段は「作るもの」に対応:
- **収束（DoD 1）** → `useAutoSave` の D4=B 実装（フォーム全体で 1 本の debounce タイマー）。`useAutoSave.test.ts` の収束テスト + `e2e/notebook-section.spec.ts` の入力後 waitForRequest（1 回だけ）で担保。
- **値保持と再試行（DoD 2）** → `useAutoSave` は `onError` で RHF の値を触らない。`SavingIndicator` の「再試行」ボタンで `retry()` を叩ける。単体テスト（reject → status='error' → 値が残る → retry で再送成功）と E2E（500 stub → 値保持 → 手動再送）で担保。

## リスク / 確認事項

- **`fields` の実データ（要ユーザー確認）**: `basic` セクションに入れる 4 項目の内訳。案として `full_name`（氏名）/ `birthdate`（生年月日、date）/ `blood_type`（血液型）/ `emergency_contact`（緊急連絡先、textarea 100 字）を提案するが、`docs/screen_spec.md` は具体項目リストを持たない（medical / money にはある）。**基本のこと 4 項目の内訳を確定させたい**。
- **API 契約の未確定（要ユーザー確認）**: バックがまだ `note-fields` 系エンドポイントを持たない。フロントで先行実装し、404 は無害扱いにするが、**実 API 到着時にパス・スキーマ・CSRF ヘッダの有無で差し替え作業が発生**する。`kotozute-api` 側の Issue を先に切るか、フロントで契約を先行提案するか。**推奨**: 本 Issue の PR に `docs/issues/20/api-proposal.md` を含めず、口頭合意 + TODO コメントで足す（過剰ドキュメント回避）。
- **Zod スキーマの厳しさ**: 単一項目は基本 optional。`birthdate` を string で受けるか Date に変換するか。**推奨**: string（`YYYY-MM-DD`）で受け、表示・保存も string。RHF との相性が良い。
- **`useAutoSave` の初期発火**: RHF `watch` は購読開始時に一度発火することがある。差分が 0 なら送らないロジックで防ぐが、テストで担保が必要。
- **`values` プロップと `defaultValues` の使い分け**: `useNoteFields` の再取得で初期値が変わる可能性がある（ページ再訪、`invalidateQueries` 経由）。RHF の `values` プロップは外部変化を反映するが、**ユーザーが編集中の値を上書きしてしまう恐れ**がある。**推奨**: 初回 mount 時のみ `defaultValues` として渡し、以降は同期しない（`isDirty` 中は無視）。**要判断**。
- **CSRF ヘッダの必要性**: Sanctum SPA 認証で PATCH に `X-XSRF-TOKEN` が必要か。auth 系は付けている。**推奨**: 統一のため付ける（`readXsrfToken()` を `usePatchNoteFields` でも使う）。
- **家族ロールの読み取り専用化（スコープ外）**: 本 Issue は owner 前提。将来 family ロールでは `SectionForm` を出さない（読み取り専用ビューは別コンポーネント）。**本 Issue では `SectionForm.tsx` 冒頭に TODO コメント**で明記。API が posthumous を返さない前提は堅持（`useNoteFields` の応答型に posthumous 分岐は入れない）。
- **`SavingIndicator` の a11y**: `role="status"` + `aria-live="polite"` で成功メッセージを読み上げ。失敗時は `role="alert"` + `aria-live="assertive"`。スクリーンリーダーが「保存中…／保存しました」を過度に読まないよう、頻度を絞る（3 秒で消える、`saving` → `saved` の遷移だけ通知）。
- **トースト重複**: `useAutoSave` 内で `status === 'error'` が続くと `useEffect` が再走してトーストが多発しうる。**`prevStatus` ref で「idle/saving → error」への遷移時のみ発火**。テストで担保。
- **デザイントークン**: `SavingIndicator` の色は `text-muted-foreground` / `text-primary` / `text-destructive` を使う（`bg-*` 直値禁止）。**要確認**: プロジェクトの意味色トークンに「保存成功」に相当するものが無ければ `text-primary` で代用。
- **Vitest の fake timer と React Testing Library の相性**: `waitFor` と `vi.advanceTimersByTime` を併用する際は、`await act(async () => { vi.advanceTimersByTime(800); })` の形で書く必要がある。既存テストにこのパターンが無いので、**最初の実装で確立**する。
- **Playwright での fake timer**: E2E は実時間で 800ms 待つ（`page.waitForTimeout(900)`）か `page.waitForRequest` を使う。**推奨**: `waitForRequest` で fetch の到着を待つ（時間依存を減らす）。
- **DoD の「8 セクション全てで説明文と注意書きが出る」との関係**（#19 の残タスクではないか）: #19 で担保済み。本 Issue は追加の網羅責務なし。
- **バックの認可**: `PATCH /note-fields/:section` は owner のみ許可、family は 403。フロントは 403 を `toast.error("編集権限がありません")` として扱う分岐を入れるか。**推奨**: 本 Issue のスコープでは 403 も汎用トーストで扱い、family ロールの UI 分岐は別 Issue。

## 参照
- CLAUDE.md（絶対ルール 1・2・4・5、セキュリティ）
- docs/frontend_design.md（§状態管理、§API 通信と型）
- docs/screen_spec.md §2「セクション編集 → 単一項目」、§共通仕様（保存中・失敗時）
- 前提 Issue #16（SECTIONS / useSectionProgress）、#17（useNoteSummary）、#19（`/notebook/[section]` 骨組み）
- 参考実装 `src/features/auth/api/useLogin.ts`（useMutation）、`src/features/auth/components/LoginForm.tsx`（RHF + Zod + shadcn Form + sonner）
