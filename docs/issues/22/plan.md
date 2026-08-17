# Issue #22 — W3-02 [F-05] EntryDialog（RHF+Zod・カテゴリ別項目切替・機微情報の注意文）

- URL: https://github.com/hasedai0000/kotozute-web/issues/22
- ラベル: frontend, week-3
- マイルストーン: MVP-Week3

## Issue 概要
リスト項目（口座・保険・不動産・借入・アカウント・定期購読・ペット）の**追加・編集を 1 つのダイアログ**で行う `EntryDialog` を作る。カテゴリを props で受け、#21 で用意した `CATEGORIES` と `buildEntrySchema` から**フィールドを動的生成**し、RHF + Zod で検証する。money / digital 系カテゴリでは**赤い注意カード**（暗証番号を書かない）を出す。**このダイアログ内で送信は行わず**、`onSubmit(values)` として親（#23 のリスト側）にバリデーション済みの値を渡す純粋なフォーム UI として実装する。

## 調査結果

### 関連ドキュメント
- `CLAUDE.md` 絶対ルール — 「1. features 単位で割る」→ `src/features/notebook/components/` に閉じる。「5. デザイントークンを使う」→ 注意カードは Tailwind theme 色（`bg-timing-posthumous/20` など）を使い、直値カラーを書かない。
- `CLAUDE.md` セキュリティ — 「パスワード・暗証番号・マイナンバー番号は入力させない」。EntryDialog は #21 の `buildEntrySchema` に閉じるので**構造上フィールドが作れない**が、UI 側で **money / digital 系での注意カード**を追加で見せる。
- `docs/screen_spec.md` §2「セクション編集」→「リスト項目」— 追加／編集は**ダイアログ**（React Hook Form ＋ Zod）。カテゴリごとに項目定義。**公開タイミングはレコード単位で選択**（常時共有／死後開示）。
- `docs/screen_spec.md` §2「バリデーション（Zod）」— 必須未入力：「◯◯を入力してください」、「口座番号は下 4 桁のみ」、「該当しそうな入力には注意文を表示」。
- `docs/screen_spec.md` §共通仕様「状態の出し分け」— 保存中は楽観的更新で即時反映、失敗時ロールバック＋トースト。**ただし保存の実装（mutation）は #23 の責務**。本 Issue は「submit 時に親へ値を渡す」までを担う。
- `docs/frontend_design.md` §状態管理 — 「画面ローカル（モーダル開閉・ステップ）」は `useState`。**モーダル開閉状態は EntryDialog 側で持たず、親側（#23）で open/onOpenChange を制御する**方針とする（`Dialog` の制御コンポーネント方式）。
- `docs/frontend_design.md` §UI・デザイン実装 — アクセシビリティ（キーボード操作、フォーカスリング、`Escape` で閉じる、`aria-*`）。base-ui の `Dialog` は既定でこれらを担保する。

### 関連コード
- `src/features/notebook/constants/categories.ts:1-336` — **本 Issue の入力元**。`CATEGORIES[slug]` の `fields` を回して `FormField` を組む。`kind: 'text' | 'textarea' | 'select' | 'digits4'` の 4 種類を分岐。
- `src/features/notebook/schema/entry-fields.ts:1-87` — **本 Issue の入力元**。`buildEntrySchema(category)` を `zodResolver` に、`buildEntryDefaultValues(category, initial?)` を `useForm.defaultValues` に流す。
- `src/features/notebook/components/SectionForm.tsx:88-172` — **参考にする RHF + Zod の実装パターン**。`useForm({ resolver: zodResolver(schema), defaultValues, mode: 'onChange' })`、`Form / FormField / FormControl / FormLabel / FormMessage / FormDescription`、`kind` に応じて `Textarea / Input` を出し分け。本 Issue は同じパターンで `select / digits4` を追加。**ただし SectionForm は自動保存（debounce）**であり、EntryDialog は**明示的な送信ボタン**（キャンセル／保存）で完了する点が異なる。
- `src/features/notebook/components/SectionSensitiveNotice.tsx:1-28` — **注意カードの既存実装**。`bg-timing-posthumous/20` の色を使う `role="note"` のカード。**このコンポーネントを EntryDialog でもそのまま再利用**する（新規作成しない）。money / digital 判定は `SECTIONS[section].sensitive` があるが、EntryDialog は section を受けないため**category → sensitive の対応を categories.ts 側で表現するか、EntryDialog の props に `sensitive?: boolean` を追加して親から渡す**（D2 参照）。
- `src/features/notebook/components/EntryCard.tsx:1-77` — **本 Issue では触らない**。EntryCard の title / meta / timing への値の流し込みは #23 の責務。
- `src/features/notebook/components/TimingBadge.tsx:1-37` — **本 Issue では触らない**。`timing` 選択の UI（ラジオ or セグメント）は #24 の責務（D3 参照）。本 Issue は timing フィールドを**含めない**か、**含めるが親に委譲する**かは D3。
- `src/components/ui/dialog.tsx:1-160` — base-ui ベースの `Dialog`。`Dialog / DialogContent / DialogHeader / DialogTitle / DialogDescription / DialogFooter / DialogClose` を使う。`open` / `onOpenChange` の制御コンポーネント方式。
- `src/components/ui/form.tsx` — shadcn/ui の RHF ラッパ。`Form / FormField / FormItem / FormLabel / FormControl / FormMessage / FormDescription`。
- `src/components/ui/select.tsx` — base-ui ベースの `Select / SelectTrigger / SelectContent / SelectItem / SelectValue`。`kind: 'select'` はこれで実装。
- `src/components/ui/input.tsx` / `src/components/ui/textarea.tsx` — `kind: 'text' / 'digits4' / 'textarea'` はこれで実装（`digits4` は `inputMode="numeric"` + `maxLength={4}` を付ける）。
- `e2e/notebook-section.spec.ts:81-174` — **本 Issue の E2E DoD 実装の雛形**。`stubApi` / `setSessionCookie` / `page.route(FIELDS_URL_RE, ...)` の書き方をそのまま踏襲する。**ただし `note_entries` のエンドポイントは OpenAPI に未定義**（D4 参照）。

