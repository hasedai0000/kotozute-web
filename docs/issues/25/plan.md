# Issue #25 — W3-05 [F-10] 大切な人へ 一覧 + カード + EmptyState

- URL: https://github.com/hasedai0000/kotozute-web/issues/25
- ラベル: frontend, week-3
- マイルストーン: MVP-Week3

## Issue 概要
`/messages`（大切な人へ）に **手紙カードの一覧** と **`EmptyState`（説明 + 「手紙を書く」CTA）** を実装する。事務セクション（`/notebook/*`）とは視覚的に差をつけ（余白広め・行間広め・落ち着いた縦組み）、**言葉を残す場所** としてのトーンを作る。CRUD ダイアログ・自動保存は **#26 のスコープ**で、本 Issue は **一覧描画・空表示・視覚的差別化・fetch 経路** までを担う。DoD の「家族ロールで API が返さない場合に描画されない」は、**クライアント側でフィルタしない**（CLAUDE.md 絶対ルール #8）方針で、API が返した配列をそのまま描画する挙動を維持することで担保する。

## 調査結果

### 関連ドキュメント
- `CLAUDE.md` 絶対ルール — 「1. features 単位で割る」→ 実体は `src/features/messages/`、`/messages/page.tsx` はルーティングのみ薄く保つ。「2. サーバ状態は TanStack Query が唯一の真実」→ 手紙一覧も `useMessages` 経由。「6. 常時共有＝グリーン／死後開示＝アンバー＋鍵（`TimingBadge`）」→ 各カードに `TimingBadge` を表示。「8. 死後開示の項目は API が返さない限り存在しない前提」→ 家族向けの `posthumous` 手紙は **API が返さない前提**、フロントでの `filter(x => x.timing !== 'posthumous')` は書かない。
- `docs/screen_spec.md` §7 大切な人へ — 「説明文（1 行）＋手紙カードの一覧＋『＋ 手紙を書く』。空のときは `EmptyState`」「1 通＝宛先（例『妻へ』）＋本文」「**公開タイミングの既定は `posthumous`**（`TimingBadge` を表示し、切替可）」「事務セクションと視覚的に差をつける（余白を広く、本文の行間を大きく）」「家族ロール：解放前は API が返さないため一覧に現れない」→ 本 Issue の要件そのもの。CRUD 詳細（作成・編集・削除・自動保存）は §7 内にあるが **#26 のスコープ**。
- `docs/frontend_design.md` §状態管理 — 一覧データは TanStack Query、モーダル開閉は `useState`、フォームは RHF+Zod。本 Issue の範囲では **モーダル開閉の state のみ導入**（作成モーダル本体は #26）。
- `docs/frontend_design.md` §UI・デザイン実装 — 「意味で色を使う（`TimingBadge` として部品化）」「複数登録できる項目は `EntryCard` のリスト＋『追加』ボタンで統一（追加・編集・削除・並べ替え）」→ 手紙は事務セクションとは別カード（`MessageCard`）を新規に定義するが、**構造（Card + TimingBadge + 追加ボタン）は共通のパターン**に揃える。
- `docs/frontend_design.md` §セキュリティ — 「死後開示の項目は、API が返さない限りフロントに存在しない前提で作る（クライアント側で隠すだけの実装は禁止）」→ family 対応は API 契約側で担保、フロントは`useMessages` の返り値をそのまま描画する。

