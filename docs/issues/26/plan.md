# Issue #26 — W3-06 [F-10] 手紙作成/編集（自動保存・既定 posthumous）

- URL: https://github.com/hasedai0000/kotozute-web/issues/26
- ラベル: frontend, week-3
- マイルストーン: MVP-Week3

## Issue 概要
`/messages`（大切な人へ）の **手紙 1 通の作成 / 編集 / 削除** を、`useAutoSave` を再利用した **自動保存**（debounce 800ms、素早い入力を 1 回に収束）で書けるようにする。新規手紙は **既定 `posthumous`**、`TimingBadge` で切替可能。宛先＋本文の Zod スキーマを整備し、本文は複数行 textarea＋文字数目安表示。削除は既存 `ConfirmDialog` で二段階確認。#25 で作った一覧 / `MessageCard` / EmptyState / `useMessages` に、作成 / 編集 / 削除の導線を配線する。

## 調査結果

### 関連ドキュメント
- `CLAUDE.md` 絶対ルール — 「1. features 単位で割る」→ 手紙の詳細/フォーム/API フックは `src/features/messages/` に配置、`src/app/(app)/messages/[…]` はルーティングのみ。「2. サーバ状態は TanStack Query が唯一の真実」→ 作成 / 更新 / 削除は `useMutation` で楽観的更新。「6. 常時共有＝グリーン／死後開示＝アンバー＋鍵（`TimingBadge`）」→ 切替 UI で必ず `TimingBadge` を表示。「8. 死後開示の項目は API が返さない限り存在しない前提」→ 家族は編集画面に到達しない前提（role 判定本実装は #36）。**サーバ状態を `useState` に写し取らない**（詳細画面のフォームは RHF の初期値としてクエリ結果を渡すが、以降 RHF が真実、API は mutation で戻す）。
- `docs/screen_spec.md` §7 大切な人へ — 「1 通＝宛先（例『妻へ』）＋本文」「**公開タイミングの既定は `posthumous`（死後開示）**。`TimingBadge` を表示し、切替可」「本文は複数行。自動保存（debounce 800ms）。文字数上限の目安を表示」「事務セクションと視覚的に差をつける（余白を広く、本文の行間を大きく）」「削除は `ConfirmDialog`」「家族ロール：解放前は API が返さないため一覧に現れない。解放後は閲覧のみ」→ 本 Issue の要件そのもの。
- `docs/screen_spec.md` §共通仕様「状態の出し分け」— 「保存中は楽観的更新で即時反映、失敗時はロールバック＋トースト」「オフライン／通信失敗は『保存できませんでした』トースト＋再試行」→ `SavingIndicator` を継続利用。
- `docs/frontend_design.md` §状態管理 — 一覧・詳細は TanStack Query、モーダル開閉は `useState`、フォームは RHF+Zod。**「YOU MUST：サーバ状態を `useState` に写し取らない」** → 詳細画面の RHF `defaultValues` は初回だけ渡し、以降は RHF 自身が真実。
- `docs/frontend_design.md` §UI・デザイン実装 — 「意味で色を使う（`TimingBadge`）」。
- `docs/frontend_design.md` §セキュリティ — 「死後開示の項目は、API が返さない限りフロントに存在しない前提」→ 家族の編集画面到達は #36 でルート側 or 応答側で塞ぐ想定、本 Issue では **owner 前提のフォーム**を書く。