### 依存関係
- **先に必要（完了済み）**:
  - **#21 W3-01 カテゴリ定数** — `CATEGORIES / CategorySlug / buildEntrySchema / buildEntryDefaultValues` を本 Issue で消費する。
- **並行 / 後続（本 Issue の消費者・関係する後続）**:
  - **#23 W3-03 EntryCard リスト + CRUD** — 本 Issue の EntryDialog を **`open / onOpenChange` 制御**でマウントし、`onSubmit(values)` を **`useAddEntry` / `useUpdateEntry`** に橋渡しする。本 Issue の submit 内で mutation を呼ばない設計とすることで、#23 の楽観的更新／ロールバック実装との責務分離が保てる。
  - **#24 W3-04 TimingBadge レコード単位選択** — timing の**選択 UI**をどこに置くかで衝突する（Issue #22 の作業内容にも「公開タイミングを選択」とあり、Issue #24 の作業内容にも「EntryDialog の timing 選択」とある）。**D3 で切り分けを決める**。

## やること

### 前提の意思決定（**要ユーザー確認**）

実装分岐点。合意後に着手する。

- **D1. `EntryDialog` は「送信担当」か「値渡し担当」か**（推奨: **案 B**）
  - 案 A: `EntryDialog` 内で `useAddEntry / useUpdateEntry` を呼び、成功／失敗のトースト・close も担う。**#23 の楽観的更新の実装と衝突しやすい**（キャッシュ差分・ロールバックの主権が曖昧になる）。
  - **案 B（推奨）**: `EntryDialog` は**純粋なフォーム UI**。`onSubmit(values)` を props で受け、親（#23）が mutation・トースト・close を制御する。責務分離が明確で、単体テスト（Vitest）も submit の値を検証するだけで済む。**Issue #22 の DoD（開閉できる／必須未入力でエラー／Playwright で 1 件追加）は案 B でも満たせる**（親から最小の stub を渡した薄いホスト画面 or #23 が実装された後の統合で E2E を書く）。
- **D2. `sensitive` 判定の出し所**（推奨: **案 A**）
  - **案 A（推奨）**: `EntryDialog` の props に `sensitive?: boolean` を持たせ、**親（`/notebook/[section]` 側の #23 の実装）が `SECTIONS[section].sensitive` を渡す**。categories.ts に `sensitive` フラグを増やす必要がなく、既存の section 定義と一貫する。
  - 案 B: `categories.ts` に `sensitive: boolean` を追加し、`CATEGORIES[category].sensitive` を EntryDialog 内で判定。**#21 の定数に責務が増える**（本来 section 側の属性）。
