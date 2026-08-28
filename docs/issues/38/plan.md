# Issue #38 — W4-08 [E2E] Playwright: 記入 → 家族招待 → 家族閲覧のシナリオ

- URL: https://github.com/hasedai0000/kotozute-web/issues/38
- ラベル: frontend, week-4
- マイルストーン: MVP-Week4

## Issue 概要
MVP のコアバリュー（家族と常時共有）が壊れないよう、E2E で守る。owner が entry を追加 → family を招待 → 別セッションで受諾 → family として `always` のエントリが閲覧できることを、1 本の Playwright spec で貫通させる。CI でも実行し、失敗時のスクリーンショット / trace を artifact に残す。

## 調査結果

### 関連ドキュメント
- `CLAUDE.md`（絶対ルール）— #6 `TimingBadge`（常時共有＝グリーン／死後開示＝アンバー＋鍵）、#8「死後開示の項目は API が返さない限り存在しない前提」。→ 家族セッションでは `posthumous` を返さないスタブにする。
- `docs/screen_spec.md §共通仕様（ロールによる出し分け）` — 家族ロールは編集不可・`posthumous` は API が返さない。閲覧テストは「編集 UI が出ていないこと」と「always だけが見えること」を確認する。
- `docs/screen_spec.md §3 家族・共有管理` — `/family` の招待発行フロー（メール入力 → 「送信」ボタン → 招待中一覧に反映）。既存 `e2e/family-invite.spec.ts` と同じ操作系。
- `docs/screen_spec.md §6 招待の受諾` — `/invitations/[token]` は「有効／未ログイン」→ ログイン導線、「有効／ログイン済」→ `参加する` ボタン。受諾後は `family_members` に追加され `/dashboard` に遷移する想定。
- `docs/frontend_design.md §テスト` — 「記入 → 家族招待 → 家族が閲覧」を Playwright の主要シナリオとして明示。この Issue はまさにその実装。

### 関連コード
- `e2e/family-invite.spec.ts` — 招待発行部分の stubbing 流儀（`FAMILY_INVITATIONS_URL_RE`、`invitationsRef.list` を let で差し替え）。同じスタイルで拡張する。
- `e2e/notebook-entries.spec.ts` — entry CRUD 部分の stubbing 流儀（`ENTRIES_URL_RE`、`entries` 配列を let で差し替え）。owner セッション側の「entry 追加」に流用する。
- `e2e/notebook-entry-dialog.spec.ts` — `/notebook/money` でのダイアログ操作の実例。UI 操作の順序（`銀行口座 を追加` → `銀行名` fill → `保存`）はそのまま流用可。
- `src/app/invitations/[token]/page.tsx` — 招待受諾ページの実装。`verifyInvitation()` が `status: "valid"` を返し、ログイン済なら `AcceptInvitationForm` が描画される。E2E では `verifyInvitation` が叩く endpoint と、`useAcceptInvitation` の POST 先を stub する必要がある。
- `src/features/family/api/verifyInvitation.ts` / `useAcceptInvitation.ts` — 招待検証と受諾の API 呼び出し。stub 対象。
- `src/features/family/components/FamilyContent.tsx` — `user.role !== "family"` で管理 UI を出し分け。family セッション時は招待ボタンが出ないことを確認する（副次的な DoD）。
- `src/features/auth/hooks/useIsOwner.ts` — `role` で `always/posthumous` の描画を左右。family セッションのスタブ側で `user.role = "family"` を返せば分岐が動く。
- `playwright.config.ts` — 現状 `trace: "on-first-retry"` のみ。DoD の「スクリーンショット / trace が artifact に保存される」を満たすため `screenshot: "only-on-failure"` を追加する必要がある。動画は `video: "retain-on-failure"` を候補として検討。
- `.github/workflows/ci.yml` — 既に `playwright-report/` を `if: always()` で upload。上記 config を足せば失敗時スクリーンショットは report に埋め込まれ、そのまま artifact に載る。追加ジョブは不要。

### 依存関係
- 依存なし（W4 系の他 Issue #34/#35/#36 で招待受諾フロー・家族ロール・招待発行 UI は既に着地済み）。この Issue はそれを E2E で束ねる位置づけ。
- 関連 Issue: #22（family-invite.spec.ts の元）、#24（entry 追加の元）、#35（招待受諾）、#36（family-readonly）。

## やること