### 関連コード
- `src/features/messages/api/useMessages.ts:1-32` — **#25 で作成済み**。`GET /messages` を 404→空配列にフォールバック。`queryKeys.messages.list` を使用。本 Issue の作成 / 更新 / 削除 mutation はここのキャッシュキーを invalidate / 楽観的更新する。
- `src/features/messages/schema/message.ts:1-10` — **#25 で作成済み**。`type Message = { id; recipient; body; timing; updated_at? }` が既に存在。本 Issue で **Zod スキーマ**（`messageInputSchema`）を追加する（`recipient`, `body`, `timing` の必須 / 上限）。
- `src/features/messages/components/MessagesList.tsx:15-87` — **#25 で作成済み**。CTA `onClick` が noop（`TODO(#26): MessageDialog を開く` コメント付き）。本 Issue では、`MessageDialog` は作らず、**CTA を `<Link href="/messages/new">` に置換**する（詳細ページで自動保存する方針、D1 参照）。同時に **`MessageCard` をカード全体リンク化**（`/messages/[id]`）して詳細画面を編集モードとして開く。
- `src/features/messages/components/MessageCard.tsx:1-51` — **#25 で作成済み**。本 Issue で **カード全体を `Link` でラップ**する（`EntryCard` のように内部にボタンを持たせず、手紙は「読んで開く」体験に統一）。
- `src/features/notebook/hooks/useAutoSave.ts:1-100` — **#20 系で完成**。`Record<string, string>` を扱う。本 Issue で **手紙のフォームでもそのまま再利用**する（`timing` は `"always" | "posthumous"` で実質 string、TValues 制約 `Record<string, string>` に適合させるため `{ recipient: string; body: string; timing: string }` として渡す。RHF 側は `TimingVariant` を str union として扱う）。**（YOU MUST）Issue の作業内容「自動保存（`useAutoSave` を再利用）」に厳密対応**。
- `src/features/notebook/components/SavingIndicator.tsx:1-85` — **完成品**。本 Issue で `MessageForm` から流用する。**触らない**、import して使う。
- `src/features/notebook/components/SectionForm.tsx:45-172` — **`MessageForm` の設計参考**。`useAutoSave({ form, mutation, delayMs: 800 })` の使い方、`AutoSaveStatus === "error"` 時の 1 度きりトーストパターン、Loader（Query 完了までスケルトン）→ Body（`initial` 確定後にマウント）の 2 段構成。本 Issue も同じ骨格。
- `src/features/notebook/components/EntryDialog.tsx:169-193` — **公開タイミング切替 UI（`RadioGroup`）の参考**。本 Issue でも同じ `TimingOption`（`RadioGroupItem` + `TimingBadge`）パターンを踏襲（一貫性）。ただし手紙は Dialog ではなく詳細画面内なので、Dialog wrapper は不要。
- `src/features/notebook/api/useAddEntry.ts:14-94` — **`useCreateMessage` の設計参考**。楽観的更新（`onMutate` で tempId 挿入、`onSuccess` でサーバ返却の id に差替え、`onError` で `previous` に戻す）、`X-XSRF-TOKEN` の付与（`readXsrfToken()`）、`toast` 出力、`queryKeys.notebook.summary` invalidate。**本 Issue も同じ流儀**で `queryKeys.messages.list` を楽観的更新し、`queryKeys.notebook.summary`（`messagesCount` を含む）を invalidate。
- `src/features/notebook/api/useUpdateEntry.ts:1-86` — **`useUpdateMessage` の設計参考**。PATCH の楽観的更新。
- `src/features/notebook/api/useDeleteEntry.ts:1-63` — **`useDeleteMessage` の設計参考**。DELETE の楽観的更新（`filter`）、失敗時ロールバック。
- `src/features/notebook/api/usePatchNoteFields.ts:1-38` — **`useAutoSave` に渡す mutation の最小形**の参考。「差分だけ送る Partial」パターン。本 Issue の `useUpdateMessage` の `useAutoSave` 用ラッパは、`Partial<{ recipient; body; timing }>` を PATCH する形にする。
- `src/components/layout/ConfirmDialog.tsx:1-77` — **完成品**。`title`, `description`, `onConfirm`, `variant="destructive"` を渡すだけ。本 Issue の削除で **そのまま流用**（`触らない`）。
- `src/lib/query/queryKeys.ts` — `messages.list` が定義済み。本 Issue で **`messages.detail(id)`** を追加する（`GET /messages/{id}` のキャッシュ用）。
- `src/lib/api/client.ts:22-73` — `apiFetch` は Sanctum クッキー・XSRF ヘッダ・エラー整形を担う。**触らない**、`useCreateMessage` 等から呼ぶ。
- `src/features/notebook/components/TimingBadge.tsx:1-37` — 完成品。`TimingVariant` = `"always" | "posthumous"` を export。**触らない**、import。
- `src/middleware.ts` — `/messages`, `/messages/:path*` は既に auth-required。**本 Issue で middleware は触らない**（`/messages/new`, `/messages/[id]` も同じルート配下でカバー済み）。
- `e2e/messages.spec.ts:1-215` — **#25 で作成済み**。owner・空・404・複数手紙・モバイルビューの 5 シナリオが通っている。本 Issue で **`stubApiWithMessages` の handler に POST / PATCH / DELETE を追加**し、新シナリオ（作成・編集・削除）を **`e2e/messages-form.spec.ts` として追記**する（既存を膨らませず分離）。

### 依存関係
- **先に必要（完了済み）**:
  - #25 W3-05（一覧 + カード + EmptyState + `useMessages` + `Message` 型 + `MessagesList` の CTA 枠 + `queryKeys.messages.list`）
  - #24 W3-04（`TimingBadge` + `TimingVariant` export）
  - `useAutoSave`, `SavingIndicator`, `ConfirmDialog`（既存）
- **並行 / 後続**:
  - **#36 W4-06 家族ロールの閲覧専用モード** — 家族向け UI の切替は #36 のスコープ。本 Issue では **owner 前提**でフォーム / 削除ボタンを描画する。家族が誤って `/messages/new` に到達した場合の扱いは #36 で決める。
  - **バックエンド `kotozute-api`** — `POST /messages`, `GET /messages/{id}`, `PATCH /messages/{id}`, `DELETE /messages/{id}` は未実装。フロント先行で `apiFetch` に手書き型を渡し、`TODO(#20+)` で OpenAPI 再生成時に差し替え（`useEntries` / `useMessages` と同じ流儀）。
  - **PDF 出力 #30 W3-10** — プレビュー画面で手紙も含めて表示。本 Issue のスキーマ / API を先に固めておくと下流が楽。

## やること

### 前提の意思決定（**要ユーザー確認**）

実装分岐点。合意後に着手する。

- **D1. 作成 / 編集 UI の形式**（推奨: **案 A**）
  - **案 A（推奨）**: **詳細ページ方式**（`/messages/new` と `/messages/[id]`）。手紙の本文は複数行 textarea＋文字数目安で、事務セクションと視覚差をつける（余白広め・行間広め）。ダイアログ内では窮屈で「言葉を綴る」体験を損ねる。自動保存も画面遷移せずに継続でき、URL に紐づくのでリロード / 共有 / 戻る操作が自然。
  - 案 B: 作成 / 編集ダイアログ（`MessageDialog`、`EntryDialog` 相当）。本文が長いとダイアログでは扱いにくく、screen_spec §7「事務セクションと視覚的に差をつける」の実現が難しい。**却下**。
  - 案 C: `/messages` 一覧の下にインライン展開。一覧が長くなると操作性が悪化。**却下**。