### 関連コード
- `src/app/(app)/messages/page.tsx:1-7` — **現状はプレースホルダ**（`<h1>大切な人へ</h1>` のみ）。**本 Issue の主戦場**。「features 単位で割る」原則により、この `page.tsx` は **`<MessagesList />`（新規）を配置するだけ**の薄いラッパにする。
- `src/features/messages/components/MessagesCard.tsx:1-52` — **ダッシュボードの「大切な人へ」カード**（`/messages` への入口）。**本 Issue と混同しない**。名前が似ているが役割は別（本 Issue は「手紙 1 通のカード＝letter card」であり、これは「ダッシュボードのセクションカード」）。**触らない**。
- `src/features/messages/api/`, `src/features/messages/hooks/`, `src/features/messages/schema/` — **空ディレクトリ**。本 Issue で `api/useMessages.ts`（一覧 fetch）を新規追加する。
- `src/features/notebook/api/useEntries.ts:11-45` — **同じパターンの参考実装**。OpenAPI が未定義な間は `apiFetch` に手書き型を与え、404 は空配列にフォールバックする（`TODO(#20+)` コメント）。**本 Issue の `useMessages` も同じ流儀**で書く（`GET /messages` → 404 なら `{ messages: [] }`）。
- `src/features/notebook/api/useAddEntry.ts:14-38` — 楽観的更新の型スタイル（`AddEntryInput`, `apiFetch` + XSRF）。**#26 で `useAddMessage` を書くときの雛形**（本 Issue では作らない）。
- `src/features/notebook/components/EntryCard.tsx:1-77` — **`MessageCard` の設計参考**。`Card` + `CardHeader`（title + TimingBadge）+ `CardContent`（meta + actions）。**本 Issue の `MessageCard` は編集/削除ボタンを持たない**（CRUD は #26）か、または **持つが `onEdit`/`onDelete` は「未実装トースト」に一時的に配線**するかは D3 で判断。
- `src/features/notebook/components/EntryList.tsx:1-55` — **`MessagesList` の設計参考**。`entries.length === 0` で `EmptyState` を返し、それ以外は `<ul>` で `EntryCard` を並べる。**本 Issue の `MessagesList` も同じ骨格**で書く。
- `src/features/notebook/components/TimingBadge.tsx:1-37` — 完成品。**触らない**、`MessageCard` から import して使う。手紙は既定 `posthumous` なので多くのカードで **アンバー＋鍵バッジ** が並ぶ。
- `src/components/layout/EmptyState.tsx:1-41` — `title / description / action / icon` を受ける完成品。**触らない**、`MessagesList` から呼ぶ。`action` に「+ 手紙を書く」`Button` を渡す。
- `src/lib/query/queryKeys.ts:4-18` — `queryKeys` に **`messages` エントリが未定義**。本 Issue で `messages: { list: ["messages", "list"] as const }` を追加する（`family_id` をパスに含めない CLAUDE.md 原則に合わせ、キーにも含めない）。
- `src/features/notebook/api/useNoteSummary.ts:19,35` — `NoteSummary.messagesCount: number` として既に定義済み。本 Issue で `useMessages` を追加すれば、**将来的にはダッシュボードの `messagesCount` を `useMessages().data?.messages.length` に置き換える** リファクタも可能だが、**本 Issue のスコープ外**（既に別 API `/note-summary` が集約している）。
- `src/middleware.ts:43-44` — `/messages`, `/messages/:path*` は **既に auth-required ルート**に登録済み。**本 Issue で middleware は触らない**。
- `e2e/notebook-entries.spec.ts:1-80` — E2E の雛形（`stubApiWithEntries`, `setSessionCookie`）。**新規 `e2e/messages.spec.ts` の雛形として流用**。`ENTRIES_URL_RE` に相当する `MESSAGES_URL_RE = /\/(api\/)?messages(\/[^/?]+)?(\?|$)/` を追加。
- `src/lib/api/client.ts:22-73` — `apiFetch` は Sanctum クッキー・XSRF ヘッダ・エラー整形を担う。**触らない**、`useMessages` から普通に呼ぶだけ。

### 依存関係
- **先に必要（完了済み）**:
  - `/messages` のルート枠 — 既存（`src/app/(app)/messages/page.tsx` にプレースホルダあり）。
  - `TimingBadge`（#24 の中で完成）、`EmptyState`（既存）、`Card`（shadcn 既存）。
- **並行 / 後続**:
  - **#26 W3-06 手紙作成/編集** — 「+ 手紙を書く」CTA と `MessageCard` の編集/削除ボタンの **onClick 本実装**を担う。本 Issue では **CTA の枠と MessageCard の骨組みまで**にし、モーダル起動・自動保存・削除確認は #26 に委ねる（D3 参照）。
  - **#36 W4-06 家族ロールの閲覧専用モード** — 家族向け UI の切替は #36 のスコープ。本 Issue では **API が返した配列をそのまま描画**し、family 想定の E2E モックで「API が空を返すと EmptyState / 部分的に返すと該当 posthumous カードが 0 件」を担保する（#24 と同じスタンス）。
  - **バックエンド `kotozute-api`** — `GET /messages` エンドポイントは未定義。フロント先行で `apiFetch` に手書き型を与え、`TODO(#20+)` で OpenAPI 再生成時に型を差し替える方針（`useEntries` と同じ）。

