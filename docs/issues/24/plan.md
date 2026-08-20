# Issue #24 — W3-04 [F-05] TimingBadge レコード単位の公開タイミング選択

- URL: https://github.com/hasedai0000/kotozute-web/issues/24
- ラベル: frontend, week-3
- マイルストーン: MVP-Week3

## Issue 概要
`note_entries` の公開タイミング（`always` / `posthumous`）を **レコード単位** で切り替えられるようにする。EntryDialog に timing 選択 UI を追加し、`useAddEntry` / `useUpdateEntry` の payload に流し込む。`EntryCard` は既に `TimingBadge` が差し込まれ済みなので、`entry.timing` が変われば色が即座に切り替わる（楽観的更新）。家族ロール時は `posthumous` レコードが API から返らない前提で、フロントは何も特別な隠蔽処理をしない（CLAUDE.md 絶対ルール #8）。

## 調査結果

### 関連ドキュメント
- `CLAUDE.md` 絶対ルール — 「6. 公開タイミングは意味で色分け：**常時共有＝グリーン／死後開示＝アンバー＋鍵**（`TimingBadge`）」／「8. 死後開示の項目は、API が返さない限り存在しない前提で実装する（クライアント側で隠すだけの実装は禁止）」→ 本 Issue の設計方針の両輪。timing 選択 UI は色の意味を保つ / family 側の見えなさは API に依存する。
- `docs/screen_spec.md` §2「リスト項目（＝口座・保険等）」— 「**公開タイミングはレコード単位で選択**（常時共有／死後開示）」「追加／編集は**ダイアログ**（React Hook Form ＋ Zod）」→ EntryDialog の中に選択 UI を置くのが自然。
- `docs/screen_spec.md` §共通仕様「ロールによる出し分け」— family は `posthumous` の項目が「**`disclosed_at` が立つまで存在しない**（API が返さない）」／「家族側は『隠す』のではなく **API が返さない**。クライアントで非表示にするだけの実装は禁止」→ 本 Issue で**クライアント側フィルタは書かない**。
- `docs/screen_spec.md` §共通仕様「状態の出し分け」— 「保存中：楽観的更新で即時反映、失敗時ロールバック＋トースト」→ timing の切替も既存の `useUpdateEntry` の楽観的更新に乗る。
- `docs/frontend_design.md` §状態管理 — 入力フォームは **React Hook Form**。timing は Zod スキーマに含める（`z.enum(["always", "posthumous"])`）。
- `docs/frontend_design.md` §UI・デザイン実装 — 「意味で色を使う：**常時共有＝グリーン**、**死後開示＝アンバー＋鍵アイコン**（`TimingBadge` として部品化）」→ 選択 UI にも同じ意味付けを反映（ラジオの近くに `TimingBadge` を並べる、など）。