- **D3. `timing` 選択を本 Issue に含めるか**（推奨: **案 B**）
  - 案 A: 本 Issue の `EntryDialog` に `timing: 'always' | 'posthumous'` のラジオ or セグメント選択を含め、`onSubmit(values, timing)` で親に渡す。**#24 が「差し込み・EntryCard 反映」だけになり、#22 の DoD「公開タイミングを選択」を完結できる**。
  - **案 B（推奨）**: 本 Issue は**カテゴリ固有フィールドだけ**を扱い、`timing` 選択の UI は #24 で追加する（既に Issue #24 の作業内容に「EntryDialog の timing 選択」と明記されているため、責務は #24）。**#22 の作業内容にある「公開タイミングを選択」は、`onSubmit` の値に `timing` を含める配線ポイント（受け皿）だけを用意する**（`values.timing` を親に渡せるインターフェースにしておき、実 UI は #24 で足す）。
  - **選択のポイント**: Issue #22 と Issue #24 の両方に「timing 選択」がある。**先に #22 を実装しつつ、UI 自体は #24 に寄せる**のが差分が小さい。**ユーザー判断**。
- **D4. E2E（Playwright）の書き方**（推奨: **案 A**）
  - **案 A（推奨）**: **#23 の実装（EntryCard 一覧 + `useAddEntry`）を待たず**、`/notebook/money` に「追加」ボタン + EntryDialog を**先に小さく mount**して E2E を書く。`useAddEntry` の代わりに **`onSubmit` を stub**（テスト用に画面上に受け取った値を出すだけの薄い state）で済ませ、「ダイアログ開閉」「必須未入力エラー表示」「値を入力すると submit まで到達」を確認する。→ #23 実装時に本物の mutation に差し替える。
  - 案 B: **#23 の実装が入ってから E2E を書く**（本 Issue では Vitest のみ）。Issue #22 の DoD「Playwright で 1 件の追加成功シナリオ」を **#22 では未達**にする。**Issue の DoD を満たせない**ので却下寄りだが、順序を入れ替えたい場合はユーザー判断。
- **D5. `digits4` の実装方針**（推奨: **案 A**）
  - **案 A（推奨）**: `Input type="text"` + `inputMode="numeric"` + `pattern="\d{4}"` + `maxLength={4}`。Zod 側で `regex(/^\d{4}$/)` を持つので二重にロックされる。iOS のテンキーが出やすい。
  - 案 B: `Input type="number"`。**先頭 0 が消える／spinner が出る**などの UX 問題があるため却下寄り。
- **D6. `select` 未選択時の初期値**（推奨: **案 A**）
  - **案 A（推奨）**: `defaultValues` は `""`（空文字）。`buildEntrySchema` 側で `z.union([z.literal(""), z.enum(...)])` にしてある（#21 の実装済み）。**任意選択は空のまま送信可**。
  - 案 B: 先頭 option を既定にする。ユーザーが誤って先頭値を送ってしまう恐れがあるため却下寄り。

### タスク

- [ ] `src/features/notebook/components/EntryDialog.tsx` を新規作成
  - [ ] props: `open: boolean` / `onOpenChange: (open: boolean) => void` / `category: CategorySlug` / `initial?: Record<string, string>`（編集時のみ）/ `onSubmit: (values: Record<string, string>) => void` / `sensitive?: boolean`（D2）/ `mode?: 'create' | 'edit'`（タイトル切替のみ）
  - [ ] `Dialog` / `DialogContent` / `DialogHeader` / `DialogTitle`（`{CATEGORIES[category].label} を{追加 | 編集}`）
  - [ ] `sensitive` が true のとき `<SectionSensitiveNotice />` を DialogContent 内の上部に配置
  - [ ] `useForm({ resolver: zodResolver(buildEntrySchema(category)), defaultValues: buildEntryDefaultValues(category, initial), mode: 'onChange' })`
  - [ ] `CATEGORIES[category].fields` を map して `FormField` を組む
    - [ ] `kind: 'text' | 'digits4'` → `<Input>`（`digits4` は `inputMode="numeric"` / `pattern="\d{4}"` / `maxLength={4}`）
    - [ ] `kind: 'textarea'` → `<Textarea>`
    - [ ] `kind: 'select'` → `<Select>`（options を `SelectItem` に流す。プレースホルダは「選択してください」）
    - [ ] `required` の場合、`FormLabel` に `<span aria-hidden="true"> *</span>` を付ける（screen_spec の「◯◯を入力してください」は Zod のエラー文が担う）
    - [ ] `helperText` があれば `<FormDescription>`
    - [ ] `<FormMessage>` でエラー表示
  - [ ] `DialogFooter` に **キャンセル**（`DialogClose`）と **保存**（submit）ボタン
  - [ ] `handleSubmit(values => { onSubmit(values); onOpenChange(false); form.reset(...); })`
  - [ ] `open` が false → true になったタイミングで `form.reset(buildEntryDefaultValues(category, initial))` を呼び、**再オープン時に前回値が残らない**ようにする
  - [ ] a11y: `DialogTitle` を明示、`DialogDescription` に「◯◯カテゴリの項目を入力します」など短い説明