## やること

### 前提の意思決定（**要ユーザー確認**）

実装分岐点。合意後に着手する。

- **D1. `Message` の型定義とデータ形**（推奨: **案 A**）
  - **案 A（推奨）**: 最小限のフィールドで先行実装。`type Message = { id: string; recipient: string; body: string; timing: TimingVariant; updated_at?: string }`。カードには `recipient`（例「妻へ」）と本文の冒頭（`body.slice(0, 120)` を `line-clamp-3` で描画）と `TimingBadge` を表示。**理由**: #26 で編集フォーム（RHF+Zod）を書くときにフィールドが確定するので、本 Issue では **バック契約に対する仮設定**として最小構造を切る。`TODO(#20+)` で OpenAPI 再生成時に差し替える。
  - 案 B: `recipient` を `to` に、`body` を `content` に、といった別名。screen_spec §7 では「宛先＋本文」表記なので、**日本語仕様に対応する英名としては `recipient / body` が自然**（案 A）。
- **D2. `MessageCard` の粒度**（推奨: **案 A**）
  - **案 A（推奨）**: **新規コンポーネント `src/features/messages/components/MessageCard.tsx`** を作る（`EntryCard` を流用しない）。理由: (i) 事務セクションと視覚差をつけるため padding/line-height/font-size が異なる、(ii) 本文プレビューは 3 行くらい `line-clamp` で見せたい（`EntryCard` の meta は 1 行想定）、(iii) 手紙は「宛先＋本文」の 2 領域構造で、`EntryCard` の「title＋meta（label:value 併記）」とは意味論が違う。
  - 案 B: `EntryCard` を汎用化して流用。DRY だが「事務セクションと視覚差をつける」DoD と衝突するため却下。
  - **視覚差の具体（案 A の中身）**:
    - `Card size="default"`（`EntryCard` は `size="sm"`）。padding を広めに。
    - 本文は `text-base leading-loose`（行間広め）。
    - 宛先は `font-heading text-lg` などで一段目立たせる。
    - `TimingBadge` は右上に配置（EntryCard と同じ位置で一貫性は保つ）。
    - モバイル最適：`max-w-prose` で読みやすい幅に、`px-6 py-6 sm:px-8 sm:py-8`。
- **D3. 「+ 手紙を書く」CTA と MessageCard の編集/削除ボタン**（推奨: **案 A**）
  - **案 A（推奨・スコープ厳守）**: 本 Issue では **CTA の枠を用意し、onClick は空**（`onClick={() => {}}` または `disabled` かつ「準備中」テキスト）にする。同様に `MessageCard` に編集/削除ボタン **は描画しない**（`readOnly` として実装）。**#26 の PR で** `MessageDialog`（作成/編集モーダル）と `ConfirmDialog`（削除）を実装し、CTA・カードのアクションボタンを配線する。**理由**: 本 Issue の作業内容は「一覧＋カード＋EmptyState」に明確に限定されており、CRUD は #26 で扱う。**中途半端なモーダル起動を残さない**（CLAUDE.md「半端な実装を残さない」原則）。
  - 案 B: CTA と編集ボタンを本 Issue で描画し、`onClick={() => toast.info("実装中")}` などの仮配線を入れる。**却下**: 「半端な実装」を残すため。
  - 案 C: 本 Issue の中で `MessageDialog` の枠（空ダイアログ）まで先取りする。**却下**: #26 のスコープに踏み込む。
  - **CTA の見た目**: 一覧上部と `EmptyState` 内の 2 箇所に配置。`Button variant="default"` に `Plus` アイコン。**disabled 属性は付けない**（#26 で即座に配線するため）、代わりに **onClick を空関数**にし、TODO(#26) コメントで意図を明記。
- **D4. 家族ロール DoD の担保方法**（推奨: **案 A**、#24 と同一方針）
  - **案 A（推奨・CLAUDE.md 準拠）**: **クライアント側フィルタは書かない**（絶対ルール #8）。`useMessages` は API が返した配列をそのまま返し、`MessagesList` はそれをそのまま描画する。E2E で「API が空配列（＝family 想定でバックが posthumous を除外した結果）を返す → `EmptyState` が描画される」／「API が always のみ返す → posthumous カードは 0 件」を担保する。role 判定 / dev flag の本実装は **#36 に委ねる**。
  - 案 B: `useMessages` にクライアント側フィルタを入れる。**CLAUDE.md 絶対ルール #8 に反する**ため却下。
