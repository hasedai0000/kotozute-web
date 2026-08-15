# Issue #21 — W3-01 [F-05] カテゴリ定数（bank_account / insurance / property / loan / account / subscription / pet）

- URL: https://github.com/hasedai0000/kotozute-web/issues/21
- ラベル: frontend, week-3
- マイルストーン: MVP-Week3

## Issue 概要
リスト項目（口座・保険・不動産・借入・アカウント・定期購読・ペット）の**項目定義を 1 か所に集約**し、Zod スキーマ生成ヘルパ `buildEntrySchema(category)` と、**「口座番号は下 4 桁のみ」という制約を型で表す**仕組みを整える。EntryDialog（#22）や EntryCard リスト（#23）から `import` できる形にする。パスワード・暗証番号・マイナンバー入力欄が**構造上存在しないこと**を Vitest で恒久的にロックする。

## 調査結果

### 関連ドキュメント
- `CLAUDE.md` 絶対ルール — 「1. features 単位で割る」→ `src/features/notebook/constants/` と `src/features/notebook/schema/` に閉じる。「5. デザイントークンを使う」→ 定数値に直値カラーを混ぜない。
- `CLAUDE.md` セキュリティ — **「パスワード・暗証番号・マイナンバー番号は入力させない（在りかのみ記録）」**。カテゴリ定義でこれらの key を絶対に持てないよう `assertNoSensitiveKey` を再利用する。
- `docs/screen_spec.md` §2「セクション編集」→「カテゴリ別の項目（例）」— **本 Issue の項目定義の一次情報**。ここのテーブルを型に落とす。
  - bank_account: 銀行名※必須 / 支店 / 種別 / 口座下 4 桁 / メモ
  - insurance: 保険会社※必須 / 種類 / 証券番号 / 連絡先
  - property: 所在地※必須 / 種別 / 権利証の保管場所
  - loan: 借入先※必須 / 種類 / 残高目安 / 連絡先
  - account: サービス名※必須 / ID / 死後の希望（削除・残す・追悼）
  - subscription: サービス名※必須 / 料金 / 解約方法
  - pet: 名前※必須 / 種類 / 動物病院 / 世話の方法 / 託したい人
- `docs/screen_spec.md` §2「バリデーション（Zod）」— 必須項目のエラー文言、文字数（短文 100 字 / メモ 1000 字程度）、**「口座番号は下 4 桁のみ。フル桁・暗証番号・パスワード・マイナンバーの入力欄は作らない」**。
- `docs/screen_spec.md` §2「該当しそうな入力には注意文を表示」— money/digital カテゴリで helperText に「暗証番号は入力しないでください」等を出す。
- `docs/frontend_design.md` §状態管理 — フォームは RHF + Zod。**Zod は本 Issue で生成、RHF での消費は #22**。
- `docs/frontend_design.md` §「UI・デザイン実装」 — 「複数登録できる項目は `EntryCard` のリスト＋『追加』ボタンで統一」。カテゴリ定数は EntryDialog（#22）・EntryCard（#23）双方の一次情報になる。