- [ ] `src/features/notebook/components/EntryDialog.test.tsx`（Vitest / RTL）
  - [ ] **DoD 直結**: 全 7 カテゴリを `describe.each` で回し、`open=true` にしてダイアログが破綻せず開けることを検証（`getByRole('dialog')`）
  - [ ] 必須未入力で「保存」を押すと `onSubmit` が呼ばれず、`FormMessage` に「◯◯を入力してください」が出る（`bank_account` で `bank_name` 必須）
  - [ ] `bank_account.last4` に `"12345"` を入れると「半角数字 4 桁で入力してください」が出る（#21 の Zod と整合）
  - [ ] `bank_account.account_type` の `Select` から「普通」を選んで submit すると `onSubmit` の引数に `account_type: 'futsu'` が含まれる
  - [ ] `sensitive=true` を渡すと `role="note"` の注意カードが表示される。false なら表示されない
  - [ ] `initial` を渡した場合、既存値が入力に反映される（編集モード）
  - [ ] `open=false` → `true` の再オープン時にフォームがリセットされる（前回値が残らない）
  - [ ] キャンセルボタン押下で `onOpenChange(false)` が呼ばれ、`onSubmit` が呼ばれない
- [ ] E2E（`e2e/notebook-entry-dialog.spec.ts` を新規作成）※ D4 案 A
  - [ ] `stubApi` / `setSessionCookie` を `notebook-section.spec.ts` から流用（もしくは共通 helper 化は後続 issue で）
  - [ ] `/notebook/money` に到達し、「追加」ボタンを押す → ダイアログが開く（`getByRole('dialog')`）
  - [ ] `role="note"` の注意カード（`/暗証番号/`）が表示される
  - [ ] 必須「銀行名」を空のまま「保存」→ エラーが表示され、`onSubmit` に相当する API コール（あるいは stub 経由の視認可能な確認）が発生しない
  - [ ] 「銀行名」に入力して「保存」→ ダイアログが閉じ、値が親側で受け取られている（**#23 未実装時は EntryDialog を薄くホストするテスト用ページ／Playwright 内で描画 or `onSubmit` 相当の UI 反映を stub する**）
  - [ ] **注意**: `/notebook/money` から追加ボタンを描画するには「追加」ボタンを一時的に page.tsx に置く必要がある。**#23 で本格実装するので、本 Issue では EntryDialog を露出するための最小限の追加ボタン**を `/notebook/[section]` に置くか、**専用の dev-only ページ**を切って E2E を書くかを D4 の確定時に決める（推奨: **`/notebook/[section]` に最小の「追加」ボタン + ローカル state で開閉のみ**。#23 で `useAddEntry` に差し替える）。

### 実装スケルトン（草案）

