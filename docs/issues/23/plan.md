# Issue #23 — W3-03 [F-05] EntryCard リスト + 追加/編集/削除（楽観的更新+ロールバック）

- URL: https://github.com/hasedai0000/kotozute-web/issues/23
- ラベル: frontend, week-3
- マイルストーン: MVP-Week3

## Issue 概要
`note_entries`（銀行口座・保険・不動産・借入・アカウント・定期購読・ペット）の一覧描画と CRUD を実装する。TanStack Query の **`onMutate` でキャッシュを差分更新（楽観的更新）→ `onError` でロールバック**する挙動を作り、削除は必ず `ConfirmDialog` を経由させる。ネットワーク切断時に UI が自動的に元に戻ること、成功時にトーストが出ることが DoD。#22 で作った `EntryDialog` を `SectionEntries` から `useAddEntry` / `useUpdateEntry` に橋渡しし、現在 `onSubmit: () => undefined` になっているスタブを本物の mutation に差し替える。

## 調査結果

### 関連ドキュメント
- `CLAUDE.md` 絶対ルール — 「2. サーバ状態は TanStack Query が唯一の真実」→ 楽観的更新のロールバックは `queryClient.setQueryData` / `getQueryData` で扱い、`useState` に写し取らない。「7. 複数登録できる項目は `EntryCard` のリスト＋追加ボタンで統一」→ 本 Issue で完成させる。
- `docs/screen_spec.md` §2「リスト項目（＝口座・保険等）」 — カード表示（主要名・副項目・`TimingBadge`・編集/削除）／追加編集は**ダイアログ**／**公開タイミングはレコード単位で選択**／削除は `ConfirmDialog`／**楽観的更新で即時反映し、失敗時ロールバック**／並べ替えは `sort_order`（MVP は任意）。
- `docs/screen_spec.md` §共通仕様「状態の出し分け」 — 「保存中：楽観的更新で即時反映、失敗時ロールバック＋トースト」「オフライン／通信失敗：『保存できませんでした』トースト＋再試行」「空：説明文＋一次アクション（例『まだ登録がありません／口座を追加』）」→ `EmptyState` は既に共通コンポーネントとして想定されている。
- `docs/screen_spec.md` §共通仕様「ロールによる出し分け」 — family ロール時は編集/削除ボタンを出さない（`EntryCard` の `readOnly` を活かす）。**`posthumous` レコードは API が返さない前提**（クライアント側で隠すのは禁止）。本 Issue では family 実装は範囲外だが、`useEntries` の返り値をそのまま描画する設計にしておけば #24 と自然に整合する。
- `docs/frontend_design.md` §状態管理 — 画面ローカル（削除確認モーダルの開閉）は `useState`。**サーバ状態は Query が真実**。
- `docs/frontend_design.md` §API 通信 — `lib/api/` の `apiFetch` に `credentials: 'include'`。CSRF は Sanctum の `X-XSRF-TOKEN`（`readXsrfToken` 参照）。契約変更は OpenAPI 再生成で追随。**`note_entries` は現時点で OpenAPI に未定義**なので `useNoteFields` と同じく手書き型 + `TODO(#20+)` コメントを付け、404 フォールバックで UI を落とさない。