### 関連コード
- `src/features/notebook/components/EntryDialog.tsx:48-64` — **本 Issue の主戦場**。`TODO(#24)` コメントが既に埋まっていて、「`onSubmit` の values にキーが増えても壊れないよう `Record<string, string>` のままインターフェースを保つ」との縛りがある。**timing はフォームの `values` に混ぜず、別プロパティとして親に返す**か、`values` にキーを増やしつつ **カテゴリのフィールド定義とは分離**するかの二者択一（下記 D1）。
- `src/features/notebook/components/EntryDialog.tsx:83-96` — `useForm<Record<string, string>>` で全フィールドを扱っている。**timing は `Record<string, string>` の範疇に収まる**（`"always"` / `"posthumous"` は文字列）が、カテゴリ由来の field ループ（`def.fields.map`）からは外れるので、UI とスキーマの追加が独立に必要。
- `src/features/notebook/components/EntryCard.tsx:13,26,40` — **既に `timing` プロパティを受けて `TimingBadge` を描画済み**。本 Issue で **触らない**。DoD「owner で timing を切り替えると即座に色が変わる」は、`useUpdateEntry` の `onMutate` がキャッシュを差分更新した瞬間に自動達成される（`EntryList` が `entry.timing` を EntryCard に流している）。
- `src/features/notebook/components/EntryList.tsx:40-53` — `entry.timing` をそのまま `EntryCard` に流している。**触らない**。
- `src/features/notebook/components/TimingBadge.tsx:1-37` — `variant: "always" | "posthumous"` を受ける完成品。**触らない**。選択 UI の視覚補助として、ラジオの各選択肢の隣に描画するのはあり（D2）。
- `src/features/notebook/components/SectionEntries.tsx:79-96` — **本 Issue で書き換える箇所**。現状 `onSubmit={(values) => update.mutate({ id: editing.id, values })}` のように **timing を渡していない**。EntryDialog の新しい `onSubmit` シグネチャに合わせて `add.mutate({ category, values, timing })` / `update.mutate({ id, values, timing })` に変更する。
- `src/features/notebook/api/useAddEntry.ts:15-19,32-40,60-65` — **既に `timing?: TimingVariant` を受け付けており、未指定時は `"always"` を既定**として POST body に載せている。楽観的追加の `tempEntry` にも `timing` が入る。**触らない**（引数を実際に渡すだけ）。
- `src/features/notebook/api/useAddEntry.ts:14` — `TODO(#24): timing の UI 選択は #24 で追加。当面は "always" を既定にする。` の TODO を本 Issue で解消する（コメントの削除）。
- `src/features/notebook/api/useUpdateEntry.ts:13-17,28-30,45-63` — **既に `timing?: TimingVariant` を受け付けており、onMutate でキャッシュの当該 entry の `timing` を差し替える**。**触らない**（timing を実際に渡すだけ）。
- `src/features/notebook/api/useEntries.ts:12-18` — `NoteEntry.timing: TimingVariant` は既に型に含まれている。API 未実装なので `TODO(#20+)` のまま。**触らない**。
- `src/features/notebook/schema/entry-fields.ts:56-72` — `buildEntrySchema(category)` は `def.fields` からしかスキーマを組み立てない。**timing はカテゴリの field ではないので、ここには入れない**。EntryDialog 内で「カテゴリスキーマ ＋ `timing` フィールド」を **merge** するか、EntryDialog が独自の `timing` 用ミニスキーマを別に持って RHF の複合 form にする（D1 の実装差）。
- `src/features/notebook/schema/entry-fields.ts:76-86` — `buildEntryDefaultValues` は field key しか埋めない。**timing の初期値は EntryDialog 側で別途扱う**（`initial?.timing ?? "always"`、または親から `initialTiming` を明示的に受ける）。
- `src/features/notebook/components/EntryDialog.test.tsx:1-179` — 既存テスト。**timing 選択のケースを追記する**が、既存のバリデーション / sensitive / 編集モードのケースが壊れないよう、既定 timing = "always" で従来と同じ挙動になることを保つ。
- `src/features/auth/api/useMe.ts:7-14` — `AuthRole = "owner" | "family"` は定義済みだが、`role` は optional で「未定義時は owner 扱い（Week 4 #34/#35 で family 判定を導入予定）」。**本 Issue で family 判定の本実装は行わない**（D3 参照）。
- `src/features/notebook/components/SectionForm.tsx:36` — `TODO(role): 家族ロール（family）は編集 UI を出さない。role 判定は別 Issue で` — 既存の同種 TODO。EntryDialog にも同じ姿勢で臨む（本 Issue のスコープは owner 側 UI ＋ 楽観的更新まで）。
- `e2e/notebook-entries.spec.ts:1-50` — 既存 E2E の雛形。`stubApiWithEntries` を流用して、timing 選択のシナリオを 1 本追加する（下記 D5）。
- `e2e/notebook-entry-dialog.spec.ts` — 既存の EntryDialog E2E。timing 選択 UI 追加後も**既存ケースが壊れないこと**（既定 always で保存できること）を確認する。