- [ ] `e2e/family-share.spec.ts` を新規作成（既存 spec と同じ「API を `page.route` で stub して縦串を通す」流儀）。
    - 【シナリオ】1 本の test で、`browser.newContext()` で **owner 用**と **family 用**の 2 コンテキストを作り、共有可変ステート（`entries` / `invitations` / 各コンテキストの `user.role`）を let で持ち回す。
    - 【owner】`setSessionCookie` → `/notebook/money` を開き、`銀行口座 を追加` → `銀行名` に「◯◯銀行」→ `保存`。POST /note-entries で `entries.push` し、以後の GET が返すように stub。
    - 【owner】`/family` を開き、`家族を招待` → `メールアドレス` に `family@example.com` → `送信`。POST /family/invitations で `invitations.push`（`token` を発行）。
    - 【family】招待メールは実際には送らないので、テスト側で `pending` 招待の `token` を取り出し `/invitations/<token>` に遷移。
    - 【family】未ログイン状態から `verifyInvitation` の GET を `status: "valid"` で stub → ログインリンクへ。今回は簡潔さのため family も `setSessionCookie` を先に張り「有効 + ログイン済」で表示させ、`参加する` ボタンを押す（`useAcceptInvitation` の POST を stub → 成功で `me` の role を `"family"` に切替）。
    - 【family】`/notebook/money` を開き、`銀行口座 を追加` ボタンが**存在しない**ことを確認。owner が追加した「◯◯銀行」カードが**閲覧できる**ことを確認。
    - 【family】(#8 の担保) `posthumous` は API が返さないので描画されない — GET /note-entries の family 用 stub は `entries.filter(e => e.timing === "always")` を返す。事前に owner が `posthumous` の entry を 1 件追加（例: 「秘密銀行」）→ family 側では見えないことを確認。
- [ ] `playwright.config.ts` に `use.screenshot: "only-on-failure"` を追加（trace は現状の `on-first-retry` を維持）。動画は必要になったら別 Issue で追加する。
- [ ] CI（`.github/workflows/ci.yml`）は既存 `Upload Playwright report` (`if: always()`) がそのまま失敗時のスクリーンショット/trace を含む HTML レポートを artifact に載せる。**追加のジョブ / step は不要**。上記 config 変更のみで DoD を満たす。
- [ ] ローカルで `npm run test:e2e -- e2e/family-share.spec.ts` が緑を確認。
- [ ] PR 上で CI（e2e ジョブ）が緑を確認。故意に spec を落として `playwright-report` に screenshot + trace が入ることを 1 度目視で確認（PR 説明に貼る）。

## 完了条件（DoD）
- [ ] ローカルと CI で `e2e/family-share.spec.ts` がパス
- [ ] 失敗時にスクリーンショット / trace が `playwright-report` artifact に保存される（`screenshot: "only-on-failure"` + 既存 upload step で成立）

## リスク / 確認事項

- **バックエンド未実装で E2E を「縦串」と呼べるか**：既存 spec と同じく `page.route` で API を stub する方針を踏襲する。真の統合テスト（実 DB + Laravel）は別枠（Week5 以降）と割り切る。この Issue のスコープは **フロントの UI ワイヤリングが壊れていないことを保証する縦串** に留める。異論があれば実装前に方針を再確認する。
- **`/invitations/[token]` は Server Component**：`verifyInvitation` を SSR で叩くため、`page.route`（ブラウザ側インターセプト）ではスタブ不能（実装中に判明）。招待受諾 UI 単体は `src/features/family/components/AcceptInvitationForm.test.tsx` などで unit-test 済みなので、E2E では**招待発行（owner）＋受諾済み状態での閲覧（family）**を主要担保にする。真の招待受諾 UI の縦串テストは、API が生えて mock server（NEXT_PUBLIC_API_URL 経由）を用意できる Week5 以降に別 Issue で扱う。
- **2 コンテキストの持ち回し**：`entries` / `invitations` / `user.role` を let で共有するため、`stubBaseApi` を関数に切り出し `context` ごとに `page.route` を張る形にする（既存 `family-invite.spec.ts` に近い書き方）。テストが太くなるのを避けるため、`test.describe.serial` は使わず 1 test にまとめる。
- **招待受諾後の role 切替**：現状 `useMe` は role を optional で返し未定義は owner 扱い（`useMe.ts` コメント参照）。family セッションの `/user` stub で `role: "family"` を返せば `FamilyContent` / `useIsOwner` の分岐が動く。#35 の受諾フローで `queryClient.invalidateQueries(["me"])` が走ることは確認済み。stub 側は「受諾後は role: family を返す」ように切り替える。
- **screenshot の粒度**：`only-on-failure` はコスト最小。もし artifact サイズが問題になれば `off` に戻し trace のみに寄せる選択肢もあるが、DoD が「スクリーンショット / trace」を明示しているので **screenshot は入れる**。
- **retries=2 on CI**：既存 config で CI は 2 回リトライ。フレークが目立ったら別 Issue で扱う（この Issue では触らない）。

## 参照
- `CLAUDE.md`
- `docs/frontend_design.md`（§テスト、§状態管理）
- `docs/screen_spec.md`（§共通仕様 / §3 家族・共有管理 / §6 招待の受諾）
- 既存 spec: `e2e/family-invite.spec.ts`, `e2e/notebook-entries.spec.ts`, `e2e/notebook-entry-dialog.spec.ts`
- `.github/workflows/ci.yml`, `playwright.config.ts`