### 関連コード
- `src/features/notebook/components/SectionEntries.tsx:1-61` — **本 Issue の主戦場**。現状は `openCategory` state と「◯◯ を追加」ボタン＋ `EntryDialog` の open/close だけ。`onSubmit: () => undefined` のスタブを `useAddEntry(section).mutate({ category, values })` に差し替え、加えて **`useEntries(section)` の結果を `EntryCard` の一覧としてレンダリング**する責務を追加する（カテゴリごとにグルーピングして表示）。編集は `EntryDialog` を `mode="edit"` + `initial={values}` で開き `useUpdateEntry(section).mutate({ id, values })` に、削除は `ConfirmDialog` を経由して `useDeleteEntry(section).mutate({ id })` に接続する。
- `src/features/notebook/components/EntryDialog.tsx:1-252` — **#22 で完成済み。触らない**（本 Issue のスコープ外）。ただし `onSubmit(values: Record<string, string>)` のインターフェースはそのまま活かす。`initial` を渡せば編集モードの初期値になる。**`timing` 選択 UI は含まれていない** → 本 Issue では **`timing` は create 時に `"always"` を既定**として `useAddEntry` 内で補い、UI は #24 で追加する（D5 参照）。
- `src/features/notebook/components/EntryCard.tsx:1-77` — **本 Issue の描画元**。既に `title` / `meta: ReactNode` / `timing: TimingVariant` / `onEdit` / `onDelete` / `readOnly` を受ける完成品。**触らない**。呼び出し側で `CATEGORIES[category].primaryKey` を title に、`metaKeys` を副項目にマップして流す（下記スケルトン参照）。
- `src/features/notebook/components/TimingBadge.tsx:1-37` — 既存。`variant: "always" | "posthumous"`。本 Issue では `entry.timing` をそのまま流す。
- `src/features/notebook/constants/categories.ts:1-336` — **本 Issue の描画マッピング元**。`CATEGORIES[slug].primaryKey`（例 `bank_account.bank_name`）→ EntryCard の `title`、`metaKeys`（例 `["branch", "account_type", "last4"]`）→ EntryCard の `meta` に「支店：△△／種別：普通／下 4 桁：1234」形式で組み立てる。**`account_type` などの select 値はラベルに変換**する必要がある（`options.find(o => o.value === value)?.label`）。
- `src/features/notebook/api/useNoteFields.ts:1-35` / `usePatchNoteFields.ts:1-38` — **本 Issue の API フックの雛形**。同じパターンで `useEntries` / `useAddEntry` / `useUpdateEntry` / `useDeleteEntry` を作る。**404 は空配列にフォールバック**、mutation では `readXsrfToken()` で `X-XSRF-TOKEN` を付与、成功時は `notebook.summary` を invalidate（`entryCountByCategory` に効く）。
- `src/lib/query/queryKeys.ts:1-16` — **本 Issue で `notebook.entries(section)` を追加する**。`fields(section)` と同じ形。
- `src/lib/api/index.ts` / `src/features/auth/api/sanctum.ts` — `apiFetch` / `readXsrfToken` の場所。
- `src/components/layout/ConfirmDialog.tsx:1-77` — **本 Issue で削除確認に使う**。既存の `open` / `onOpenChange` / `title` / `description` / `variant: "destructive"` / `onConfirm` プロパティを使う。`isSubmitting` 中は重複クリック不可、成功後に自動 close するので **`onConfirm` は `useDeleteEntry` の `mutateAsync` を await する** ように書けば挙動が整う。
- `src/features/notebook/api/useNoteFields.test.ts:1-43` / `usePatchNoteFields.test.ts:1-53` — **Vitest の雛形**。`vi.stubGlobal("fetch", ...)` で URL・method・body・XSRF ヘッダを検証するパターン。**楽観的更新のロールバック**は `renderHook` + `QueryClientProvider` で `queryClient.getQueryData` の遷移をアサートする（下記テスト計画参照）。
- `src/features/notebook/api/useNoteSummary.ts:1-56` — `entryCountByCategory: Partial<Record<string, number>>` が既にあるので、mutation 成功時に `queryClient.invalidateQueries({ queryKey: queryKeys.notebook.summary })` で自動反映される。
- `src/features/notebook/components/SectionForm.tsx:100-125` — トースト（`sonner`）の使い方参考。`toast.error(SAVE_ERROR_TOAST)` と同じスタイルで「保存できませんでした」「削除できませんでした」を出す。**成功時トーストは DoD なので `toast.success` も足す**（`SectionForm` は自動保存なので `SavingIndicator` に寄せているが、CRUD は明示的なアクションなのでトーストが自然）。
- `e2e/notebook-entry-dialog.spec.ts:1-113` — **本 Issue の E2E 雛形**。同じ `stubApi` パターン（`page.route` で 200/JSON を返す）で `note-entries` を追加。**ロールバック検証**は `page.route` で **一時的に 500 を返す** ハンドラを差し込み、送信 → エラートースト → カードが消える／戻る を確認する。
- `src/types/generated/api.ts` — `note-entries` の型は**未定義**。本 Issue では `useNoteFields` と同じく手書きの `NoteEntry` 型を置き、`TODO(#20+)` コメントで再生成時の差し替えを予告する。
- `src/app/(app)/notebook/[section]/page.tsx:1-53` — 現状 `SectionEntries` に `categories` と `sensitive` を渡すだけ。**本 Issue では変更不要**（ロジックはすべて `SectionEntries` 側に寄せる）。ただしテスト（`page.test.tsx`）が空の一覧を前提にしていないか要確認。