- **D5. `useMessages` の fetch とキャッシュ**（推奨: **案 A**）
  - **案 A（推奨）**: `useEntries` と同じ流儀で、`apiFetch<{ messages: Message[] }>('/messages')`。404 は `{ messages: [] }` にフォールバック（バック未実装期間の UI 崩れ防止）。`queryKey: queryKeys.messages.list`。`staleTime: 30_000`, `retry: false`。**理由**: 統一されたパターンで学習コストを下げ、`useEntries` テストの読者が `useMessages` テストも読めるようにする。
  - 案 B: OpenAPI 生成型（`src/types/generated/api.ts`）を使う。**現状 `/messages` は OpenAPI に無い**ため不可。**#20+ でバック側 Scramble が生えたら差し替える TODO を残す**（案 A に含まれる）。
- **D6. EmptyState の文言・アイコン**（推奨: **案 A**）
  - **案 A（推奨）**: `title="まだ手紙がありません"`, `description="宛先を決めて、伝えたいことを綴りましょう。"`, `icon=<Mail>` (lucide), `action=<Button>+ 手紙を書く</Button>`。**理由**: screen_spec §7 のトーン（「言葉を残す場所」）に沿った柔らかい表現。「まだ」を入れることで、書き始めやすい印象を作る。
  - 案 B: 「一通の手紙も残していません」など。**却下**: 死の重さを煽らない（screen_spec §LP と同じトーン方針）。
- **D7. モバイル対応 DoD の担保**（推奨: **案 A**）
  - **案 A（推奨）**: `MessageCard` は `max-w-prose mx-auto` で「読みやすい幅」に自然と揃える。`padding` は `px-6 py-6 sm:px-8 sm:py-8`。本文は `text-base leading-loose`。E2E で `viewport` を iPhone サイズ（例: `{ width: 375, height: 667 }`）にしてカードが縦積みで読めることをスクリーンショット差分ではなく **「タイトル・本文・バッジがすべて可視である」** で担保。
  - 案 B: 別途モバイル用の別コンポーネントを切る。**過剰**、却下。
- **D8. E2E の追加**（推奨: **案 A**）
  - **案 A（推奨）**: `e2e/messages.spec.ts` を新規作成し、以下を担保：
    1. **owner（API が空配列）** → `EmptyState` の見出し・説明・CTA ボタンが可視。
    2. **owner（API が 2 通の Message を返す）** → 各カードの宛先・本文冒頭・`TimingBadge` が可視。always と posthumous の両方を含めて色分けが正しいことを確認。
    3. **family 想定（API が空配列）** → `EmptyState` が描画される（＝バック側でフィルタ済みという前提の再現）。
    4. **API 404** → `EmptyState`（`useMessages` の 404 フォールバックが効くこと）。
  - **`e2e/notebook-entries.spec.ts` の `stubApiWithEntries` 相当** として `stubMessagesApi(page, handler)` を切り出す（inline でも可）。
- **D9. Vitest ユニット**（推奨: **案 A**）
  - **案 A（推奨）**:
    - `MessageCard.test.tsx` — 宛先・本文抜粋・`TimingBadge` が描画されること。`timing="posthumous"` でアンバー＋鍵バッジになること（`TimingBadge` に依存するので簡易確認）。編集/削除ボタンは描画されないこと（`readOnly` 相当）。
    - `MessagesList.test.tsx` — `messages=[]` で `EmptyState`（見出し・CTA）が描画されること。`messages` が複数あるとカードが並ぶこと。
    - `useMessages.test.ts` — `apiFetch` をモック、200 で `messages` を返す／404 で `{ messages: [] }` にフォールバックすること（`useEntries.test.ts` を参考）。
  - 案 B: E2E のみで済ませる。**却下**: fetch フォールバックの単体挙動は Vitest で押さえる方が壊れにくい。