### 関連コード
- `src/features/notebook/constants/sections.ts:1-84` — `SectionDefinition.entryCategories: readonly string[]` を各セクションに定義済み（money = `bank_account/insurance/property/loan`、digital = `account/subscription`、pet = `pet`）。**この 7 個の文字列 = 本 Issue で定義する `CategorySlug` の全集合**。**型を `readonly CategorySlug[]` に強めるかは要判断**（D6 参照）。
- `src/features/notebook/constants/sections.ts:6-30` — 既存の `FieldDefinition`（`kind: 'text' | 'textarea' | 'date'`、`maxLength / placeholder / note`）。**単一項目（`note_fields`）用に最適化**されており、カテゴリ用に `required` や `select` 系がない。**カテゴリ用は別型として新設する（D1）**。
- `src/features/notebook/schema/section-fields.ts:1-86` — **`assertNoSensitiveKey` / `FORBIDDEN_KEYS` / `buildSectionFieldsSchema` / `buildDefaultValues` の実装パターン**。カテゴリ用ヘルパも**同じ流儀 + 同じ FORBIDDEN リスト**で書き、テストも同じ流儀で書く。
- `src/features/notebook/schema/section-fields.ts:7-21` — `FORBIDDEN_KEYS`（`password/pass/passwd/pin/pincode/cvv/cvc/mynumber/my_number/social_security/credit_card/card_number/secret`）。**カテゴリ側でも同一リストを共有**する（後述 D2）。
- `src/features/notebook/hooks/useSectionProgress.ts:24-32` — `def.entryCategories` を `entryCountByCategory` で参照。**現状は `string` 参照のみ**。`CategorySlug` に型付けしても壊れない（互換）。
- `src/features/notebook/components/EntryCard.tsx:1-77` — カテゴリ非依存の汎用カード（`title / meta / timing`）。**本 Issue では触らない**。カテゴリからの表示ラベル解決（例: 銀行名を `title` に流す）は #23 で行う。
- `src/features/notebook/constants/sections.test.ts:34-37` — 「sensitive は money/digital に限定」をロック。カテゴリ側に **money/digital 属性を伝搬**する場合は、そのテストと矛盾しないよう注意（D5）。
- `src/features/auth/schema/login.ts`（推定 / RHF + Zod 使用例）— `zodResolver` + `defaultValues` の消費は #22 で確認。
- **openapi**: `openapi/openapi.dummy.json` に `note_entries` 系エンドポイントは未定義。**本 Issue はフロントの定数・スキーマだけで完結**するのでバック非依存で進められる。

### 依存関係
- 先に必要（**完了済み**）:
  - **#16 W2-04** — `SECTIONS.entryCategories` の存在。本 Issue の 7 スラッグはここで既に文字列列挙されている。
  - **#20 W2-08** — `section-fields.ts` の `FORBIDDEN_KEYS / assertNoSensitiveKey / buildDefaultValues`。**同一ロジックを共有**するために本 Issue でリファクタする（D2）。
- 後続（**本 Issue の消費者**）:
  - **#22 W3-02 EntryDialog** — 本 Issue の `CATEGORIES[slug]` と `buildEntrySchema(slug)` を `useForm({ resolver: zodResolver(buildEntrySchema(slug)) })` で消費。
  - **#23 W3-03 EntryCard リスト** — `CATEGORIES[slug].primaryKey` / `metaKeys` を使ってカードのタイトル・副項目を組み立てる（メタ情報の見せ方は #23 側で決めるが、**その解決に必要な情報は本 Issue で用意しておく**か、`primaryKey / metaKeys` は #23 で足すかは D4）。
  - **#24 W3-04 TimingBadge レコード単位選択** — カテゴリの各エントリに `timing: 'always' | 'posthumous'` を持たせるための schema 拡張は #24 側でもよいが、**本 Issue の `buildEntrySchema` に既定で `timing` を含めるか**は D5。

## やること

### 前提の意思決定（**要ユーザー確認**）

実装分岐点。合意後に着手する。

- **D1. `FieldDefinition` の再利用 vs 新設**（推奨: **案 A**）
  - **案 A（推奨）**: `src/features/notebook/constants/categories.ts` に**新規の `CategoryFieldDefinition` 型を定義**し、`required` / `helperText` / `select 用 options` / `digits4` 用 kind を持たせる。単一項目用 `FieldDefinition`（sections.ts）とは責務が違うので分ける。
  - 案 B: `sections.ts` の `FieldDefinition` に `required?` / `options?` / `helperText?` を追記して両方で共有。DRY だが単一項目側で使わないプロパティが増えて型が緩む。