- **D2. 自動保存の初回動作**（推奨: **案 A**）
  - **案 A（推奨）**: **`/messages/new` は「初回入力時に POST」方式**。フォームがマウントされても即座には作成せず、ユーザーが何か入力して 800ms 経過した時点で `POST /messages`（既定 `timing: "posthumous"`）を発行、レスポンスの `id` を受けて `router.replace("/messages/[id]")` に静かに切り替える。以降の変更はすべて `PATCH /messages/{id}`（差分のみ）。**理由**: (i) 空のドラフトをバックに残さない（ゴミレコード防止）、(ii) 初回作成〜以降の PATCH をシームレスにする、(iii) `useAutoSave` の debounce と自然に噛み合う。
  - 案 B: `/messages/new` マウント時に即座に POST してドラフト作成 → `router.replace("/messages/[id]")`。空のまま閉じられた場合の掃除が必要（バック側でドラフト削除の cron 等）。**却下**（バック負担が増える、フロント単独で完結しない）。
  - 案 C: `/messages/new` は **提出ボタンのある通常フォーム**、`/messages/[id]` のみ自動保存。**却下**（作成と編集で体験が分裂、Issue の DoD「自動保存」と衝突）。
  - **実装骨格（案 A）**:
    ```tsx
    // MessageForm 内。id が null の間は create、あるとしたら update。
    const [messageId, setMessageId] = useState<string | null>(initialId ?? null);
    const create = useCreateMessage();
    const update = useUpdateMessage();

    // useAutoSave が呼ぶ mutation.mutateAsync(diff) をラップ
    const autoSaveMutation = useMemo(() => ({
      mutateAsync: async (diff: Partial<MessageInput>) => {
        if (messageId === null) {
          const created = await create.mutateAsync({
            recipient: diff.recipient ?? "",
            body: diff.body ?? "",
            timing: diff.timing ?? "posthumous",
          });
          setMessageId(created.id);
          router.replace(`/messages/${created.id}`, { scroll: false });
        } else {
          await update.mutateAsync({ id: messageId, ...diff });
        }
      },
    } as UseMutationResult<void, unknown, Partial<MessageInput>>), [messageId, create, update, router]);

    const auto = useAutoSave({ form, mutation: autoSaveMutation, delayMs: 800 });
    ```
    - **細部**: `router.replace` は `scroll: false` で。ユーザーがまだ入力中の場合にスクロール位置を保つ。
    - **細部**: 空文字だけの入力（recipient=""、body="" のまま focus 外れ）では `useAutoSave` の diff が空になり create が発火しない（`useAutoSave` の `computeDiff` は初期値との差分を取る）。**空のまま画面を離れてもゴミレコードが残らない**という DoD の副次的な担保になる。

- **D3. `timing` 変更のトリガー**（推奨: **案 A**）
  - **案 A（推奨）**: `TimingRadio`（RadioGroup + TimingBadge、EntryDialog と同じ部品を message 用に切り出す or 直接利用）で選択 → RHF `setValue("timing", v)` → `watch` が発火 → `useAutoSave` の debounce で PATCH。**recipient / body と統一した挙動**（すべて 800ms debounce）。
  - 案 B: timing 切替は「即時」保存（debounce をスキップ）。**却下**、UX が2 系統になる。
  - **実装ノート**: `useAutoSave` の TValues は `Record<string, string>` 制約。`timing` は `"always" | "posthumous"` の union だが構造的には string なので、TValues を `{ recipient: string; body: string; timing: TimingVariant }` としつつ、useAutoSave 側の型は `Record<string, string>` で受ける（型安全のため RHF の form は `TimingVariant` を保持、`mutateAsync` に渡る `diff.timing` は `string` として PATCH ボディに詰める。実行時値は必ず union の 2 値になる）。

- **D4. Zod スキーマ**（推奨: **案 A**）
  - **案 A（推奨）**:
    - `recipient: z.string().min(1, "宛先を入力してください").max(50, "宛先は 50 文字以内で入力してください")`
    - `body: z.string().min(1, "本文を入力してください").max(2000, "本文は 2000 文字以内で入力してください")`
    - `timing: z.enum(["always", "posthumous"])`
    - **文字数目安の上限**: recipient=50、body=2000。screen_spec §7「文字数上限の目安を表示」に対応。
    - **理由**: 「妻へ」「息子 太郎へ」等を想定して 50 で余裕、本文は「便箋 2〜3 枚」相当で 2000。バック契約が確定した時点で調整可能。
  - **RHF 側の扱い**: `mode: "onChange"` にすると保存中もエラー表示が更新される。**空欄では自動保存を走らせない**ため、`isEnabled: form.formState.isValid` を `useAutoSave` に渡す（未入力の初回保存を防ぐ）。**注意**: これによって案 D2 の「recipient と body 両方 min(1) が必須なので、片方だけ入力しても自動保存が走らない」となる。**代替**: `isEnabled` は使わず、Zod は緩め（`recipient` を optional に）にしてバック側で最終検証、UI は文字数下限の警告のみ表示する — こちらを **推奨**にする。

- **D5. 自動保存を走らせる条件**（推奨: **案 A の再検討**、D4 と連動）
  - **案 A（推奨）**: **Zod では `recipient / body` を optional かつ最大長のみ**（`z.string().max(50).optional()` / `z.string().max(2000).optional()`）とし、**自動保存は常に走らせる**（空文字も許可）。ただし **初回の POST は「何かしら入力があるとき」のみ**発火するよう `useAutoSave` の diff 計算 + 初期値（全て空文字）の性質で自然に担保される。**理由**: (i) 「書き途中」を保存できないと DoD の「自動保存」の意味が薄れる、(ii) 提出ボタンがないため「有効になるまで保存できない」体験は不自然、(iii) バック側は最終保存時に validation を掛ければよい（フロント側でも最低限の警告文言は出す）。
  - 案 B: `min(1)` を維持 → 初回の POST が両方入力されるまで走らない → 片方だけ入力して離脱するとロスト。**却下**。
  - **実装（案 A）**:
    - Zod: `z.object({ recipient: z.string().max(50), body: z.string().max(2000), timing: z.enum(["always", "posthumous"]) })`（`optional` すら不要、空文字許容で十分）
    - UI: recipient が空のときは薄いヒント（「宛先を入力してください」）を `text-muted-foreground` で表示、body も同様。エラー文（赤）は max オーバー時のみ。
    - `useAutoSave`: `isEnabled: true` で常時稼働。