- **D10. ディレクトリ配置**（推奨: **案 A**）
  - **案 A（推奨）**: 実体は `src/features/messages/` に集約：
    - `src/features/messages/api/useMessages.ts`
    - `src/features/messages/api/useMessages.test.ts`
    - `src/features/messages/components/MessageCard.tsx`
    - `src/features/messages/components/MessageCard.test.tsx`
    - `src/features/messages/components/MessagesList.tsx`
    - `src/features/messages/components/MessagesList.test.tsx`
    - `src/features/messages/schema/message.ts`（`type Message`、Zod は #26 で追加）
  - `src/app/(app)/messages/page.tsx` は `<MessagesList />` を配置するだけ（CLAUDE.md「ルーティング専任で薄く保つ」）。

### タスク

- [ ] **D1〜D10 の意思決定をユーザーと合意**（本 plan を提示して承認を得る）
- [ ] **`src/lib/query/queryKeys.ts`** に `messages` を追加
  - [ ] `messages: { list: ["messages", "list"] as const }`
- [ ] **`src/features/messages/schema/message.ts`** を新規作成（D1）
  - [ ] `export type Message = { id: string; recipient: string; body: string; timing: TimingVariant; updated_at?: string }`
  - [ ] `TimingVariant` は `@/features/notebook/components/TimingBadge` から import（※ `TimingVariant` は現状 notebook 配下だが、共通型として使う。将来 `src/features/shared/` などに移す判断は本 Issue のスコープ外）
- [ ] **`src/features/messages/api/useMessages.ts`** を新規作成（D5 案 A）
  - [ ] `type MessagesResponse = { messages: Message[] }`
  - [ ] `fetchMessages()`: `apiFetch<MessagesResponse>('/messages')` + `ApiError` 404 → `{ messages: [] }`
  - [ ] `useMessages()`: `useQuery` with `queryKeys.messages.list`, `retry: false`, `staleTime: 30_000`
  - [ ] `TODO(#20+): OpenAPI に /messages が定義され次第、src/types/generated から型を差し替える。` コメント
- [ ] **`src/features/messages/components/MessageCard.tsx`** を新規作成（D2 案 A）
  - [ ] props: `{ recipient: string; body: string; timing: TimingVariant; className?: string }`（本 Issue では edit/delete なし）
  - [ ] レイアウト: `<Card size="default" className="max-w-prose mx-auto p-6 sm:p-8">`
  - [ ] ヘッダ: `recipient` (`font-heading text-lg`) と `TimingBadge` を横並び
  - [ ] コンテンツ: `body` を `text-base leading-loose line-clamp-3`
- [ ] **`src/features/messages/components/MessagesList.tsx`** を新規作成（D2/D6）
  - [ ] `"use client"`
  - [ ] `useMessages()` を呼ぶ
  - [ ] ローディング: スケルトン（3 枚くらい、`Skeleton` コンポーネントを流用）
  - [ ] エラー: `EmptyState` に「読み込めませんでした」＋ `再試行` Button（`refetch`）
  - [ ] 空: `EmptyState`（title「まだ手紙がありません」／description「宛先を決めて、伝えたいことを綴りましょう。」／icon `Mail`／action `<Button><Plus />手紙を書く</Button>`）
  - [ ] 一覧: 上部に説明文（1 行、screen_spec §7）＋ 右寄せで「+ 手紙を書く」`Button`／その下に `<ul className="flex flex-col gap-4">` で `MessageCard` を並べる
  - [ ] `+ 手紙を書く` ボタンの onClick は **本 Issue では空関数**（`onClick={() => {}}`）、`TODO(#26): MessageDialog を開く` コメントを添える（D3 案 A）
- [ ] **`src/app/(app)/messages/page.tsx`** を差し替え
  - [ ] `import { MessagesList } from '@/features/messages/components/MessagesList'`
  - [ ] `export default function MessagesPage() { return <MessagesList /> }`（見出し等はページ側でなく `MessagesList` 側に置く）
- [ ] **Vitest ユニット追加**（D9 案 A）
  - [ ] `src/features/messages/api/useMessages.test.ts` — 200 / 404 フォールバック
  - [ ] `src/features/messages/components/MessageCard.test.tsx` — 描画・TimingBadge・readOnly
  - [ ] `src/features/messages/components/MessagesList.test.tsx` — 空表示 / 一覧表示 / エラー再試行