### 依存関係
- **先に必要（完了済み）**:
  - **#21 W3-01 カテゴリ定数** — `CATEGORIES / CategorySlug`（`primaryKey` / `metaKeys` を使う）。
  - **#22 W3-02 EntryDialog** — CREATE/EDIT の入力 UI。本 Issue で mutation に橋渡しする。
- **並行 / 後続**:
  - **#24 W3-04 TimingBadge レコード単位選択** — timing 選択 UI を `EntryDialog` に追加、`EntryCard` の色反映。本 Issue は **`useUpdateEntry` の payload に `timing?: TimingVariant` を含められる形**にしておき、UI 差し込みだけ #24 に任せる（D5 参照）。
  - **#25 W3-05 大切な人へ** — `messages` は別 feature だが、`useEntries` / `useAddEntry` の設計パターン（楽観的更新 + ロールバック）は流用対象。

## やること

### 前提の意思決定（**要ユーザー確認**）

実装分岐点。合意後に着手する。

- **D1. `note_entries` の API パス**（推奨: **案 A**）
  - **案 A（推奨）**: **`/note-entries/:section`**（`useNoteFields` と同じ「セクション単位のリソース」観点）。GET はセクション全体（全カテゴリの entries を配列で返す）、POST は同 URL に `{ category, values, timing }` を送る、PATCH/DELETE は `/note-entries/:section/:id`。1 セクション = 1 キャッシュで扱いやすく、`entryCountByCategory` の一括更新と相性がよい。
  - 案 B: **`/note-entries?section=X&category=Y`** のクエリ形式。カテゴリ単位で細分化されるが、キャッシュキーが増え invalidate 範囲が煩雑になる。
  - **バック（`kotozute-api`）との仕様は現時点未定義**（OpenAPI に無い）。**推奨（案 A）で先行実装し、バック実装時に openapi 再生成で調整**する（`useNoteFields` と同じ運用）。
- **D2. キャッシュのグルーピング**（推奨: **案 A**）
  - **案 A（推奨）**: `queryKeys.notebook.entries(section)` = 1 キー = そのセクションの全 entries を配列で保持。**楽観的更新は配列に対する 1 差分**で済み、`getQueryData` / `setQueryData` の見通しがよい。
  - 案 B: `queryKeys.notebook.entries(section, category)` = カテゴリ別。フィルタリングは楽になるが、`money` は 4 カテゴリあり invalidate と楽観的更新の対象キーが増える。
- **D3. entry の ID と楽観的追加のプレースホルダ**（推奨: **案 A**）
  - **案 A（推奨）**: **サーバ ID は数値 or ULID 前提**（バック未定なのでどちらでも受ける `string | number` 型）。楽観的追加時は **`crypto.randomUUID()` の一時 ID**（`temp-<uuid>`）を割り当て、成功時に `onSuccess` で **サーバレスポンスの `entry` に置換**する（`setQueryData` で配列の該当要素を差し替え）。失敗時 `onError` で `previousEntries` に丸ごとロールバック。
  - 案 B: 楽観的追加は行わず、mutation 中はスケルトンを追加。**DoD の「ネットワーク切断時に巻き戻る」を満たすには何かしら描画が必要**なので却下寄り。
- **D4. `timing` の既定値 & UI 実装場所**（推奨: **案 A**）
  - **案 A（推奨）**: 本 Issue では **`timing` を `"always"` 固定で create**（`useAddEntry` の payload 組み立て時に付与）。**UI 選択は #24 で追加**。`EntryCard` には `entry.timing` をそのまま流すので、#24 で `posthumous` を選べば色が変わる。**#22 の EntryDialog は values に `timing` キーを持たない**ため、本 Issue の橋渡し関数は `values` を **entry 本体の `values` サブフィールドに丸ごと入れ、`timing` を別プロパティとして並べる形**にする（下記スケルトン参照）。
  - 案 B: 本 Issue に timing 選択 UI（ラジオ）を差し込む。#24 と作業が重複するため却下。