### 依存関係
- **先に必要（完了済み）**:
  - **#21 W3-01 カテゴリ定数** — `CATEGORIES` / `CategorySlug`。timing はカテゴリ横断の共通属性。
  - **#22 W3-02 EntryDialog** — RHF＋Zod の骨組み。ここに timing 選択を追加する。
  - **#23 W3-03 EntryCard リスト + CRUD** — `useAddEntry` / `useUpdateEntry` の楽観的更新 + `EntryCard` への `timing` 流し込みが完成済み。**本 Issue はその上に UI を差し込むだけ**で挙動が揃う。
- **並行 / 後続**:
  - **#25〜#26 W3-05/06 手紙**（大切な人へ）— 既定 timing が **`posthumous`**。同じ UI パターン（TimingBadge 選択）を流用するので、本 Issue の実装をなるべく再利用しやすい形にする（D2）。
  - **#36 W4-06 家族ロールの閲覧専用モード**（`posthumous` 非可視 / 編集 UI 非描画） — DoD 後半「家族ロール（v1 実装後に切替可能な dev flag）で posthumous レコードが描画されない」の**本実装は #36 側**。本 Issue では **API モック（E2E）で「返さない」ことを担保**する（D3）。
  - **#38 W4-08 E2E: 記入 → 家族招待 → 家族閲覧** — family 側から見えない検証はここに集約される。

## やること

### 前提の意思決定（**要ユーザー確認**）

実装分岐点。合意後に着手する。

- **D1. EntryDialog の onSubmit シグネチャ**（推奨: **案 A**）
  - **案 A（推奨）**: `onSubmit(values: Record<string, string>, timing: TimingVariant)` に **拡張**する。呼び出し側（`SectionEntries`）は `add.mutate({ category, values, timing })` にそのまま流す。**利点**: timing はカテゴリ由来の field ではないので、`values` に混ぜると `buildEntrySchema` / `buildEntryDefaultValues` の意味が濁る。分離した方が「カテゴリのフィールド」と「メタ属性（timing）」が構造的に見分けやすい。**欠点**: 既存 EntryDialog テストの `onSubmit` シグネチャを更新する必要がある（軽微）。
  - 案 B: `onSubmit(values: Record<string, string>)` を維持し、`values.__timing` のような**予約キー**で混ぜる。**利点**: シグネチャ不変（#22 の TODO コメント文言に忠実）。**欠点**: カテゴリスキーマとメタ属性の混在は将来の混乱要因（例：`values` を DB `values` カラムにそのまま突っ込む実装があると事故る）。
  - 補足: #22 の TODO は「`Record<string, string>` のままインターフェースを保つ」と書かれているが、これは #24 で **無理に文字列マップに閉じ込めろ**という強制ではなく、**キーの増減で `useForm` の型が壊れないように**という意図。案 A は「引数を追加」なので趣旨に反しない、と解釈する（要ユーザー最終判断）。
- **D2. timing 選択の UI 形態**（推奨: **案 A**）
  - **案 A（推奨）**: **`RadioGroup`（shadcn/ui）**。各ラジオの右に `TimingBadge` を並べて「意味と色」を同時に見せる。「常時共有：家族がいつでも見られます」「死後開示：解放されるまで家族には見えません」の**説明文**を各選択肢の下に添える（screen_spec の設計思想「意味で色を使う」を UI にも反映）。
  - 案 B: `Select`（プルダウン）。省スペースだが**色バッジと相性が悪い**（プルダウンの中に色を出しにくい）。senior 家族の閲覧者を意識するとラジオの方が読みやすい（CLAUDE.md a11y 前提）。
  - 案 C: セグメントコントロール（トグル）。2 択なら見た目がスッキリするが、shadcn/ui の標準にはなく別部品導入が必要。今回は案 A で十分。
  - **注**: `RadioGroup` が `src/components/ui/` に無ければ shadcn 追加が必要。事前確認する（`ls src/components/ui/`）。