- [ ] **E2E 追加（`e2e/messages.spec.ts`）**（D8 案 A）
  - [ ] シナリオ 1: owner・空配列 → `EmptyState` 見出し / CTA が見える
  - [ ] シナリオ 2: owner・2 通（always と posthumous 混在）→ 両方描画、`TimingBadge` の色分け確認
  - [ ] シナリオ 3: family 想定・空配列 → `EmptyState` 描画（フロントは何もしていないことの担保）
  - [ ] シナリオ 4: 404 → `EmptyState` 描画（フォールバック確認）
  - [ ] `use({ viewport: { width: 375, height: 667 } })` などでモバイル閲覧の可視性も 1 本
- [ ] **既存 E2E の点検**
  - [ ] `notebook-entries.spec.ts` などが（`/messages` を触らない範囲で）そのまま通ること

### 実装スケルトン（草案）

```ts
// src/lib/query/queryKeys.ts（差分）
export const queryKeys = {
  auth: { me: ["auth", "me"] as const },
  notebook: { /* ... 既存 ... */ },
  family: { members: ["family", "members"] as const },
  messages: { list: ["messages", "list"] as const },
} as const;
```

```ts
// src/features/messages/schema/message.ts
import type { TimingVariant } from "@/features/notebook/components/TimingBadge";

// TODO(#20+): OpenAPI に /messages が定義され次第、src/types/generated から型を差し替える。
export type Message = {
  id: string;
  recipient: string;
  body: string;
  timing: TimingVariant;
  updated_at?: string;
};
```

```ts
// src/features/messages/api/useMessages.ts
import { useQuery } from "@tanstack/react-query";
import { ApiError, apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/queryKeys";
import type { Message } from "../schema/message";

export type MessagesResponse = { messages: Message[] };

export async function fetchMessages(): Promise<MessagesResponse> {
  try {
    return await apiFetch<MessagesResponse>("/messages");
  } catch (err) {
    if (ApiError.isApiError(err) && err.status === 404) {
      return { messages: [] };
    }
    throw err;
  }
}

export function useMessages() {
  return useQuery({
    queryKey: queryKeys.messages.list,
    queryFn: fetchMessages,
    retry: false,
    staleTime: 30_000,
  });
}
```

```tsx
// src/features/messages/components/MessageCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TimingBadge, type TimingVariant } from "@/features/notebook/components/TimingBadge";

type MessageCardProps = {
  recipient: string;
  body: string;
  timing: TimingVariant;
  className?: string;
};

export function MessageCard({ recipient, body, timing, className }: MessageCardProps) {
  return (
    <Card className={cn("mx-auto max-w-prose px-6 py-6 sm:px-8 sm:py-8", className)}>
      <CardHeader className="grid-cols-[1fr_auto] items-start gap-3">
        <CardTitle className="font-heading text-lg break-words">{recipient}</CardTitle>
        <TimingBadge variant={timing} />
      </CardHeader>
      <CardContent>
        <p className="text-base leading-loose text-foreground line-clamp-3 whitespace-pre-wrap">
          {body}
        </p>
      </CardContent>
    </Card>
  );
}
```

```tsx
// src/features/messages/components/MessagesList.tsx
"use client";

import { Mail, Plus } from "lucide-react";
import { EmptyState } from "@/components/layout/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMessages } from "../api/useMessages";
import { MessageCard } from "./MessageCard";

export function MessagesList() {
  const { data, isPending, isError, refetch } = useMessages();

  return (
    <section className="mx-auto flex w-full max-w-prose flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl">大切な人へ</h1>
          <p className="text-sm text-muted-foreground">
            言葉を残す場所。宛先を決めて、伝えたいことを綴ります。
          </p>
        </div>
        <Button
          onClick={() => {
            /* TODO(#26): MessageDialog を開く */
          }}
        >
          <Plus aria-hidden="true" />
          手紙を書く
        </Button>
      </header>

      {isPending ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title="読み込めませんでした"
          description="通信を確認してから、もう一度お試しください。"
          action={
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              再試行
            </Button>
          }
        />
      ) : data.messages.length === 0 ? (
        <EmptyState
          icon={<Mail className="size-6" aria-hidden="true" />}
          title="まだ手紙がありません"
          description="宛先を決めて、伝えたいことを綴りましょう。"
          action={
            <Button
              onClick={() => {
                /* TODO(#26): MessageDialog を開く */
              }}
            >
              <Plus aria-hidden="true" />
              手紙を書く
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {data.messages.map((m) => (
            <li key={m.id}>
              <MessageCard recipient={m.recipient} body={m.body} timing={m.timing} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

```tsx
// src/app/(app)/messages/page.tsx
import { MessagesList } from "@/features/messages/components/MessagesList";