- **D5. 削除の UX**（推奨: **案 A**）
  - **案 A（推奨）**: 削除ボタン → `ConfirmDialog`（`variant="destructive"`、「この項目を削除します。よろしいですか」）→ 確定で `useDeleteEntry.mutateAsync({ id })`。`ConfirmDialog` が `await onConfirm` するので、**mutateAsync が投げなければダイアログが閉じ、投げたら開いたまま + トースト**という自然な挙動になる。楽観的削除で先にカードは消し、失敗時に戻す。
  - 案 B: `ConfirmDialog` の外で楽観的削除を行い、ダイアログは確認のみ。**確認前にカードが消える**のは UX として不自然なので却下。
- **D6. 成功時トーストの粒度**（推奨: **案 A**）
  - **案 A（推奨）**: 追加/更新/削除で `toast.success("追加しました" / "更新しました" / "削除しました")`。楽観的更新で UI は既に反映されているので、**トーストは「サーバに反映された」ことの合図**として意味を持つ。
  - 案 B: 失敗時のみトースト（成功は無音）。DoD「成功時にトースト表示」に反するため却下。
- **D7. `sensitive` フラグの伝播**（推奨: **案 A**、#22 plan D2 と整合）
  - **案 A（推奨）**: `SectionEntries` が受け取っている `sensitive?: boolean` を **`EntryDialog` にそのまま渡す**（既に実装済）。追加変更なし。
- **D8. E2E のロールバック検証**（推奨: **案 A**）
  - **案 A（推奨）**: `e2e/notebook-entries.spec.ts` を新規作成。`page.route(NOTE_ENTRIES_URL_RE, ...)` で通常は 200 を返し、**特定のテスト内でだけ POST に 500 を返す**ハンドラに差し替える。追加した銀行口座カードが**一瞬表示 → 消える**、**エラートースト**が出る、を検証。**削除のロールバック**も同様に 500 で確認。
  - 案 B: E2E は「成功シナリオ」だけ書き、ロールバックは Vitest（`renderHook` + fetchMock）で網羅。**「ネットワーク切断時に巻き戻る」DoD は Vitest で担保**可能だが、Playwright でも 1 本欲しい（体感の担保）ため案 A 推奨。
- **D9. 一覧の並び順**（推奨: **案 A**）
  - **案 A（推奨）**: **API が返した順序をそのまま描画**。screen_spec §2 に「並べ替えは `sort_order` を更新（MVP は任意）」とあり、本 Issue で並べ替え UI は作らない。楽観的追加は**配列末尾に追加**。
  - 案 B: カテゴリ内でアルファベット順にソート。仕様外なので却下。

### タスク

- [ ] **`src/lib/query/queryKeys.ts`** に `notebook.entries(section)` を追加
  - [ ] `entries: (section: SectionSlug) => ["notebook", "entries", section] as const`
- [ ] **`src/features/notebook/api/useEntries.ts`** を新規作成
  - [ ] `NoteEntry` 型を手書きで定義（`{ id: string; category: CategorySlug; values: Record<string, string>; timing: "always" | "posthumous"; sort_order?: number }`）※ **`TODO(#20+): OpenAPI から差し替え`** コメント必須
  - [ ] `NoteEntriesResponse = { entries: NoteEntry[] }`
  - [ ] `fetchNoteEntries(section)`: `apiFetch<NoteEntriesResponse>('/note-entries/:section')`、**404 は `{ entries: [] }` を返す**（`useNoteFields` と同じ）
  - [ ] `useEntries(section)`: `useQuery({ queryKey: queryKeys.notebook.entries(section), queryFn: ..., retry: false, staleTime: 30_000 })`