- **D6. 削除の位置と確認**（推奨: **案 A**）
  - **案 A（推奨）**: **削除ボタンは詳細画面の下部**に配置（`Button variant="destructive"`）→ `ConfirmDialog`（`title="この手紙を削除しますか？"`, `description="削除すると元に戻せません。"`, `variant="destructive"`）→ `useDeleteMessage.mutateAsync({ id })` → 成功で `router.replace("/messages")` に戻す。一覧の `MessageCard` には削除ボタンを **付けない**（詳細に集約、EntryCard パターンと分ける）。
  - 案 B: 一覧 `MessageCard` に編集 / 削除ボタンを付ける（EntryCard パターン）。**却下**: 手紙は「読んで開く」体験に統一する方針（カード全体を Link、詳細で操作）、`MessageCard` の視覚的静けさを保つ。
  - **`useDeleteMessage`**: 楽観的更新（`queryKeys.messages.list` から filter で除去）、失敗時ロールバック、成功で `queryKeys.notebook.summary` invalidate（`messagesCount` 更新）。

- **D7. カードの詳細遷移 UI**（推奨: **案 A**）
  - **案 A（推奨）**: `MessageCard` を **カード全体リンク化**（`<Link href="/messages/[id]">` で `<Card>` をラップ、`MessagesCard.tsx` と同じパターン）。ホバー / フォーカス時に軽い `ring` を出す（既存 `MessagesCard` を参考）。アクセシビリティ: `aria-label={<recipient> を読む}`。
  - 案 B: カード内に「編集」ボタンを追加。**却下**（案 A の方が読みやすさ / 操作の一貫性で優位）。

- **D8. 詳細ページの取得と初期値**（推奨: **案 A**）
  - **案 A（推奨）**: `useMessage(id)` を追加、`GET /messages/{id}` → `{ message: Message }`。404 は `notFound()` を呼び Next.js の 404 UI に流す。`MessageForm` は `initial` prop（`Message` 型）を受けて RHF の `defaultValues` にセット。**「サーバ状態を useState に写し取らない」**（CLAUDE.md）の原則との整合: RHF は「入力の一次記憶」であり、`useState` によるキャッシュコピーとは扱いが異なる（notebook `SectionForm` と同じ整理）。
  - **キャッシュキー**: `queryKeys.messages.detail(id) = ["messages", "detail", id] as const`
  - **staleTime**: 30_000（他のフックと同じ）
  - **retry**: false（404 を素早く出す）
  - **`useMessages` との整合**: 一覧のキャッシュに存在する場合、`useMessage(id)` は `initialData` として一覧から拾えるが、**本 Issue では最適化しない**（読みやすさ優先、後で拾えばよい）。

- **D9. `MessageForm` の構造**（推奨: **案 A**）
  - **案 A（推奨）**:
    - `"use client"`
    - props: `{ mode: "create" }` または `{ mode: "edit"; initial: Message }`
    - RHF `useForm<{ recipient: string; body: string; timing: TimingVariant }>({ resolver: zodResolver(messageInputSchema), defaultValues: mode === "edit" ? { ...initial } : { recipient: "", body: "", timing: "posthumous" }, mode: "onChange" })`
    - `useAutoSave({ form, mutation: autoSaveMutation, delayMs: 800 })`
    - レイアウト:
      - 右上: `<SavingIndicator status={auto.status} onRetry={auto.retry} />`
      - 「宛先」`<Input>`（RHF register + max 50）
      - 「本文」`<Textarea rows={12} className="text-base leading-loose">`＋直下に「`{body.length} / 2000` 文字」を `text-muted-foreground` で
      - 「公開タイミング」`<RadioGroup>` — `TimingOption`（`RadioGroupItem` + `TimingBadge`）
      - （`mode === "edit"` のときのみ）フォーム下部に「削除」`Button variant="destructive"` → `ConfirmDialog`
    - **既定 `posthumous`**（DoD 1 番目）は `defaultValues.timing = "posthumous"` で担保。**Radio の初期選択もアンバー＋鍵のバッジ**が見える状態で開く。
    - **視覚差** (screen_spec §7): `max-w-prose mx-auto`、`text-base leading-loose`、上下 padding 広め。
  - **Loader / Body の 2 段構成** (`SectionForm` と同じ): 詳細画面のときは `useMessage(id)` の pending 中はスケルトンを見せ、`data` が揃ってから `MessageForm` をマウント。

- **D10. ルーティング / ページ骨格**（推奨: **案 A**）
  - **案 A（推奨）**:
    - `src/app/(app)/messages/new/page.tsx` — Client Component 一枚（`<MessageForm mode="create" />` を配置）。パンくず「大切な人へ ＞ 新規作成」を上部に。
    - `src/app/(app)/messages/[id]/page.tsx` — Client Component 一枚（`<MessageEditPage id={params.id} />` 相当、内部で `useMessage(id)` → `MessageForm mode="edit"`）。パンくず「大切な人へ ＞ 編集」。
    - `src/app/(app)/messages/page.tsx` — **変更なし**（#25 で完成、`<MessagesList />` を配置）。
  - **理由**: App Router の `[id]` セグメントで詳細ページを分けるのが自然、`params.id` を props に落として Client 側で `useMessage` を呼ぶ。

- **D11. `MessagesList` / `MessageCard` の改修**（推奨: **案 A**）
  - **案 A（推奨・#25 の TODO を消し込む）**:
    - `MessagesList.tsx`: 「+ 手紙を書く」CTA（ヘッダ / EmptyState の 2 箇所）を **`<Link href="/messages/new">` にラップ**した `Button asChild` に変更。`openCreateDialog` および `TODO(#26)` コメントを削除。
    - `MessageCard.tsx`: **`<Link href={/messages/${id}}>` でカード全体をラップ**、props に `id: string` を追加（`recipient`, `body`, `timing` に加えて）。既存の CSS は維持、ホバー / フォーカスリング（`MessagesCard.tsx` と同じ）を追加。
  - **既存テスト（#25 の Vitest / E2E）**:
    - `MessageCard.test.tsx`: `id` prop を要求するようになるため、既存テストで `id: "m1"` 等を渡す修正が必要。**リンクとして描画される**ことを追加検証。
    - `MessagesList.test.tsx`: CTA が Link であることを検証（`getByRole("link", { name: /手紙を書く/ })`）。
    - `e2e/messages.spec.ts`: `page.getByRole("button", { name: /手紙を書く/ })` を `getByRole("link", { name: /手紙を書く/ })` に変更。