export default function MessagesPage() {
  return <MessagesList />;
}
```

## 完了条件（DoD）

Issue の DoD を転記:
- [ ] **カードの一覧が家族ロールで API が返さない場合に描画されない**
  - 本 Issue のスコープ: **クライアント側フィルタは書かない**（CLAUDE.md 絶対ルール #8）。`useMessages` は API 応答をそのまま返し、`MessagesList` は空なら `EmptyState`、部分的なら該当分だけ描画。E2E で「空配列 → `EmptyState`」「always のみ → posthumous カード 0 件」を担保。role 判定 / dev flag の本実装は **#36 W4-06** に委ねる。
- [ ] **モバイルで読みやすい**
  - `max-w-prose` で「読みやすい幅」に自然と収める、`px-6 py-6 sm:px-8 sm:py-8`、本文は `text-base leading-loose`。E2E で iPhone サイズのビューポート 1 本を含める。
- [ ] Issue の作業内容チェックリスト:
  - [ ] `/messages` に手紙カード一覧（`MessagesList` + `MessageCard`）
  - [ ] 空のとき `EmptyState`（説明 +「手紙を書く」CTA）
  - [ ] 事務セクションと視覚的に差をつける（`max-w-prose`、`p-6 sm:p-8`、`text-base leading-loose`）

## リスク / 確認事項

- **D3（CTA・アクションボタンの配線を #26 に委ねる）**: 「+ 手紙を書く」CTA を描画するが onClick は空関数（TODO(#26) コメント付き）。**ユーザーが「本 Issue で仮モーダルまで作りたい」と希望する場合は要指示**。推奨は #26 に委ねる。
- **D4（家族ロール DoD）**: dev flag / role 判定は #36 のスコープ。本 Issue で `useMessages` に role スイッチを入れる案は CLAUDE.md 絶対ルール #8 に反するため採用しない。**「本 Issue の範囲で家族ロール表示を切り替えられるようにしたい」場合は要相談**。
- **D1（`Message` 型のフィールド名）**: `recipient / body` を採用。バック（`kotozute-api`）が異なる命名を採用した場合、本 Issue の完了後（OpenAPI 生成時）にリネームが発生。**#26 で編集フォームを書くタイミングでバック側と最終確定するのが安全**（本 Issue はフロント先行）。
- **`TimingVariant` の import 経路**: 現状 `@/features/notebook/components/TimingBadge` からしか公開されていない。手紙でも参照するため、**将来的には `src/features/shared/` などに切り出す**候補。**本 Issue では import パスを跨ぐだけで容認**（3 箇所以上に増えた時点で抽出、CLAUDE.md「三つ揃ってから抽象化」原則。現状 notebook / messages の 2 箇所）。
- **`MessageCard` と `MessagesCard` の名前が紛らわしい**: 前者は「手紙 1 通のカード」、後者は「ダッシュボードの入口カード」。命名変更は破壊的で範囲が広がるため、**本 Issue では触らない**が、レビュー時に「別物」であることを PR 説明で明記する。
- **バック（`kotozute-api`）の `GET /messages` 契約**: 現時点で未実装。フロントは 404 を空にフォールバックしているため UI は崩れないが、**「バック実装が完了するまで一覧は常に空」** である点を PR にも明記する。#20+ の OpenAPI 再生成タイミングで型と `TODO` を差し替える。

## 参照
- `CLAUDE.md` 絶対ルール #1（features 単位）／ #2（TanStack Query）／ #6（TimingBadge）／ #8（family は API 依存）
- `docs/frontend_design.md` §状態管理 / §UI・デザイン実装 / §セキュリティ
- `docs/screen_spec.md` §共通仕様（状態・ロールによる出し分け）／ §7 大切な人へ
- `docs/issues/24/plan.md`（家族ロール DoD の扱いを継承）