- [ ] **`src/features/notebook/api/useAddEntry.ts`** を新規作成
  - [ ] `addNoteEntry(section, input: { category, values, timing })` → `apiFetch<NoteEntry>('/note-entries/:section', { method: 'POST', json: input, headers: XSRF })`
  - [ ] `useAddEntry(section)`: `useMutation` の **`onMutate` で楽観的追加**
    - [ ] `queryClient.cancelQueries({ queryKey: queryKeys.notebook.entries(section) })`
    - [ ] `const previous = queryClient.getQueryData<NoteEntriesResponse>(...)`
    - [ ] `const tempEntry: NoteEntry = { id: 'temp-' + crypto.randomUUID(), ...input }`
    - [ ] `queryClient.setQueryData(..., { entries: [...(previous?.entries ?? []), tempEntry] })`
    - [ ] `return { previous, tempId: tempEntry.id }`
  - [ ] `onError(_, __, ctx)` で `ctx.previous` に戻す + `toast.error("追加できませんでした")`
  - [ ] `onSuccess(serverEntry, _, ctx)` で **temp を server entry に置換**（`.map(e => e.id === ctx.tempId ? serverEntry : e)`） + `toast.success("追加しました")`
  - [ ] `onSettled` で `queryClient.invalidateQueries({ queryKey: queryKeys.notebook.summary })`（`entryCountByCategory` を再取得）
- [ ] **`src/features/notebook/api/useUpdateEntry.ts`** を新規作成
  - [ ] `updateNoteEntry(section, { id, values, timing? })` → `apiFetch<NoteEntry>('/note-entries/:section/:id', { method: 'PATCH', json: { values, timing }, headers: XSRF })`
  - [ ] `onMutate` で該当 id の entry を差し替え、`previous` を保存
  - [ ] `onError` で `previous` に戻す + `toast.error("更新できませんでした")`
  - [ ] `onSuccess` で `toast.success("更新しました")`
  - [ ] `onSettled` で `notebook.summary` を invalidate（timing 変更で filled 判定は不変だが、将来のため）
- [ ] **`src/features/notebook/api/useDeleteEntry.ts`** を新規作成
  - [ ] `deleteNoteEntry(section, id)` → `apiFetch<void>('/note-entries/:section/:id', { method: 'DELETE', headers: XSRF })`
  - [ ] `onMutate` で該当 id を配列から除去、`previous` を保存
  - [ ] `onError` で `previous` に戻す + `toast.error("削除できませんでした")`
  - [ ] `onSuccess` で `toast.success("削除しました")`
  - [ ] `onSettled` で `notebook.summary` を invalidate
- [ ] **`src/features/notebook/components/EntryList.tsx`** を新規作成（`SectionEntries` から一覧描画部分を分離）
  - [ ] props: `entries: NoteEntry[]` / `category: CategorySlug` / `readOnly?: boolean` / `onEdit: (entry) => void` / `onDelete: (entry) => void`
  - [ ] カテゴリごとにグルーピング（ここではフィルタ済みを受け取る）→ `EntryCard` 一覧を描画
  - [ ] **空のとき**: `EmptyState` 相当（「まだ登録がありません」）※ 既存の `EmptyState` があれば使う（`grep` で確認）、無ければ本 Issue では**シンプルな `<p>` テキスト**で済ませ、共通化は後続 Issue に回す
  - [ ] **title / meta のマッピングヘルパ**: `formatEntryTitle(category, values)` / `formatEntryMeta(category, values)` を同ファイルまたは `utils` に切る
    - `title`: `values[CATEGORIES[category].primaryKey] ?? "(名称未設定)"`
    - `meta`: `metaKeys` を順に「ラベル：値」で join（select は options ラベルに変換）
- [ ] **`src/features/notebook/components/SectionEntries.tsx`** を書き換え
  - [ ] `useEntries(section)` を呼び、`data.entries` をカテゴリごとに分けて `EntryList` を描画
  - [ ] `useAddEntry(section)` / `useUpdateEntry(section)` / `useDeleteEntry(section)` を保持
  - [ ] state: `openCategory: CategorySlug | null`（追加時）、`editing: { category, entry } | null`（編集時）、`deleting: NoteEntry | null`（削除確認時）
  - [ ] `EntryDialog` は **1 つだけマウント**（追加/編集の兼用）、mode / initial を state から派生
  - [ ] `ConfirmDialog` で削除の確認 → `useDeleteEntry.mutateAsync({ id })` を await
  - [ ] `props.section` を **新規に追加**（現状は categories/sensitive のみ受けている）→ `page.tsx` から `section={section}` を渡すよう変更