- **D12. E2E シナリオ**（推奨: **案 A**）
  - **案 A（推奨・新規 `e2e/messages-form.spec.ts`）**:
    1. **`/messages/new` にアクセス → 何か入力 → 800ms 後に POST /messages が飛び、URL が `/messages/[id]` に書き換わる**（`page.waitForURL(/\/messages\/[^/]+$/)`）
    2. **既定 timing が posthumous**（`page.getByLabel("死後開示")` の RadioGroupItem が `checked` 状態）
    3. **素早い連続入力（3 回、200ms 間隔）→ 最後の入力後 800ms → POST が 1 回のみ**（`page.route` で回数カウント、DoD「保存回数が 1 回に収束」の担保）
    4. **既存の手紙（`/messages/[id]`）を開く → body を編集 → 800ms 後に PATCH /messages/{id} が飛ぶ**
    5. **timing を「常時共有」に切り替え → PATCH に `timing: "always"` が含まれる**
    6. **削除ボタン押下 → ConfirmDialog 表示 → 「削除」押下 → DELETE /messages/{id} → `/messages` に戻り一覧から消えている**
    7. **文字数上限（body 2000）を超えるとエラー表示、保存されない**
  - **既存 `e2e/messages.spec.ts` の修正**: CTA の `role` を button → link に変更（D11）。

- **D13. Vitest ユニット**（推奨: **案 A**）
  - **案 A（推奨）**:
    - `src/features/messages/schema/message.test.ts` — 新規。`messageInputSchema` の recipient/body max、timing enum の網羅
    - `src/features/messages/api/useCreateMessage.test.tsx` — 楽観的更新（tempId 挿入 → サーバ id で差替え）、失敗ロールバック（`useAddEntry.test.tsx` 参考）
    - `src/features/messages/api/useUpdateMessage.test.tsx` — 差分 PATCH、楽観的更新、ロールバック
    - `src/features/messages/api/useDeleteMessage.test.tsx` — filter による除去、ロールバック
    - `src/features/messages/api/useMessage.test.ts` — 200 / 404（`notFound` 相当のエラー） 
    - `src/features/messages/components/MessageForm.test.tsx` — 既定 timing=posthumous、文字数目安、削除ボタンの表示条件（edit のみ）、`useAutoSave` の集約特性は `useAutoSave.test.tsx` が保証済みなので**ここでは薄く**（`mutation.mutateAsync` のモックで初回 POST → 二回目 PATCH に切り替わる境界を検証）
    - `src/features/messages/components/MessageCard.test.tsx` — Link 化の検証を追加（既存を延長）
    - `src/features/messages/components/MessagesList.test.tsx` — CTA Link 化の検証を追加（既存を延長）
  - **`useAutoSave` 自体**: 既存 `useAutoSave.test.tsx` が集約特性・エラー保持・retry を担保しているため、**再テストしない**（重複）。

- **D14. ディレクトリ配置**（推奨: **案 A**）
  - **案 A（推奨）**: 実体は `src/features/messages/` に集約：
    ```
    src/features/messages/
      api/
        useMessages.ts        # #25 で作成済み
        useMessage.ts         # 新規（詳細取得）
        useCreateMessage.ts   # 新規
        useUpdateMessage.ts   # 新規
        useDeleteMessage.ts   # 新規
        useMessage*.test.*    # 新規
      components/
        MessagesList.tsx      # 既存を改修（CTA を Link 化）
        MessageCard.tsx       # 既存を改修（カード全体を Link 化 + id prop）
        MessagesCard.tsx      # ダッシュボード用（触らない）
        MessageForm.tsx       # 新規（作成 / 編集の中身）
        MessageForm.test.tsx  # 新規
        TimingRadio.tsx       # 新規（RadioGroup + TimingBadge、EntryDialog の TimingOption を message に切り出し）
      schema/
        message.ts            # 既存を拡張（Zod スキーマ追加）
        message.test.ts       # 新規
    src/app/(app)/messages/
      page.tsx                # #25 で作成済み、触らない
      new/page.tsx            # 新規
      [id]/page.tsx           # 新規
    src/lib/query/queryKeys.ts # messages.detail(id) を追加
    ```
  - **`TimingRadio` の抽出**: `EntryDialog.tsx` 内の `TimingOption` は notebook 配下の private 部品。同じパターンが message にも必要 → **本 Issue で `src/features/messages/components/TimingRadio.tsx` として切り出す**（3 箇所以上に増えたら `src/features/shared/` へ再抽出、`CLAUDE.md`「三つ揃ってから抽象化」原則）。

### タスク

- [ ] **D1〜D14 の意思決定をユーザーと合意**（本 plan を提示して承認を得る）
- [ ] **`src/lib/query/queryKeys.ts`** に `messages.detail(id)` を追加
  - [ ] `messages: { list: [...], detail: (id: string) => ["messages", "detail", id] as const }`
- [ ] **`src/features/messages/schema/message.ts`** に Zod スキーマ追加（D4/D5）
  - [ ] `messageInputSchema = z.object({ recipient: z.string().max(50), body: z.string().max(2000), timing: z.enum(["always", "posthumous"]) })`
  - [ ] `type MessageInput = z.infer<typeof messageInputSchema>`
- [ ] **`src/features/messages/schema/message.test.ts`** を新規作成（D13）
  - [ ] recipient max 50、body max 2000、timing enum の境界
