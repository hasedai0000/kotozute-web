# Issue #11 — W1-11 [基盤] 共通部品（TimingBadge・EntryCard・EmptyState・ConfirmDialog・SectionProgress）

- URL: https://github.com/hasedai0000/kotozute-web/issues/11
- ラベル: frontend, week-1
- マイルストーン: MVP-Week1

## Issue 概要
全画面で使い回す 5 つの共通部品（`TimingBadge` / `EntryCard` / `EmptyState` / `ConfirmDialog` / `SectionProgress`）を先に作り、後続 Issue で「組み込むだけ」に持ち込むための基盤タスク。Storybook は入れず、`/dev/components` ページで目視確認できる状態にする。

## 調査結果

### 関連ドキュメント
- `CLAUDE.md`
  - ルール 6: 常時共有＝グリーン／死後開示＝アンバー＋鍵（`TimingBadge`）
  - ルール 7: 複数登録は `EntryCard` のリスト＋追加ボタンで統一
  - ルール 5: デザイントークンを使う（直値のカラーコード禁止）
- `docs/screen_spec.md` 「共通コンポーネント」
  - `TimingBadge` / `EntryCard` / `SectionProgress` / `EmptyState` / `ConfirmDialog` の役割が明記されている
  - 状態の出し分け（ローディング＝スケルトン、空＝EmptyState、削除は ConfirmDialog 経由）
- `docs/frontend_design.md`「UI・デザイン実装」
  - 意味色トークン、EntryCard 中心の CRUD、a11y（キーボード操作・prefers-reduced-motion）

### 関連コード（現状）
- `src/features/notebook/components/` — **空ディレクトリ**（`api/`, `hooks/`, `constants/`, `schema/` は既存）
- `src/components/layout/` — `Header.tsx`, `Container.tsx` は存在（`EmptyState` / `ConfirmDialog` は未作成）
- `src/components/ui/` — shadcn 部品が W1-10 で導入済み
  - `badge`, `button`, `card`, `dialog`, `progress`, `skeleton` 等を再利用可
- `src/styles/globals.css`
  - 意味色トークン `--color-timing-always` / `--color-timing-always-foreground` / `--color-timing-posthumous` / `--color-timing-posthumous-foreground` が light / dark 両方で定義済み
  - Tailwind クラス `bg-timing-always` / `bg-timing-posthumous` / `text-timing-always-foreground` 等が使える状態
- `lucide-react` は package.json にあり、`Lock` アイコンが利用可能
- `src/app/dev/` — **未作成**（今回新規で `src/app/dev/components/page.tsx` を作る想定）
- `vitest.config.mts` は jsdom + Testing Library セットアップ済み

### 依存関係
- 先に必要: なし（Header/Container は #10 で完了、shadcn 部品も導入済み）
- 関連: #12（LP 実装で `EmptyState` の導線 UX を参考にする可能性）／後続の #13 以降のダッシュボード・ノート編集画面で全部品を消費

## やること

### 1. TimingBadge（`src/features/notebook/components/TimingBadge.tsx`）
- Props: `variant: "always" | "posthumous"`、`className?`
- `always` → `bg-timing-always text-timing-always-foreground` + ラベル「常時共有」
- `posthumous` → `bg-timing-posthumous text-timing-posthumous-foreground` + `Lock` アイコン（lucide-react）+ ラベル「死後開示」
- shadcn `badge` の見た目に寄せる（角丸・小さめ・inline-flex）
- a11y: アイコンは `aria-hidden`、テキストで意味を伝える

### 2. EntryCard（`src/features/notebook/components/EntryCard.tsx`）
- Props: `title`（主要名）／`meta?: ReactNode`（副項目・複数行 OK）／`timing: "always" | "posthumous"`／`onEdit?: () => void`／`onDelete?: () => void`／`readOnly?: boolean`
- shadcn `card` をベースに、右上に `TimingBadge`、右下 or メニューに編集・削除ボタン
- `readOnly`（家族ロール想定）で編集・削除を非表示
- キーボード操作：`onEdit` / `onDelete` は `Button` を使い Tab 可能に

### 3. EmptyState（`src/components/layout/EmptyState.tsx`）
- Props: `title`（見出し）／`description?`（説明文）／`action?: ReactNode`（一次アクション）／`icon?: ReactNode`
- 中央寄せ、余白広め。`role="status"` などは付けない（能動的に読み上げる必要はない）
- 一次アクション 1 個に絞る（複数アクションは想定しない）