- **D3. 家族ロール DoD の扱い**（推奨: **案 A**）
  - Issue 本文: 「家族ロール時：`posthumous` は API が返さない前提で、フロントに存在しない扱い」／DoD 後半: 「家族ロール（**v1 実装後に切替可能な dev flag**）で `posthumous` レコードが描画されない」。
  - **案 A（推奨・CLAUDE.md 準拠）**: **クライアント側に `posthumous` を隠す/フィルタする実装は書かない**（絶対ルール #8）。本 Issue では、
    1. `useEntries` は API が返した配列をそのまま描画する既存挙動を維持。
    2. **E2E で「API が posthumous を含まない配列を返せば、posthumous のカードは描画されない」ことを検証**（`stubApiWithEntries` で always だけを返し、posthumous を混ぜない）。
    3. 家族ロール判定 / dev flag の本実装は **#36（W4-06）で実施**する旨をコード内 TODO で明記。
  - 案 B: dev flag（`NEXT_PUBLIC_ROLE_OVERRIDE=family` など）で `useEntries` の返り値を **クライアント側でフィルタ**する薄い層を挟む。**CLAUDE.md 絶対ルール #8 に反する**ため却下。
  - 案 C: MSW / Playwright の route モックで family のふりをして E2E だけで担保（案 A の下位互換）。案 A の②に含まれる。
  - **ユーザー判断が要る点**: 「dev flag で切替可能」を本 Issue の DoD として**厳密に**満たすか、#36 に委ねるか。**推奨は #36 に委ね、本 Issue では E2E で「API が返さない → 描画されない」を担保**する。
- **D4. Zod スキーマの構成**（推奨: **案 A**）
  - **案 A（推奨）**: EntryDialog 内で、カテゴリ由来スキーマ（`buildEntrySchema(category)`）とは**別に** `timingSchema = z.enum(["always", "posthumous"])` を保持し、`useForm` の型を `{ values: Record<string, string>; timing: TimingVariant }` にする（**nested form**）。
  - 案 B: `buildEntrySchema` の返り値を `.extend({ __timing: z.enum(["always","posthumous"]) })` する。D1 の案 B と対。
  - 推奨は A（D1 と揃える）。
- **D5. 既定 timing の決定**（推奨: **案 A**）
  - **案 A（推奨）**: `note_entries`（本 Issue）は **既定 `always`**（口座 / 保険 / 不動産 / 借入 / アカウント / 定期購読 / ペット は常時共有が自然）。編集モード（`initial` あり）では **サーバ値をそのまま使う**（`entry.timing`）。
  - 案 B: 「設定 § 公開タイミングの既定」（#28）で選ばれた値を参照する。**#28 は未完了**のため、本 Issue では固定 `always` に留め、#28 完了後にリファクタで参照するようにする（TODO コメント）。
  - `/messages`（大切な人へ）の既定は **`posthumous`**（screen_spec 明記）だが、これは #25/#26 のスコープで、`EntryDialog` は使わない別 UI。本 Issue の共通化対象外。
- **D6. 楽観的更新の確認**（既存の再確認）
  - `useUpdateEntry.onMutate` は既に `input.timing ?? e.timing` で該当 entry を差し替える。**追加コードは不要**。本 Issue のテストで「timing 切替 → キャッシュ即時反映 → EntryCard の色が変わる」を Vitest（integration）または E2E で担保する。
- **D7. 編集モードの初期値**（推奨: **案 A**）
  - **案 A（推奨）**: `SectionEntries` から `editing` を渡す際に **`initialTiming={editing.timing}`** を追加。`EntryDialog` は `initial` と `initialTiming` の 2 つを受ける（`initial` は values 用、`initialTiming` は timing 用）。
  - 案 B: `initial: { values: Record<string,string>; timing: TimingVariant }` に統合。D1 の案 A（onSubmit 分離）と揃えるなら、初期値も分離が対称的で読みやすい。