- [ ] **`src/features/messages/api/useMessage.ts`** を新規作成（D8）
  - [ ] `fetchMessage(id)`: `apiFetch<{ message: Message }>('/messages/'+id)`
  - [ ] `useMessage(id)`: `queryKey: queryKeys.messages.detail(id)`, `retry: false`, `staleTime: 30_000`
- [ ] **`src/features/messages/api/useCreateMessage.ts`** を新規作成（D2/D6）
  - [ ] `createMessage(input)`: `POST /messages` + `X-XSRF-TOKEN`
  - [ ] `useCreateMessage()`: `onSuccess` で `queryKeys.messages.list` を invalidate（新規なので楽観的追加は D2 のラッパで扱うため、ここでは list invalidate のみ）＋ `queryKeys.notebook.summary` invalidate（`messagesCount`）
- [ ] **`src/features/messages/api/useUpdateMessage.ts`** を新規作成（D2）
  - [ ] `updateMessage({ id, ...diff })`: `PATCH /messages/{id}` + XSRF
  - [ ] `useUpdateMessage()`: 楽観的更新（`queryKeys.messages.detail(id)` を上書き）、失敗時ロールバック、`onSuccess` で `queryKeys.messages.list` を invalidate（一覧にも反映）
- [ ] **`src/features/messages/api/useDeleteMessage.ts`** を新規作成（D6）
  - [ ] `deleteMessage({ id })`: `DELETE /messages/{id}` + XSRF
  - [ ] `useDeleteMessage()`: 楽観的更新（`queryKeys.messages.list` から filter）、失敗時ロールバック、`onSuccess` で `queryKeys.notebook.summary` invalidate、toast
- [ ] **`src/features/messages/components/TimingRadio.tsx`** を新規作成（D3/D14）
  - [ ] props: `{ value: TimingVariant; onChange: (v: TimingVariant) => void; name?: string }`
  - [ ] 内部: `RadioGroup` + `RadioGroupItem` + `TimingBadge` + 説明文（`EntryDialog` の `TimingOption` を切り出し / 拡張）
- [ ] **`src/features/messages/components/MessageForm.tsx`** を新規作成（D2/D9）
  - [ ] props: `{ mode: "create" } | { mode: "edit"; initial: Message }`
  - [ ] RHF + Zod（`messageInputSchema`）
  - [ ] `useAutoSave`：初回 `create.mutateAsync` → `router.replace("/messages/{id}", { scroll: false })` → 以降 `update.mutateAsync`
  - [ ] `SavingIndicator`（右上）
  - [ ] recipient: `Input` + max 50
  - [ ] body: `Textarea rows={12} className="text-base leading-loose"` + 直下 `{body.length} / 2000`
  - [ ] `TimingRadio`（既定 posthumous）
  - [ ] edit のときのみ「削除」ボタン → `ConfirmDialog` → `useDeleteMessage`
  - [ ] error 遷移で 1 度きり toast（`SectionForm` と同じパターン）
- [ ] **`src/features/messages/components/MessageForm.test.tsx`** を新規作成（D13）
  - [ ] 既定 timing=posthumous（Radio の選択状態）
  - [ ] 文字数目安（`{body.length} / 2000`）
  - [ ] edit のとき削除ボタン表示、create のとき非表示
  - [ ] 初回 mutation は create、以降は update に切り替わる（`mutateAsync` モックで境界検証）
- [ ] **`src/features/messages/components/MessagesList.tsx`** を改修（D11）
  - [ ] CTA を `<Button asChild><Link href="/messages/new">+ 手紙を書く</Link></Button>` に置換
  - [ ] `openCreateDialog` および `TODO(#26)` コメントを削除
- [ ] **`src/features/messages/components/MessagesList.test.tsx`** を更新（D13）
  - [ ] CTA が Link であることを検証（`getByRole("link", { name: /手紙を書く/ })`）
- [ ] **`src/features/messages/components/MessageCard.tsx`** を改修（D7/D11）
  - [ ] props に `id: string` を追加
  - [ ] `<Card>` を `<Link href={/messages/${id}}>` でラップ（`MessagesCard.tsx` と同じホバー / フォーカスリング）
  - [ ] `aria-label={${recipient} を読む}`
- [ ] **`src/features/messages/components/MessageCard.test.tsx`** を更新（D13）
  - [ ] `id` prop を渡すよう修正
  - [ ] `getByRole("link", { name: /... を読む/ })` を検証
- [ ] **`src/app/(app)/messages/new/page.tsx`** を新規作成（D10）
  - [ ] `"use client"`
  - [ ] `<MessageForm mode="create" />` を配置
- [ ] **`src/app/(app)/messages/[id]/page.tsx`** を新規作成（D10）
  - [ ] `"use client"`
  - [ ] `params.id` を受けて `useMessage(id)` → pending スケルトン → data あれば `<MessageForm mode="edit" initial={data.message} />` → error（404）で `notFound()`
- [ ] **`e2e/messages.spec.ts`** の CTA role を button → link に変更（D11）
- [ ] **`e2e/messages-form.spec.ts`** を新規作成（D12）
  - [ ] シナリオ 1: `/messages/new` → 入力 → 800ms → POST → URL 遷移
  - [ ] シナリオ 2: 既定 posthumous の Radio 選択
  - [ ] シナリオ 3: 素早い連続入力 → POST が 1 回のみ（DoD）
  - [ ] シナリオ 4: `/messages/[id]` → 編集 → 800ms → PATCH
  - [ ] シナリオ 5: timing 切替 → PATCH に timing 含む
  - [ ] シナリオ 6: 削除 → ConfirmDialog → DELETE → 一覧遷移
  - [ ] シナリオ 7: body 2001 文字 → エラー表示、保存されない
- [ ] **既存 E2E の点検**
  - [ ] `messages.spec.ts` の CTA 部分修正が通ること
  - [ ] `notebook-entries.spec.ts` などが（`/messages` を触らない範囲で）そのまま通ること