- **D2. `FORBIDDEN_KEYS` / `assertNoSensitiveKey` の共有**（推奨: **案 A**）
  - **案 A（推奨）**: `src/features/notebook/schema/sensitive-keys.ts`（新規）に切り出し、`section-fields.ts` と `categories.ts` 側の Zod 生成ヘルパから **両方 import**。単一の真実になる。
  - 案 B: `categories.ts` 側で再定義（重複）。将来リストを追加したとき片方に漏れるリスク。
- **D3. 「口座番号は下 4 桁のみ」を型で表す**（推奨: **案 A**）
  - **案 A（推奨）**: `CategoryFieldDefinition.kind` に **`'digits4'`** を追加。`buildEntrySchema` は `digits4` を `z.string().regex(/^\d{4}$/, "下 4 桁の数字を入力してください")` に変換。**field 定義の時点で「フル桁を書ける枠は作れない」**ことを型で保証。
  - 案 B: 汎用の `pattern?: RegExp` を持たせて自由度を上げる。Issue DoD の「型で表す」に対して意図が薄まる。
  - 案 C: kind は `text` のまま Zod 側だけで数値パターンを付ける。**型で表現できていない**ので却下。
- **D4. `select` 系フィールドの扱い**（推奨: **案 A**）
  - **案 A（推奨）**: `kind: 'select'` + `options: readonly { value: string; label: string }[]` を新設。以下に適用:
    - bank_account.account_type: 普通 / 当座
    - account.aftermath: 削除 / 残す / 追悼（screen_spec の「死後の希望」）
  - 案 B: すべて free text（`kind: 'text'`）で通す。実装は最小だが UX 低下。
  - 案 C: 種類（insurance_kind / loan_kind / property_kind）まで拡張。**現時点で選択肢の合意がない**ので保留。本 Issue は上記 2 個のみ。
- **D5. `timing` を `buildEntrySchema` に含めるか**（推奨: **案 B**）
  - 案 A: 本 Issue で `buildEntrySchema` の返り値に `timing: z.enum(['always','posthumous'])` を含める。#24 の準備を先取り。
  - **案 B（推奨）**: 本 Issue は **カテゴリ固有のフィールドのみ**をスキーマ化し、`timing` は #24 で追加する（責務分離）。EntryDialog の完成は #22 完了時なので、`timing` の合流は #24 に集約したほうが差分が小さい。
- **D6. `SECTIONS[slug].entryCategories` の型強化**（推奨: **案 A**）
  - **案 A（推奨）**: `entryCategories: readonly string[]` → `readonly CategorySlug[]`。**存在しないカテゴリを書けなくなる**。`sections.ts` は categories.ts に依存する形になるが、循環にはならない（categories は sections を import しない）。
  - 案 B: 触らない。将来 typo が生きたまま残る。
- **D7. `primaryKey / metaKeys` を本 Issue で入れるか**（推奨: **案 A**）
  - **案 A（推奨）**: `CATEGORIES[slug]` に `primaryKey: string`（EntryCard の title に流す）と `metaKeys: readonly string[]`（副項目）を含める。**#23 が消費する情報を先に定義**しておく（例: bank_account → `primaryKey: 'bank_name'`, `metaKeys: ['branch', 'account_type', 'last4']`）。
  - 案 B: #23 で追加する。本 Issue の責務が「フィールド + スキーマ」のみに絞れる。将来の再編で余計な差分が発生する可能性あり。

### タスク

- [ ] `src/features/notebook/constants/categories.ts` を新規作成
  - [ ] `CATEGORY_SLUGS = ['bank_account', 'insurance', 'property', 'loan', 'account', 'subscription', 'pet'] as const`
  - [ ] `CategorySlug` 型（union）
  - [ ] `CategoryFieldKind = 'text' | 'textarea' | 'select' | 'digits4'`（D3 / D4）
  - [ ] `CategoryFieldDefinition` 型（`key / label / kind / required / maxLength / helperText / options?`）— `key: string`、`FIELD_KEY_PATTERN` で妥当性を担保
  - [ ] `CategoryDefinition` 型（`slug / label / fields / primaryKey / metaKeys`）（D7 採用時）
  - [ ] `CATEGORIES: Record<CategorySlug, CategoryDefinition>` を screen_spec §2 の表通りに定義（下記「フィールド定義草案」）