- **D8. E2E シナリオの追加**（推奨: **案 A**）
  - **案 A（推奨）**: `e2e/notebook-entries.spec.ts` にケースを追加：
    1. **owner: timing = posthumous で追加** → カードが**アンバー＋鍵アイコン**で描画される。
    2. **owner: 既存 entry の timing を always → posthumous に編集** → PATCH に `timing: "posthumous"` が乗る／カードの色が切り替わる（楽観的更新の即時反映）。
    3. **family 前提: API が always のみ返す** → posthumous カードが 1 件も描画されない（D3 案 A の担保）。
  - 案 B: ①②のみを E2E、③は Vitest（`useEntries` のモック）。**Playwright で 1 本あった方が体感テスト**として意味があるため案 A 推奨。
- **D9. TODO コメントの整理**（推奨: **案 A**）
  - **案 A（推奨）**: 本 Issue 完了時点で以下の TODO を**削除**する：
    - `useAddEntry.ts:14` — `TODO(#24): timing の UI 選択は #24 で追加。当面は "always" を既定にする。`
    - `EntryDialog.tsx:51-53` — `TODO(#24): レコード単位の timing 選択 UI は #24 で追加する。...`
  - 家族ロール関連 TODO（`SectionForm.tsx:36` 等）は **#36 のスコープなので残す**。

### タスク

- [ ] **D1〜D9 の意思決定をユーザーと合意**（本 plan を提示して承認を得る）
- [ ] **shadcn/ui `RadioGroup` の有無を確認**、無ければ `npx shadcn@latest add radio-group` で追加（D2）
- [ ] **`src/features/notebook/components/EntryDialog.tsx`** を改修（D1 案 A / D4 案 A / D7 案 A）
  - [ ] props に `initialTiming?: TimingVariant` を追加（既定 `"always"`）
  - [ ] `onSubmit` シグネチャを `(values: Record<string, string>, timing: TimingVariant) => void` に変更
  - [ ] `useForm` の型と defaultValues に `timing` を含める（`{ values, timing }` のネスト or `Record<string, string> & { __timing: ... }`。実装しやすい方を選ぶが、外部 API（onSubmit / initial）は上記に固定）
  - [ ] Zod スキーマに timing の enum を混ぜる（D4）
  - [ ] `RadioGroup` を DialogContent に追加（section: 「公開タイミング」）
    - `RadioGroupItem value="always"` の隣に `<TimingBadge variant="always" />` と説明文
    - `RadioGroupItem value="posthumous"` の隣に `<TimingBadge variant="posthumous" />` と説明文
  - [ ] `TODO(#24)` コメントを削除
- [ ] **`src/features/notebook/components/SectionEntries.tsx`** の onSubmit 差し替え
  - [ ] `<EntryDialog ... initial={editing?.values} initialTiming={editing?.timing} onSubmit={(values, timing) => editing ? update.mutate({ id: editing.id, values, timing }) : add.mutate({ category: activeCategory, values, timing })} />`
- [ ] **`src/features/notebook/api/useAddEntry.ts`** の TODO 削除
  - [ ] `TODO(#24)` コメント（14 行目）を削除
  - [ ] コード自体は無変更（既に `timing` を受け付けている）
- [ ] **`src/features/notebook/api/useUpdateEntry.ts`** — 追加変更なし（既に `timing` を受け付けている）
- [ ] **Vitest（ユニット）**
  - [ ] `EntryDialog.test.tsx` に追加ケース:
    - [ ] 既定 timing が `"always"` で、`TimingBadge` の「常時共有」が選択済み表示（`aria-checked` or `data-state`）
    - [ ] `initialTiming="posthumous"` を渡すと「死後開示」が選択済み表示
    - [ ] posthumous ラジオをクリック → 保存 → `onSubmit(values, "posthumous")` が呼ばれる
    - [ ] 既存の全カテゴリ / sensitive / 編集モード / キャンセルのテストが **既定 timing で従来通り動く**（回帰確認）
  - [ ] `SectionEntries` に統合テストがあれば、`update.mutate` の呼び出し引数に `timing` が乗ることを確認（軽く 1 本）