- [ ] **既存 Vitest の点検**
  - [ ] `MessageCard.test.tsx`, `MessagesList.test.tsx` の更新が通ること

### 実装スケルトン（草案）

```ts
// src/lib/query/queryKeys.ts（差分）
export const queryKeys = {
  auth: { me: ["auth", "me"] as const },
  notebook: { /* 既存 */ },
  family: { members: ["family", "members"] as const },
  messages: {
    list: ["messages", "list"] as const,
    detail: (id: string) => ["messages", "detail", id] as const,
  },
} as const;
```

```ts
// src/features/messages/schema/message.ts（拡張）
import { z } from "zod";
import type { TimingVariant } from "@/features/notebook/components/TimingBadge";

// TODO(#20+): OpenAPI に /messages が定義され次第、src/types/generated から型を差し替える。
export type Message = {
  id: string;
  recipient: string;
  body: string;
  timing: TimingVariant;
  updated_at?: string;
};

export const messageInputSchema = z.object({
  recipient: z.string().max(50, "宛先は 50 文字以内で入力してください"),
  body: z.string().max(2000, "本文は 2000 文字以内で入力してください"),
  timing: z.enum(["always", "posthumous"]),
});

export type MessageInput = z.infer<typeof messageInputSchema>;
```

```tsx
// src/features/messages/components/MessageForm.tsx（骨格）
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/layout/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SavingIndicator } from "@/features/notebook/components/SavingIndicator";
import { useAutoSave, type AutoSaveStatus } from "@/features/notebook/hooks/useAutoSave";

import { useCreateMessage } from "../api/useCreateMessage";
import { useDeleteMessage } from "../api/useDeleteMessage";
import { useUpdateMessage } from "../api/useUpdateMessage";
import { messageInputSchema, type Message, type MessageInput } from "../schema/message";
import { TimingRadio } from "./TimingRadio";

type MessageFormProps =
  | { mode: "create" }
  | { mode: "edit"; initial: Message };

const BODY_MAX = 2000;

export function MessageForm(props: MessageFormProps) {
  const router = useRouter();
  const create = useCreateMessage();
  const update = useUpdateMessage();
  const del = useDeleteMessage();

  const initialValues: MessageInput =
    props.mode === "edit"
      ? { recipient: props.initial.recipient, body: props.initial.body, timing: props.initial.timing }
      : { recipient: "", body: "", timing: "posthumous" };

  const form = useForm<MessageInput>({
    resolver: zodResolver(messageInputSchema),
    defaultValues: initialValues,
    mode: "onChange",
  });

  const [messageId, setMessageId] = useState<string | null>(
    props.mode === "edit" ? props.initial.id : null,
  );

  const autoSaveMutation = useMemo(
    () =>
      ({
        mutateAsync: async (diff: Partial<MessageInput>) => {
          if (messageId === null) {
            const created = await create.mutateAsync({
              recipient: diff.recipient ?? "",
              body: diff.body ?? "",
              timing: diff.timing ?? "posthumous",
            });
            setMessageId(created.id);
            router.replace(`/messages/${created.id}`, { scroll: false });
          } else {
            await update.mutateAsync({ id: messageId, ...diff });
          }
        },
      }) as unknown as Parameters<typeof useAutoSave<MessageInput>>[0]["mutation"],
    [create, update, router, messageId],
  );

  const auto = useAutoSave<MessageInput>({
    form,
    mutation: autoSaveMutation,
    delayMs: 800,
  });

  // error 遷移で 1 度きり toast（SectionForm と同じ）
  const prevStatusRef = useRef<AutoSaveStatus>(auto.status);
  useEffect(() => {
    if (auto.status === "error" && prevStatusRef.current !== "error") {
      toast.error("保存できませんでした。時間をおいて再度お試しください");
    }
    prevStatusRef.current = auto.status;
  }, [auto.status]);

  const body = form.watch("body");

  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <section className="mx-auto flex w-full max-w-prose flex-col gap-6">
      <div className="flex justify-end">
        <SavingIndicator status={auto.status} onRetry={auto.retry} />
      </div>

      <form noValidate onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-6">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">宛先</span>
          <Input
            type="text"
            maxLength={50}
            placeholder="例：妻へ"
            {...form.register("recipient")}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">本文</span>
          <Textarea
            rows={12}
            maxLength={BODY_MAX}
            placeholder="伝えたいことを綴りましょう。"
            className="text-base leading-loose"
            {...form.register("body")}
          />
          <span className="self-end text-sm text-muted-foreground tabular-nums">
            {body.length} / {BODY_MAX}
          </span>
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">公開タイミング</span>
          <TimingRadio
            value={form.watch("timing")}
            onChange={(v) => form.setValue("timing", v, { shouldDirty: true })}
          />
        </div>
      </form>

      {props.mode === "edit" ? (
        <div className="flex justify-end">
          <Button
            variant="destructive"
            onClick={() => setConfirmDelete(true)}
          >
            この手紙を削除する
          </Button>
        </div>
      ) : null}

      {props.mode === "edit" ? (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="この手紙を削除しますか？"
          description="削除すると元に戻せません。"
          confirmLabel="削除する"
          variant="destructive"
          onConfirm={async () => {
            await del.mutateAsync({ id: props.initial.id });
            router.replace("/messages");
          }}
        />
      ) : null}
    </section>
  );
}
```

```tsx
// src/features/messages/components/TimingRadio.tsx（骨格）
"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TimingBadge, type TimingVariant } from "@/features/notebook/components/TimingBadge";

type TimingRadioProps = {
  value: TimingVariant;
  onChange: (v: TimingVariant) => void;
  name?: string;
};

export function TimingRadio({ value, onChange, name }: TimingRadioProps) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(v as TimingVariant)}
      aria-label="公開タイミング"
      name={name}
      className="gap-3"
    >
      <Option value="always" description="家族がいつでも読めます。" />
      <Option value="posthumous" description="解放されるまで家族には見えません。" />
    </RadioGroup>
  );
}

function Option({ value, description }: { value: TimingVariant; description: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <RadioGroupItem value={value} className="mt-1" />
      <div className="flex flex-col gap-1">
        <TimingBadge variant={value} />
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </label>
  );
}
```