- [ ] `src/features/notebook/schema/sensitive-keys.ts` を新規作成し、`section-fields.ts` から `FORBIDDEN_KEYS` / `assertNoSensitiveKey` を移設・両方から import に変更（D2）
- [ ] `src/features/notebook/schema/entry-fields.ts`（または `entry.ts`）を新規作成
  - [ ] `buildEntrySchema(category: CategorySlug): z.ZodObject<Record<string, ZodTypeAny>>`
  - [ ] `required: true` は `z.string().min(1, '<label>を入力してください')`、`false` は `z.string().optional().or(z.literal(''))`
  - [ ] `maxLength` は `z.string().max(n, '<label>は n 文字以内で入力してください')`
  - [ ] `kind: 'digits4'` は `z.string().regex(/^\d{4}$/, '下 4 桁の数字を入力してください')`
  - [ ] `kind: 'select'` は `z.enum([option.value, ...])`
  - [ ] `buildEntryDefaultValues(category)` も同ファイルに（`section-fields.ts` の `buildDefaultValues` に対応）
- [ ] `src/features/notebook/constants/sections.ts` の `entryCategories` を `readonly CategorySlug[]` に型強化（D6）
- [ ] Vitest（`categories.test.ts` と `entry-fields.test.ts` の 2 本）
  - [ ] **DoD 直結**: すべてのカテゴリの全 field に対し、`FORBIDDEN_KEYS` に含まれる key が**構造上存在しない**ことを検証（`password / pass / pin / pincode / cvv / mynumber / my_number / credit_card / card_number / secret` 全部）
  - [ ] `FIELD_KEY_PATTERN` を全 field key が満たす
  - [ ] `bank_account.last4` の kind が `digits4` である（＝フル桁の口座番号を書ける枠がない）
  - [ ] `buildEntrySchema('bank_account')` が空オブジェクトを弾く（`bank_name` 必須）、`last4: '12345'` を弾く、`last4: '1234'` を通す
  - [ ] `buildEntrySchema('account')` の `aftermath` が `'削除' | '残す' | '追悼'` 以外を弾く（D4-A 採用時）
  - [ ] 7 カテゴリすべてに **必須 field が最低 1 つ**存在する（DoD「全 7 カテゴリで必須項目が定義済み」）
  - [ ] money / digital 系カテゴリの必須注意文（`helperText`）に「暗証番号」「パスワード」など**入力してはいけないもの**への言及がある（DoD「注意文が定義済み」）
- [ ] `sections.test.ts` の更新（`entryCategories` を型強化した場合、コンパイル通過を確認）

### フィールド定義草案（screen_spec.md §2 準拠）

```ts
// bank_account: primaryKey='bank_name', metaKeys=['branch','account_type','last4']
bank_name        text required maxLength=60
branch           text          maxLength=60
account_type     select        options=[普通/futsu, 当座/toza]
last4            digits4       helperText='下 4 桁のみ（フル桁は書かない）'
memo             textarea      maxLength=1000  helperText='暗証番号は書かない'

// insurance: primaryKey='insurer', metaKeys=['insurance_kind','policy_number']
insurer          text required maxLength=60
insurance_kind   text          maxLength=60
policy_number    text          maxLength=60
contact          textarea      maxLength=200

// property: primaryKey='address', metaKeys=['property_kind']
address          text required maxLength=200
property_kind    text          maxLength=60
deed_location    textarea      maxLength=200  helperText='権利証の保管場所'

// loan: primaryKey='lender', metaKeys=['loan_kind','balance_estimate']
lender           text required maxLength=60
loan_kind        text          maxLength=60
balance_estimate text          maxLength=60   helperText='目安で構いません'
contact          textarea      maxLength=200

// account: primaryKey='service_name', metaKeys=['account_id','aftermath']
service_name     text required maxLength=60
account_id       text          maxLength=100  helperText='ID のみ（パスワードは書かない）'
aftermath        select        options=[削除/delete, 残す/keep, 追悼/memorial]

// subscription: primaryKey='service_name', metaKeys=['monthly_fee']
service_name     text required maxLength=60
monthly_fee      text          maxLength=60
cancel_procedure textarea      maxLength=1000

// pet: primaryKey='name', metaKeys=['species','veterinary']
name             text required maxLength=60
species          text          maxLength=60
veterinary       textarea      maxLength=200
care_notes       textarea      maxLength=1000
entrusted_to     textarea      maxLength=200  helperText='託したい人の氏名・連絡先'
```