### 4. ConfirmDialog（`src/components/layout/ConfirmDialog.tsx`）
- shadcn `dialog` をベースにした薄いラッパー
- Props: `open`／`onOpenChange`／`title`／`description`（重要文）／`confirmLabel`（既定「確認」）／`cancelLabel`（既定「キャンセル」）／`variant?: "default" | "destructive"`／`onConfirm: () => void | Promise<void>`
- Enter/Space で confirm、Esc でキャンセル可能なこと（dialog primitive の既定挙動を維持）
- 「二段確認」＝ description をしっかり表示 ＋ destructive 時は confirm ボタンを赤系にする方針（再認証は `/family/disclosure` 側の責務なのでここには含めない）
- 送信中はボタン disabled で二重発火防止

### 5. SectionProgress（`src/features/notebook/components/SectionProgress.tsx`）
- Props: `filled: number`／`total: number`／`label?: string`
- shadcn `progress` をベースに、上に `{filled}/{total}` テキスト
- `total = 0` を安全に扱う（0 除算回避）
- a11y: `aria-label` に「{label} の進捗 {filled}/{total}」を入れる

### 6. `/dev/components` ページ（未認証 OK・目視確認用）
- `src/app/dev/components/page.tsx` を作成
- 各部品を代表的な variant / 状態でレンダリングして並べる
  - TimingBadge: always / posthumous
  - EntryCard: 編集可（メタあり／なし）／readOnly／posthumous
  - EmptyState: アクション有／無
  - ConfirmDialog: 開閉できるトリガー（default / destructive の 2 種）
  - SectionProgress: 0/10 / 3/10 / 10/10 / total=0
- 認証は不要（`(app)` 配下ではなく `src/app/dev/` に置く）
- middleware ガードの現状を確認し、`/dev` を allowlist に入れる必要があれば対応

### 7. テスト（Vitest）
- 各部品につき最低 1 件のレンダリングテスト（合計 5 件）
  - TimingBadge: `variant="posthumous"` で「死後開示」テキストとロックアイコン（`aria-hidden`）が描画されるか
  - EntryCard: `onDelete` を呼ぶと ConfirmDialog（呼び出し側で制御）にハンドラが渡る／`readOnly` でボタンが出ない
  - EmptyState: title / description / action が描画される
  - ConfirmDialog: 開いたときに description が role=dialog 内に出る／confirm クリックで `onConfirm` が呼ばれる
  - SectionProgress: `3/10` の表示、`total=0` でも例外なし
- 型・整形は `npm run typecheck && npm run lint` を最後に通す

## 完了条件（DoD）

Issue の DoD を転記:
- [ ] `bg-timing-always` / `bg-timing-posthumous` が正しく描画される（TimingBadge で確認）
- [ ] キーボード操作可能 / role・label が適切（EntryCard の編集・削除、ConfirmDialog の確認/キャンセル、EmptyState のアクション）
- [ ] Vitest でスナップショットまたはレンダリングテストが最低 1 件（今回は各部品 1 件ずつ計 5 件で満たす）

追加の確認事項:
- [ ] `/dev/components` にアクセスして 5 部品を目視確認できる
- [ ] `npm run typecheck` / `npm run lint` が緑
- [ ] 直値カラー（`#…`, `bg-green-500` 等）を使っていない

## リスク / 確認事項
- **ConfirmDialog の「二段確認」の解釈**：Issue 本文の「重要文 + 二段確認」を、
  (A) ラッパーは 1 段確認とし、`variant="destructive"` の見た目のみ強調（発動などの再認証は呼び出し側で別途行う）
  (B) チェックボックス「理解しました」を必須にした 2 ステップ UI にする
  のどちらにするか要確認。**現在の計画は (A)** です（`docs/screen_spec.md` の「削除は `ConfirmDialog` で確認」は 1 段確認想定、死後開示発動の重い確認＋再認証は個別画面の責務のため）。
- **`/dev/components` の middleware 扱い**：認証必須エリアが `(app)` 配下にあるため、`src/app/dev/` は基本的にガード対象外のはず。実装時に middleware.ts の matcher を確認して意図せずリダイレクトされないことを検証する。
- **EntryCard の削除ボタンから ConfirmDialog を直接呼ぶかは未確定**：本 Issue のスコープでは EntryCard は `onDelete` コールバックを受け取るだけとし、Dialog の制御は呼び出し側に委ねる（結合しすぎない）。
- **並べ替え（`sort_order`）は EntryCard に含めない**：`docs/screen_spec.md` で MVP は任意扱いのため、今回は Props に持たせない。

## 参照
- `CLAUDE.md`
- `docs/frontend_design.md`（UI・デザイン実装、状態管理の役割分担）
- `docs/screen_spec.md`（共通コンポーネント、状態の出し分け、EntryCard / TimingBadge 使用箇所）
- `src/styles/globals.css`（意味色トークン定義済み）
- 既存: `src/components/layout/Header.tsx` / `Container.tsx`, `src/components/ui/*`