- [ ] **E2E（`e2e/notebook-entries.spec.ts` 追記）** — D8 案 A
  - [ ] **シナリオ A: 追加時に posthumous を選ぶと、アンバー＋鍵バッジのカードが描画される**
    - `/notebook/money` → 「銀行口座 を追加」→ 銀行名入力 → 「死後開示」ラジオ選択 → 保存 → カードの `TimingBadge` が `bg-timing-posthumous` を持つ／`svg`（鍵）が入っている
  - [ ] **シナリオ B: 既存 entry の timing を always → posthumous に編集（楽観的更新の即時反映）**
    - GET モックで always の entry を返す → 編集 → 「死後開示」を選ぶ → 保存 → **PATCH リクエストの body に `timing: "posthumous"` が含まれる**（`page.waitForRequest`）／カードのバッジ色が切り替わる
  - [ ] **シナリオ C: family 想定（API が always のみ返す）→ posthumous カードは 1 件も描画されない**
    - GET モックで always のみの配列を返す（＝バックが family 向けにフィルタしている想定）→ ページ上に `bg-timing-posthumous` を持つ要素が 0 件
- [ ] **既存 E2E の点検**
  - [ ] `notebook-entry-dialog.spec.ts` の「保存が呼ばれる」系ケースが、既定 timing = always で従来と同じ挙動を保つ
  - [ ] `notebook-entries.spec.ts` の #23 由来ケース（追加成功 / ロールバック / 削除 …）が既定 timing で通ることを確認

### 実装スケルトン（草案）

```tsx
// src/features/notebook/components/EntryDialog.tsx（差分の要点）
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { z } from "zod";
import type { TimingVariant } from "./TimingBadge";
import { TimingBadge } from "./TimingBadge";

const timingSchema = z.enum(["always", "posthumous"]);

export type EntryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategorySlug;
  initial?: Record<string, string>;
  initialTiming?: TimingVariant;                        // ← 追加
  onSubmit: (
    values: Record<string, string>,
    timing: TimingVariant,                              // ← 追加
  ) => void;
  sensitive?: boolean;
  mode?: EntryDialogMode;
};

export function EntryDialog({
  open, onOpenChange, category,
  initial, initialTiming = "always",
  onSubmit, sensitive, mode = "create",
}: EntryDialogProps) {
  const def = CATEGORIES[category];

  // カテゴリスキーマ + timing を merge。ネスト形にして values と timing を分離。
  const formSchema = useMemo(
    () =>
      z.object({
        values: buildEntrySchema(category),
        timing: timingSchema,
      }),
    [category],
  );
  const defaults = useMemo(
    () => ({
      values: buildEntryDefaultValues(category, initial),
      timing: initialTiming,
    }),
    [category, initial, initialTiming],
  );

  const form = useForm<{ values: Record<string, string>; timing: TimingVariant }>({
    resolver: zodResolver(formSchema),
    defaultValues: defaults,
    mode: "onChange",
  });

  useEffect(() => {
    if (open) form.reset(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category, initial, initialTiming]);

  const handle = form.handleSubmit((data) => {
    onSubmit(data.values, data.timing);
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {/* ... 既存 ヘッダ / sensitive notice ... */}
        <Form {...form}>
          <form noValidate onSubmit={handle} className="...">
            {def.fields.map((f) => (
              <FormField
                key={f.key}
                control={form.control}
                name={`values.${f.key}` as const}
                render={/* 既存と同じ */}
              />
            ))}

            {/* ↓ 追加: 公開タイミング */}
            <FormField
              control={form.control}
              name="timing"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>公開タイミング</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex flex-col gap-3"
                    >
                      <label className="flex items-start gap-3">
                        <RadioGroupItem value="always" />
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <TimingBadge variant="always" />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            家族がいつでも見られます。
                          </p>
                        </div>
                      </label>
                      <label className="flex items-start gap-3">
                        <RadioGroupItem value="posthumous" />
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <TimingBadge variant="posthumous" />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            解放されるまで家族には見えません。
                          </p>
                        </div>
                      </label>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        {/* ... 既存 フッタ ... */}
      </DialogContent>
    </Dialog>
  );
}
```