- [ ] **`src/app/(app)/notebook/[section]/page.tsx`** の変更
  - [ ] `<SectionEntries section={section} categories={def.entryCategories} sensitive={def.sensitive} />` に `section` を追加
- [ ] **Vitest（ユニット / フック）**
  - [ ] `useEntries.test.ts`: 200 で `entries` を返す／404 で `{ entries: [] }` ／500 で throw
  - [ ] `useAddEntry.test.ts`: **楽観的更新 → 成功で置換 / 失敗でロールバック**
    - `QueryClient` を作り、`setQueryData` で初期エントリを配置
    - `mutateAsync` を呼び、`onMutate` 段階で **temp entry が配列に入っている**ことをアサート（`await Promise.resolve()` で mutation の非同期タイミングを制御）
    - fetch を成功で解決 → temp が server entry に置換されていることを確認
    - 別テストで fetch を reject → **配列が initial に戻る**ことを確認 + `toast.error` が呼ばれる（`vi.mock("sonner")`）
  - [ ] `useUpdateEntry.test.ts`: 差し替え → 成功 / 失敗ロールバック（同上）
  - [ ] `useDeleteEntry.test.ts`: 除去 → 成功 / 失敗ロールバック（**DoD 直結**：「ネットワーク切断時に楽観的更新が巻き戻る」）
  - [ ] `SectionEntries.test.tsx`（軽め、統合寄り）: `useEntries` を `vi.mock` で差し替え、entries を配置 → EntryCard が描画される／編集ボタンで EntryDialog が `mode="edit"` で開く／削除ボタンで ConfirmDialog が開く
- [ ] **E2E（`e2e/notebook-entries.spec.ts` を新規作成）**
  - [ ] `stubApi` を `notebook-entry-dialog.spec.ts` から流用（もしくは共通 helper 化）
  - [ ] `NOTE_ENTRIES_URL_RE = /\/(api\/)?note-entries\/[a-z_]+(\/[^/?]+)?(\?|$)/`
  - [ ] **シナリオ 1: 追加成功 + トースト**
    - `/notebook/money` → 「銀行口座 を追加」→ 銀行名入力 → 保存 → 一覧にカードが出る → `getByText("追加しました")` を確認
  - [ ] **シナリオ 2: 追加失敗のロールバック**（DoD 直結）
    - POST を 500 に切り替え → 保存 → 一瞬カードが出て消える → `getByText("追加できませんでした")` を確認
  - [ ] **シナリオ 3: 削除の ConfirmDialog + 成功**
    - 事前に GET レスポンスにエントリを 1 件入れる → 削除ボタン → ConfirmDialog が出る → 確定 → カードが消える → `getByText("削除しました")`
  - [ ] **シナリオ 4: 削除失敗のロールバック**
    - DELETE を 500 → 確定 → カードが一瞬消えて戻る → `getByText("削除できませんでした")`
- [ ] **既存 E2E の点検**
  - [ ] `e2e/notebook-entry-dialog.spec.ts` は **`onSubmit` が stub のときの挙動**（ダイアログが閉じる）を前提にしている。本 Issue で本物の mutation を接続後、**同じ挙動を維持**することを確認（POST 200 で閉じる／保存トースト）。必要なら stub URL に POST 200 を追加。

### 実装スケルトン（草案）