（`key` はスネークケース、`FIELD_KEY_PATTERN` 準拠。上のラベルは日本語想定）

## 完了条件（DoD）

Issue の DoD を転記:

- [ ] 全 7 カテゴリ（bank_account / insurance / property / loan / account / subscription / pet）で**必須項目が定義済み**
- [ ] 全 7 カテゴリで**注意文（helperText）が定義済み**（機微情報を書かない旨を money/digital カテゴリで明示）
- [ ] 型（`CATEGORIES` / `CategorySlug` / `CategoryFieldDefinition` / `buildEntrySchema`）が **`EntryDialog`（#22）から import 可能**（≒ `src/features/notebook/constants/categories.ts` と `src/features/notebook/schema/entry-fields.ts` が named export を公開している）
- [ ] `npm run test` で「暗証番号 / パスワード / マイナンバー入力欄がカテゴリ定義に存在しない」を検証するテストが緑
- [ ] `npm run typecheck` / `npm run lint` が緑

## リスク / 確認事項

- **screen_spec の項目に無い暗黙の必須**: `account.aftermath`（削除・残す・追悼）は「希望」だが、**未選択も許すか / 必須にするか**をユーザー判断で確定したい（推奨: **未選択許容**。強制すると心理的負担）。
- **`account_type` / `aftermath` の enum ラベル**は日本語表示だが `value` は英数（`futsu / toza / delete / keep / memorial`）で保存する想定。**API 側の受け入れ形式（enum / free text）が未確定**なので、実 API 実装時に再調整の余地あり。
- **`primaryKey / metaKeys` を本 Issue で入れる（D7-A）** 場合、#23 側の EntryCard 表示ロジックが本 Issue の定数に強く依存する。#23 のレビュー時に構造変更が入ると本 Issue に戻る差分が発生する可能性あり。**D7-A を推奨する代わりに、#23 側で「表示ロジックはここに書く」の合意を取っておきたい**。
- **文字数上限（60 / 100 / 200 / 1000）**は screen_spec の「短文 100 字 / メモ 1000 字程度」を目安に決めた草案。**個別に細かく詰めるかどうか**をユーザー判断で確定したい（推奨: **草案のまま行き、後続でレビューを受けて微調整**）。
- **`insurance_kind / loan_kind / property_kind` を select 化するか**は選択肢の合意ができ次第。本 Issue では free text（D4-C 却下）。
- **`timing` フィールド**は #24 で追加（D5-B）。**本 Issue の `buildEntrySchema` は「カテゴリ固有フィールドのみ」の合意**を取りたい。

## 参照

- `CLAUDE.md`
- `docs/frontend_design.md`（§状態管理・§UI・デザイン実装）
- `docs/screen_spec.md` §2「セクション編集」→ カテゴリ別の項目・バリデーション
- `docs/issues/20/plan.md`（`section-fields.ts` の設計思想）
- `src/features/notebook/constants/sections.ts`（`entryCategories` の一次情報）
- `src/features/notebook/schema/section-fields.ts`（`FORBIDDEN_KEYS` の共有元）