```tsx
// src/features/notebook/components/SectionEntries.tsx（差分の要点）
<EntryDialog
  open={dialogOpen}
  onOpenChange={(open) => { if (!open) closeDialog(); }}
  category={activeCategory}
  sensitive={sensitive}
  mode={editing ? "edit" : "create"}
  initial={editing?.values}
  initialTiming={editing?.timing}                                  // ← 追加
  onSubmit={(values, timing) => {                                  // ← 引数追加
    if (editing) {
      update.mutate({ id: editing.id, values, timing });           // ← timing 追加
    } else {
      add.mutate({ category: activeCategory, values, timing });    // ← timing 追加
    }
  }}
/>
```

## 完了条件（DoD）

Issue の DoD を転記:
- [ ] owner で timing を切り替えると即座に色が変わる（**楽観的更新**：`useUpdateEntry.onMutate` によりキャッシュが差分更新され、`EntryCard` の `TimingBadge` が即座に切り替わる）
- [ ] 家族ロール（v1 実装後に切替可能な dev flag）で `posthumous` レコードが描画されない
  - 本 Issue のスコープ: **API モック（E2E）で「API が返さないと描画されない」ことを担保**
  - dev flag / role 判定の本実装は **#36 W4-06** に委ねる（D3 案 A）
- [ ] Issue の作業内容チェックリスト:
  - [ ] EntryDialog の timing 選択（`always` / `posthumous`）
  - [ ] EntryCard に `TimingBadge` を差し込み（**#23 で既に完了、本 Issue では回帰確認のみ**）
  - [ ] 更新は `useUpdateEntry` にマージ（**hook は既に対応済み、SectionEntries で timing を渡す**）
  - [ ] 家族ロール時：`posthumous` は API が返さない前提で、フロントに存在しない扱い

## リスク / 確認事項

- **D1（onSubmit シグネチャ変更）**: #22 の TODO コメント文言「`Record<string, string>` のままインターフェースを保つ」との整合。**推奨は案 A（引数追加）** だが、案 B（`__timing` 予約キー）を希望する場合は要指示。
- **D3（家族ロール DoD）**: DoD 後半「dev flag で切替可能」を本 Issue で**厳密に**満たすかどうか。**推奨は #36 に委ね、E2E で「API が返さない → 描画されない」を担保**する。dev flag を今回実装する場合は「クライアント側フィルタは書かない」制約と両立する道筋を要相談（例：`useEntries` の queryFn 側で dev flag 時にモックレスポンスを返す、など）。
- **D2（RadioGroup 追加）**: `src/components/ui/radio-group.tsx` の有無を実装着手時に確認。無ければ shadcn 追加コマンドを走らせる（package.json 差分が発生）。
- **カテゴリ横断の一貫性**: `/messages`（#25/#26）でも同種の timing 選択 UI が必要。本 Issue の実装が再利用しやすい形（例：将来 `TimingSelector` として切り出す）になっているとよい。ただし**現時点で共通化しない**（3 箇所以上に増えた時点で抽出、CLAUDE.md「三つ揃ってから抽象化」原則）。
- **編集モードでの timing のロールバック**: `useUpdateEntry.onError` は `previous` に戻すため、失敗時は timing も自動的に戻る。**動作は既に担保済み**だが、E2E でテストしておくと安心（Playwright の 500 モック 1 本追加）。
- **バック（`kotozute-api`）の PATCH 契約**: 現時点で `note-entries` の PATCH は OpenAPI 未定義。`timing` を送っても受け止められない可能性がある。**フロント先行で送る前提**（#23 と同じスタンス）、`TODO(#20+)` の再生成時に整合をとる。

## 参照
- `CLAUDE.md` 絶対ルール #6 / #8
- `docs/frontend_design.md` §状態管理 / §UI・デザイン実装
- `docs/screen_spec.md` §共通仕様（ロールによる出し分け）／§2 セクション編集（リスト項目）
- `docs/issues/23/plan.md`（#23 の設計を継承）