```ts
// src/features/notebook/api/useAddEntry.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { readXsrfToken } from "@/features/auth/api/sanctum";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/queryKeys";

import type { CategorySlug } from "../constants/categories";
import type { SectionSlug } from "../constants/sections";

import type { NoteEntriesResponse, NoteEntry } from "./useEntries";

export type AddEntryInput = {
  category: CategorySlug;
  values: Record<string, string>;
  timing?: "always" | "posthumous"; // 既定 "always"（#24 で UI 追加）
};

export async function addNoteEntry(
  section: SectionSlug,
  input: AddEntryInput,
): Promise<NoteEntry> {
  const token = readXsrfToken();
  return await apiFetch<NoteEntry>(`/note-entries/${section}`, {
    method: "POST",
    json: {
      category: input.category,
      values: input.values,
      timing: input.timing ?? "always",
    },
    headers: token ? { "X-XSRF-TOKEN": token } : undefined,
  });
}

export function useAddEntry(section: SectionSlug) {
  const qc = useQueryClient();
  const key = queryKeys.notebook.entries(section);

  return useMutation({
    mutationFn: (input: AddEntryInput) => addNoteEntry(section, input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<NoteEntriesResponse>(key);
      const tempId = `temp-${crypto.randomUUID()}`;
      const tempEntry: NoteEntry = {
        id: tempId,
        category: input.category,
        values: input.values,
        timing: input.timing ?? "always",
      };
      qc.setQueryData<NoteEntriesResponse>(key, {
        entries: [...(previous?.entries ?? []), tempEntry],
      });
      return { previous, tempId };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
      toast.error("追加できませんでした");
    },
    onSuccess: (serverEntry, _input, ctx) => {
      const current = qc.getQueryData<NoteEntriesResponse>(key);
      if (current && ctx) {
        qc.setQueryData<NoteEntriesResponse>(key, {
          entries: current.entries.map((e) =>
            e.id === ctx.tempId ? serverEntry : e,
          ),
        });
      }
      toast.success("追加しました");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notebook.summary });
    },
  });
}
```

```tsx
// src/features/notebook/components/SectionEntries.tsx（差し替え後の骨子）
"use client";
import { Plus } from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "@/components/layout/ConfirmDialog";
import { Button } from "@/components/ui/button";

import { useAddEntry } from "../api/useAddEntry";
import { useDeleteEntry } from "../api/useDeleteEntry";
import { useEntries, type NoteEntry } from "../api/useEntries";
import { useUpdateEntry } from "../api/useUpdateEntry";
import { CATEGORIES, type CategorySlug } from "../constants/categories";
import type { SectionSlug } from "../constants/sections";

import { EntryDialog } from "./EntryDialog";
import { EntryList } from "./EntryList";

type Props = {
  section: SectionSlug;
  categories: readonly CategorySlug[];
  sensitive?: boolean;
};

export function SectionEntries({ section, categories, sensitive }: Props) {
  const { data } = useEntries(section);
  const add = useAddEntry(section);
  const update = useUpdateEntry(section);
  const remove = useDeleteEntry(section);

  const [openCategory, setOpenCategory] = useState<CategorySlug | null>(null);
  const [editing, setEditing] = useState<NoteEntry | null>(null);
  const [deleting, setDeleting] = useState<NoteEntry | null>(null);

  if (categories.length === 0) return null;
  const entriesByCategory = groupBy(data?.entries ?? [], (e) => e.category);

  const activeCategory = editing?.category ?? openCategory;
  return (
    <section aria-label="リスト項目" className="flex flex-col gap-6">
      {categories.map((c) => (
        <div key={c} className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">{CATEGORIES[c].label}</h2>
            <Button variant="outline" onClick={() => setOpenCategory(c)}>
              <Plus aria-hidden="true" />
              追加
            </Button>
          </div>
          <EntryList
            entries={entriesByCategory[c] ?? []}
            category={c}
            onEdit={(entry) => setEditing(entry)}
            onDelete={(entry) => setDeleting(entry)}
          />
        </div>
      ))}

      {activeCategory ? (
        <EntryDialog
          open={openCategory !== null || editing !== null}
          onOpenChange={(open) => {
            if (!open) { setOpenCategory(null); setEditing(null); }
          }}
          category={activeCategory}
          sensitive={sensitive}
          mode={editing ? "edit" : "create"}
          initial={editing?.values}
          onSubmit={(values) => {
            if (editing) update.mutate({ id: editing.id, values });
            else add.mutate({ category: activeCategory, values });
          }}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          open={deleting !== null}
          onOpenChange={(open) => { if (!open) setDeleting(null); }}
          title="項目を削除しますか"
          description="この操作は取り消せません。"
          variant="destructive"
          confirmLabel="削除する"
          onConfirm={() => remove.mutateAsync({ id: deleting.id })}
        />
      ) : null}
    </section>
  );
}
```

## 完了条件（DoD）

Issue の DoD を転記:

- [ ] **ネットワーク切断時に楽観的更新が巻き戻る**
  - Vitest（`useAddEntry` / `useUpdateEntry` / `useDeleteEntry` の rollback テスト）と Playwright（`page.route` で 500 を返すシナリオ）の両輪で担保