```tsx
// src/features/notebook/components/EntryDialog.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import {
  Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormDescription, FormField, FormItem,
  FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { CATEGORIES, type CategorySlug } from "../constants/categories";
import { buildEntrySchema, buildEntryDefaultValues } from "../schema/entry-fields";

import { SectionSensitiveNotice } from "./SectionSensitiveNotice";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategorySlug;
  initial?: Record<string, string>;
  onSubmit: (values: Record<string, string>) => void;
  sensitive?: boolean;
  mode?: "create" | "edit";
};

export function EntryDialog({ open, onOpenChange, category, initial, onSubmit, sensitive, mode = "create" }: Props) {
  const def = CATEGORIES[category];
  const form = useForm<Record<string, string>>({
    resolver: zodResolver(buildEntrySchema(category)),
    defaultValues: buildEntryDefaultValues(category, initial),
    mode: "onChange",
  });

  // 再オープン時に前回値をリセット。initial が変わったら追随。
  useEffect(() => {
    if (open) form.reset(buildEntryDefaultValues(category, initial));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category]);

  const handle = form.handleSubmit((values) => {
    onSubmit(values);
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{def.label} を{mode === "edit" ? "編集" : "追加"}</DialogTitle>
          <DialogDescription>{def.label}の項目を入力します。</DialogDescription>
        </DialogHeader>
        {sensitive ? <SectionSensitiveNotice /> : null}
        <Form {...form}>
          <form noValidate onSubmit={handle} className="flex flex-col gap-4">
            {def.fields.map((f) => (
              <FormField key={f.key} control={form.control} name={f.key}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {f.label}
                      {f.required ? <span aria-hidden="true"> *</span> : null}
                    </FormLabel>
                    <FormControl>
                      {f.kind === "textarea" ? (
                        <Textarea rows={3} maxLength={f.maxLength} placeholder={f.placeholder} {...field} />
                      ) : f.kind === "select" ? (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue placeholder="選択してください" /></SelectTrigger>
                          <SelectContent>
                            {(f.options ?? []).map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : f.kind === "digits4" ? (
                        <Input inputMode="numeric" pattern="\d{4}" maxLength={4} {...field} />
                      ) : (
                        <Input maxLength={f.maxLength} placeholder={f.placeholder} {...field} />
                      )}
                    </FormControl>
                    {f.helperText ? <FormDescription>{f.helperText}</FormDescription> : null}
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <DialogFooter>
              <DialogClose render={<Button variant="outline">キャンセル</Button>} />
              <Button type="submit">保存</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

## 完了条件（DoD）

Issue の DoD を転記:

- [ ] **全 7 カテゴリでダイアログが破綻せず開閉できる**（Vitest の `describe.each` でロック）
- [ ] **必須未入力でエラー表示**（`bank_account.bank_name` を空で保存 → 「銀行名を入力してください」）
- [ ] **Playwright で 1 件の追加成功シナリオ**（D4 の確定に応じて `/notebook/money` から stub 経由で追加できる）
- [ ] `npm run typecheck` / `npm run lint` / `npm run test` / `npm run test:e2e` が緑

## リスク / 確認事項

- **timing 選択の責務分割（D3）**: Issue #22 と #24 の作業内容が重なるので、**どちらの Issue に UI を寄せるか**をユーザー判断で確定したい（推奨: #24 に UI を寄せ、#22 では `onSubmit` の値に timing を含める配線だけ）。
- **保存の主体（D1）**: `useAddEntry` を EntryDialog に含めない設計（推奨）とする場合、Issue #22 の作業内容「公開タイミングを選択」に**「保存 → API」までを含めない**ことになる。**Issue の意図として OK か**を確認したい。#23 との責務分離を優先するため推奨する。
- **E2E の実装場所（D4）**: `#23` で本格実装される「追加」ボタンより先に EntryDialog を露出するため、**`/notebook/[section]` に最小の「追加」ボタン**を暫定で入れるか、**dev-only の露出ページ**を作るかを判断したい（推奨: 前者 + `useState` によるローカル管理。#23 で mutation に差し替え）。
- **`sensitive` フラグの伝播（D2）**: EntryDialog の props に `sensitive?: boolean` を追加する場合、**呼び出し側（#23）が `SECTIONS[section].sensitive` を渡す**責務を負う。**#23 の計画時に忘れずに渡す**ことを申し合わせる必要あり。
- **openapi**: `note_entries` の GET / POST / PATCH / DELETE エンドポイントは未定義。**本 Issue は「submit 時に onSubmit を親に渡す」までなので API 依存なし**。#23 で `useAddEntry` を実装する際に、`useNoteFields` と同様の `apiFetch` フォールバック（404 → 空）が必要になる可能性あり。
- **アクセシビリティ**: `Dialog` は base-ui が focus trap / Escape / aria を担うが、**「必須マーク」の `<span aria-hidden="true"> *</span>`** はスクリーンリーダーで読ませないため、Zod のエラー文が唯一の必須表現になる。**視覚的な * だけで「必須」が伝わるか**は a11y 検証（Issue #37 W4-07）で最終確認する。
- **文字数上限の視覚的表示**: `maxLength` を HTML で制限しているが、**カウンター表示（例: 8/60）**は本 Issue のスコープ外（DoD にない）。ユーザー要望があれば追加。

## 参照

- `CLAUDE.md`（絶対ルール・セキュリティ・アクセシビリティ）
- `docs/frontend_design.md`（§状態管理・§UI・デザイン実装）
- `docs/screen_spec.md` §2「セクション編集」→「リスト項目」「バリデーション」
- `docs/issues/21/plan.md`（`CATEGORIES / buildEntrySchema` の設計思想）
- `src/features/notebook/constants/categories.ts`（本 Issue の入力元）
- `src/features/notebook/schema/entry-fields.ts`（本 Issue の入力元）
- `src/features/notebook/components/SectionForm.tsx`（RHF + Zod の実装参考）
- `src/features/notebook/components/SectionSensitiveNotice.tsx`（注意カードの再利用元）
- `src/components/ui/dialog.tsx` / `form.tsx` / `select.tsx` / `input.tsx` / `textarea.tsx`
- `e2e/notebook-section.spec.ts`（Playwright スタブの実装雛形）