```tsx
// src/app/(app)/messages/new/page.tsx
"use client";

import { MessageForm } from "@/features/messages/components/MessageForm";

export default function NewMessagePage() {
  return <MessageForm mode="create" />;
}
```

```tsx
// src/app/(app)/messages/[id]/page.tsx
"use client";

import { notFound } from "next/navigation";
import { use } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useMessage } from "@/features/messages/api/useMessage";
import { MessageForm } from "@/features/messages/components/MessageForm";

export default function EditMessagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isPending, isError } = useMessage(id);

  if (isPending) {
    return (
      <div className="mx-auto flex w-full max-w-prose flex-col gap-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (isError || !data) {
    notFound();
  }

  return <MessageForm mode="edit" initial={data.message} />;
}
```

## 完了条件（DoD）

Issue の DoD を転記:
- [ ] **新規手紙は既定で `posthumous`**
  - `MessageForm` の `defaultValues.timing = "posthumous"`（`mode: "create"`）で担保。E2E で Radio の選択状態を検証。
- [ ] **素早い入力で保存回数が 1 回に収束**
  - `useAutoSave` の集約特性で担保（`useAutoSave.test.tsx` で単体保証済み）。E2E で 3 回連続入力 → POST が 1 回のみ、を追加。
- [ ] Issue の作業内容チェックリスト:
  - [ ] 宛先 + 本文の Zod スキーマ（`messageInputSchema`）
  - [ ] 本文は複数行 textarea + 文字数目安表示（`Textarea rows={12}` + `{body.length} / 2000`）
  - [ ] 自動保存（`useAutoSave` を再利用、`MessageForm` から呼ぶ）
  - [ ] `TimingBadge` で切替可能（`TimingRadio` = `RadioGroup` + `TimingBadge`）
  - [ ] 削除 `ConfirmDialog`（既存 `ConfirmDialog` を編集画面下部から起動）

## リスク / 確認事項

- **D1（詳細ページ方式 vs ダイアログ方式）**: 案 A（詳細ページ）は Issue の作業内容と直接は書かれていないが、`docs/screen_spec.md` §7「本文は複数行」「事務セクションと視覚的に差をつける（余白広く、行間広く）」を満たすには詳細ページ方式が妥当。**ユーザーが「ダイアログで済ませたい」と希望する場合は要指示**。
- **D2（初回 POST のタイミング）**: 案 A では「初回入力時に POST」する。バックに未確定ドラフトを残さないメリットがある一方、**初回の入力〜POST の間にユーザーが離脱するとロスト**する。debounce 800ms のためリスクは小さいが、要相談。
- **D5（Zod の `min(1)` を外す判断）**: 「書き途中を保存できる」ことを優先し、`recipient` / `body` の `min(1)` を Zod では課さず、UI 側のヒント表示にとどめる。**バック側で最終検証**する前提。バック側で `min(1)` が入る場合、フロントの Zod と整合させる必要がある（`kotozute-api` 実装時に確認）。
- **D6（削除の位置）**: 一覧カードには削除ボタンを付けず、詳細画面のみに集約する方針。**ユーザーが「一覧からも削除したい」と希望する場合は要指示**（実装コストは小、E2E も 1 本追加で対応可）。
- **D8（`useMessage` の 404 → `notFound()`）**: 既存パターンの `useEntries` は 404 を空にフォールバックしているが、詳細画面では **404 = 存在しない ID なので Next の 404 に流す**方が UI として正しい。ユーザー側に 404 ページの共通スタイルが無ければ、`notFound()` の代わりに `<EmptyState title="手紙が見つかりません" ... />` を返す選択肢もある（要相談）。
- **`TimingVariant` の import 経路**: 現状 `@/features/notebook/components/TimingBadge` からしか公開されていない。`TimingRadio` からも import する（**#25 の plan.md でも同じ議論**、抽出は「三箇所以上」に増えた時点で行う原則）。
- **バック契約（`kotozute-api`）**: `POST /messages`、`GET /messages/{id}`、`PATCH /messages/{id}`、`DELETE /messages/{id}` が未実装。フロントは 4xx で `SavingIndicator` が error 遷移するのみで UI は崩れないが、**バック実装完了までは実データが動かない**旨を PR に明記。
- **`useCreateMessage` の楽観的更新の位置**: 詳細ページで作成する場合、一覧キャッシュ (`queryKeys.messages.list`) にも即座に反映したい。`onSuccess` で invalidate すれば済むが、`onMutate` で tempId 挿入する `useAddEntry` パターンをこの UI で採用すると URL 遷移との整合が難しい。**本 Issue では `onSuccess` invalidate のみ**とし、シンプルさを優先する。
- **エディタ / ページ離脱時の未保存分**: 800ms 以内に離脱するとロストする。`beforeunload` ハンドラは MVP スコープ外（`notebook` 側でも実装されていない）。ユーザーが強く求める場合のみ検討。
- **`MessagesCard.tsx` と `MessageCard.tsx` の命名紛らわしさ**: #25 の plan.md でも指摘済み。本 Issue では触らない。

## 参照
- `CLAUDE.md` 絶対ルール #1（features 単位）／ #2（TanStack Query）／ #6（TimingBadge）／ #8（family は API 依存）
- `docs/frontend_design.md` §状態管理 / §UI・デザイン実装 / §セキュリティ
- `docs/screen_spec.md` §共通仕様（状態・ロールによる出し分け）／ §7 大切な人へ
- `docs/issues/25/plan.md`（一覧・カードの土台、`useMessages` / `TODO(#26)` の起点）