- [ ] **成功時にトースト表示**
  - `toast.success("追加しました" / "更新しました" / "削除しました")`
- [ ] `npm run typecheck` / `npm run lint` / `npm run test` / `npm run test:e2e` が緑

## リスク / 確認事項

- **バック API 未実装（`note_entries`）**: `useNoteFields` と同じく手書き型 + 404 フォールバックで先行実装するが、**`kotozute-api` 側で `POST /note-entries/:section` の仕様がまだ確定していない**。本 Issue で決めるパス（推奨: `/note-entries/:section` / `/note-entries/:section/:id`）を、**バック実装時に合わせるか、フロントを合わせるかを事前に確認**したい。仕様書（`docs/frontend_design.md`）にも明記が無い。**フロント先行で決めて構わないか**の判断が欲しい。
- **timing の既定 & UI（#24 との切り分け）**: 本 Issue では `timing = "always"` 固定で create し、UI 選択は #24 に寄せる（推奨）。**「作った直後に posthumous に変える」までは #24 のスコープ**。この整理で問題ないか。
- **`EmptyState` 共通コンポーネントの扱い**: `docs/screen_spec.md` に `EmptyState` の存在が想定されているが、リポジトリ内に該当ファイルが**未確認**。本 Issue では **シンプルなインラインの説明文**で済ませ、共通化は別 Issue で行う想定。合意可否を確認したい。
- **家族ロール（readOnly）の扱い**: `AuthProvider` に role が乗る前提だが、本 Issue の時点では `useAuth` から role を取得する枠組みが未整備の可能性がある。**本 Issue では `readOnly` プロパティのインターフェースだけ用意し、実際の切替は role が入ってから**（別 Issue / #24 と合わせて）行う方針で良いか。EntryCard の `readOnly` は既に完成している。
- **楽観的追加時の temp ID**: `crypto.randomUUID()` は Node/JSDOM 環境で利用可能（Vitest OK）だが、古いブラウザで未対応の場合に備えるかどうか。**MVP 対象ブラウザは最新 evergreen** と想定するなら不要。要確認。
- **並べ替え（`sort_order`）**: 本 Issue のスコープ外（screen_spec に「MVP は任意」）。**API レスポンスの順序に依存**する形で描画するので、バックが `sort_order` で並べて返す実装かどうかは要確認（フロント側でのソートは行わない）。
- **`toast.success` の連発**: 楽観的更新済みで即時反映されているところに「追加しました」を出すのは、**UX として二重通知感がないか**。DoD なので必ず出すが、文言や表示位置（右下トースト）は既存 `SectionForm` の `SAVE_ERROR_TOAST` と同じスタイル。
- **`useAutoSave` の Query invalidation との衝突**: `SectionForm` は `notebook.summary` を触るが、本 Issue も `onSettled` で同じキーを invalidate する。**同じセクション画面で単一項目編集と entry 追加を同時に行うケース**は稀だが、Query の race condition は無い（invalidate は idempotent）。

## 参照

- `CLAUDE.md`（絶対ルール 2「TanStack Query が唯一の真実」、7「EntryCard リスト + 追加」、セキュリティ）
- `docs/frontend_design.md`（§状態管理、§API 通信、§UI・デザイン実装）
- `docs/screen_spec.md` §2「セクション編集」→「リスト項目」／§共通仕様「状態の出し分け」「ロールによる出し分け」
- `docs/issues/22/plan.md`（EntryDialog の設計思想と `onSubmit` インターフェース）
- `src/features/notebook/api/useNoteFields.ts` / `usePatchNoteFields.ts`（本 Issue の API フック雛形）
- `src/features/notebook/components/EntryDialog.tsx`（#22 完成品、本 Issue で mutation に橋渡し）
- `src/features/notebook/components/EntryCard.tsx`（本 Issue で描画に使う既存部品）
- `src/features/notebook/constants/categories.ts`（`primaryKey` / `metaKeys` / `options` のラベル解決元）
- `src/components/layout/ConfirmDialog.tsx`（削除の確認モーダル）
- `src/lib/query/queryKeys.ts`（本 Issue で `notebook.entries(section)` を追加）
- `e2e/notebook-entry-dialog.spec.ts`（E2E の stub 雛形）
