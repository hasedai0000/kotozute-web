# Issue #34 — W4-04 [F-08] 招待受諾（トークン検証・未ログイン → login 経由の戻し）

- URL: https://github.com/hasedai0000/kotozute-web/issues/34
- ラベル: frontend, week-4
- マイルストーン: MVP-Week4

## Issue 概要
`/invitations/[token]` を**サーバコンポーネントでトークン検証**し、状態（有効／期限切れ／使用済み／不正）で表示を分ける。**未ログイン**の場合は `/login?redirect=/invitations/[token]`（および `/register` 側も同じ redirect）へ誘導し、ログイン後に元の招待ページへ戻れるようにする。**無効な招待では「何のノートか／誰の招待か」を漏らさない**。本 Issue は「検証と分岐まで」で、**受諾ボタンの実装（`useAcceptInvitation` → `/dashboard`、招待者名の表示、アカウント違いの警告）は #35 に譲る**。現状 `src/app/invitations/[token]/page.tsx` は `token: ...` を素で表示する仮実装なので、置き換える。

## 調査結果

### 関連ドキュメント
- `CLAUDE.md` 絶対ルール —
  1. **features 単位で割る**：verify のクライアント／型は `src/features/family/api/` に置き、`src/app/invitations/[token]/page.tsx` はルーティング＋レイアウトに専任させる（token を feature に渡すだけ）。
  2. **サーバ状態は TanStack Query が唯一の真実**：ただし本 Issue の検証は **RSC で 1 回だけ**行うため（trust の起点をサーバに置く / 未ログイン時に不要な CSR fetch を避ける）、`useQuery` ではなく `async function` で API を叩く。**#35 で「参加する」mutation を作る際に TanStack Query に載せる**。
  3. **トークンをフロントで保持しない**：Sanctum SPA 認証。**招待トークン**は「有効期限つき使い捨て」であり Sanctum の auth token とは別物なので、URL パラメータで扱ってよい（`docs/frontend_design.md` §画面とパス「例外は招待トークンのみで、有効期限つき・DB はハッシュ保存」）。
  5. **デザイントークンを使う**：カード／余白／色は Tailwind theme。直値の色コードは書かない。
- `docs/screen_spec.md` §6 招待の受諾 — 本 Issue の一次仕様。
  - 「**トークン検証：有効／期限切れ／使用済み／不正 を判定**」← 本 Issue の中核
  - 有効ケース：「招待者の表示名と『◯◯さんからノートの共有に招待されています』を表示。未ログイン → ログイン／登録へ（**招待トークンを保持して戻す**）」
  - **無効ケース**：「期限切れ・使用済みはその旨のみ表示し、**何のノートか・誰の招待かは明かさない**。**再送を依頼する案内を出す**」← DoD 1 の核
  - 「招待メールと異なるアカウントでログイン中の場合は注意を表示」← **#35 スコープ**（本 Issue では扱わない）
  - 「受諾は `audit_logs` に記録」← #35 スコープ
- `docs/screen_spec.md` §共通仕様「状態の出し分け」— ローディングはスケルトン、エラーは内容と再試行、権限エラーは「閲覧権限がありません」。**本 Issue は RSC 検証なのでローディング状態はほぼ無い**（fetch 完了後に描画）。fetch 自体が失敗した場合（500 等）は再試行案内を出す。
- `docs/frontend_design.md` §画面とパス — `/invitations/[token]` は**公開エリア**（未認証で到達可）。`(app)` 配下ではないので middleware でガードされない。「例外は招待トークンのみで、有効期限つき・DB はハッシュ保存」。
- `docs/frontend_design.md` §API 通信と型 — Scramble → openapi-typescript の自動生成が原則だが、本 Issue の verify エンドポイントは未定義想定なので **手書き型 + `TODO(#34+)`** で進める（`useInvitations` / `useInvite` / `useRevokeMember` と同じ流儀）。
- `docs/frontend_design.md` §認証 — 「認証必須エリアは Route Group `(app)` ＋ middleware でガード。未認証は `/login` へ」。**招待受諾は公開エリアなので middleware は使えない**。**未ログイン判定はサーバコンポーネント自身で行う**（cookie 有無 or API に問い合わせ）。
- `docs/frontend_design.md` §セキュリティ — 「死・不安を煽らない」トーン。無効時の文言は簡潔かつ非漏洩に。

### 関連コード
- `src/app/invitations/[token]/page.tsx:1-15` — **本 Issue で書き換える主対象**。現状は `params.token` を素で `<p>` に表示するだけの仮実装（W1 で作った枠）。App Router の `params: Promise<{ token }>` 形式なので `await` を維持する。
- `src/app/(auth)/login/page.tsx:1-34` — 既存。**変更不要**。`<LoginForm>` を `<Suspense>` でラップしており、`useSearchParams` の redirect param を拾える。
- `src/app/(auth)/register/page.tsx:1-34` — 既存。**変更不要**。`<RegisterForm>` も同じく `useSearchParams` を拾う。
- `src/features/auth/components/LoginForm.tsx:33-51` — **redirect 実装の既存**。`sanitizeRedirect(searchParams.get("redirect")) ?? "/dashboard"`。ログイン成功後に `router.push(redirectTo)`。**本 Issue で `/login?redirect=/invitations/[token]` を投げれば、ログイン後に自動で戻ってくる**。追加改修は不要。
- `src/features/auth/components/RegisterForm.tsx:42-65` — 同上。登録完了後も `router.push(redirectTo)`。**登録リンクにも同じ redirect を付ければ良い**。
- `src/features/auth/lib/redirect.ts:1-7` — `sanitizeRedirect`。`/foo` のような相対パスのみ許可、`//evil.com` や `https://` は弾く。**本 Issue の `/invitations/[token]` は先頭 `/` から始まる相対パスなので通過する**。追加改修は不要。
- `src/middleware.ts:37-52` — matcher に `/invitations/*` は**含まれていない**（意図的：未認証でも到達可能でなければ受諾できない）。**本 Issue でも matcher は変えない**。
- `src/lib/api/client.ts:1-73` — `apiFetch`。ブラウザ用に `credentials: "include"`（クッキー自動送信）で書かれている。**サーバコンポーネントから呼ぶには、cookies() の値を明示的に `Cookie` ヘッダに載せる必要がある**（Next.js の RSC fetch はブラウザではないため）。→ **選択肢** は後述「リスク / 確認事項」。
- `src/lib/api/errors.ts:1-93` — `ApiError`。`.status` で分岐できる。verify エンドポイントの HTTP コード方針（404? 410? 200 で `{ status: "expired" }`?）は未確定。**本 Issue では「200 でステータスを返す」に寄せる**（HTTP レイヤーで意味論を運ばず、body で "valid" / "expired" / "used" / "not_found" を返す想定）。理由：無効ケースを 404 で返すと Next.js の `notFound()` 分岐との相性はよいが、`used` と `expired` を区別できない。
- `src/features/family/api/useInvitations.ts:5-33` — **未定義エンドポイントの手書き型 + TODO コメント + 404 フォールバックの見本**。本 Issue の verify クライアントも同じ流儀で書く。
- `src/features/family/api/useInvite.ts:1-25` — SPA 側での invitations mutation。**本 Issue では触らない**（受諾 mutation は #35）。
- `src/features/family/schema/invite.ts` — Zod スキーマ。**本 Issue は受諾フォームを持たないので Zod 追加は不要**（token は URL から来るだけで、フォーム入力なし）。
- `src/middleware.test.ts:39-70` — middleware の Vitest テスト構造の参考。本 Issue では middleware を変えないので追加テストは不要。
- `src/features/auth/lib/redirect.test.ts:1-28` — **本 Issue の redirect 検証にそのまま流用**。`sanitizeRedirect("/invitations/xxx")` が通ること／`//evil` 系が弾かれることは既存テストで既に緑。
- `src/features/auth/components/LoginForm.test.tsx:122-141` — redirect 挙動の RTL テスト見本。本 Issue で `LoginForm` は変更しないため追加不要。

### 依存関係
- **先行**：なし。#31–#33（Week4 家族・共有管理）はマージ済みだが、本 Issue は招待受諾フロー側で独立している。
- **並列 / 独立**：
  - **#35 W4-05**（招待受諾：ログイン済み → 参加 → dashboard、期限切れ表示）— **本 Issue のすぐ後続**。#34 が「検証と分岐まで」、#35 が「有効ケースの参加ボタン + `useAcceptInvitation` + 招待者名 + アカウント違い警告」を担う。**触るファイルは同じ `/invitations/[token]/page.tsx` になるためコンフリクト注意**。本 Issue のマージ後に #35 が引き継ぐ設計にする。
  - #36 W4-06（family ロール閲覧専用）— 受諾後の ロール判定に影響するが、本 Issue はロール判定を触らない。
  - #38 W4-08（Playwright E2E: 記入 → 家族招待 → 家族閲覧）— **有効ケースのフル受諾**は #35 完了後の #38 で E2E を書く想定。本 Issue の E2E スコープは「無効ケースの表示」「未ログイン時に login へ redirect が付いて飛ぶ」だけに絞る（あるいはユニットで十分と判断してスキップ、要ユーザー確認）。
- **参照のみ（バック側 API）**：
  - `GET /invitations/{token}/verify`（想定）— 未整備の想定。**手書き型 + TODO(#34+)** で進める。
  - 認証状態の判定：`GET /me`（`useMe` が既存）。SSR から呼ぶには Cookie 転送が必要。**または cookie 有無だけで一次判定**（middleware と同じ手法）。

## やること

### 1. 検証クライアント（`src/features/family/api/verifyInvitation.ts`）を新設
- [ ] Server Component から呼ぶための **非フック関数** として作る（`useXxx` にしない。理由：RSC 内で `useQuery` は使えない）
- [ ] `type InvitationVerificationResult = { status: "valid"; inviterName: string; familyName?: string } | { status: "expired" } | { status: "used" } | { status: "not_found" }` を定義
- [ ] `verifyInvitation(token: string, opts?: { cookieHeader?: string }): Promise<InvitationVerificationResult>` を実装
  - `apiFetch<...>` を経由する（Cookie 転送のため `headers: { Cookie: cookieHeader }` を渡す設計）。**未ログイン時は cookie 無しでも動くこと**（このエンドポイントは招待トークンで認証されるはず）。
  - HTTP コード方針：
    - 200 の body に `{ status }` を含める設計を想定
    - 404 → `{ status: "not_found" }` にマップ（既存の `useInvitations` と同じ fallback 流儀）
    - 410（Gone）→ `{ status: "expired" }` にマップ（バックの実装次第）
    - 409（Conflict）→ `{ status: "used" }` にマップ（同上）
    - **バック契約が未確定なので、200 body の `status` フィールドを主契約とし、上記のマッピングはフォールバックとして書く**
  - **`inviterName` / `familyName` は "valid" のときのみ返す**。無効ケースでは絶対に返さない（サーバ側が返さない前提だが、フロントも defensive にドロップ）。
- [ ] `// TODO(#34+): OpenAPI に GET /invitations/{token}/verify が定義され次第、src/types/generated から型を差し替える。` を残す
- [ ] ネットワークエラー時（`ApiError.status === 0`）は例外を再 throw して、ページ側で「再試行」表示に落とす

### 2. サーバコンポーネントを書き換え（`src/app/invitations/[token]/page.tsx`）
- [ ] `"use client"` は付けない（RSC のまま）
- [ ] `params` を `await` して `token` を取得（既存を維持）
- [ ] **cookies() 転送 or cookie 有無判定**：
  - `import { cookies } from "next/headers"` で Cookie を読み、`Cookie` ヘッダ文字列を組み立てて `verifyInvitation(token, { cookieHeader })` に渡す
  - **未ログイン判定**：Sanctum のセッション cookie（`middleware.ts:6-8` の `_session` サフィックス or `laravel_session`）が無ければ「未ログイン」とみなす。**middleware と同じロジックを共通関数 `hasSessionCookie` にリファクタして共用**（`src/lib/auth/session-cookie.ts` などに切り出し、`middleware.ts` からも参照）
    - **代替案**：middleware に閉じ込めたまま、page 側では別途 `/me` を叩く。**採用は「共通化」**（middleware と重複させない、テスト容易性）
- [ ] `verifyInvitation` の呼び出しを try/catch し、以下に分岐：
  - **`status === "valid"` かつ未ログイン**：
    - **本 Issue の主要ケース**。ページに次を描画：
      - タイトル：「招待の受諾」
      - 本文：`"ノートの共有に招待されています。ログインまたは新規登録をして、招待を受け取ってください。"`（**招待者名や家族名は出さない**。理由：この段階では認証されていないため、valid だからといって漏らして良いとは限らない — 要ユーザー確認）
      - CTA 2 本：
        - `<Link href={`/login?redirect=${encodeURIComponent("/invitations/" + token)}`}>ログイン</Link>`
        - `<Link href={`/register?redirect=${encodeURIComponent("/invitations/" + token)}`}>新規登録</Link>`
      - **redirect 先の作り方は `encodeURIComponent` で URL エンコード**（既存 `middleware.ts:29-32` と同流儀）
  - **`status === "valid"` かつログイン済み**：
    - 本 Issue のスコープ外（#35 が担当）。**プレースホルダとして最小限を描画**：
      - タイトル + 「参加するボタンは準備中です（#35）」的な TODO をコメントアウトで残す
      - **暫定描画**：「招待を受け取る準備ができています」「参加する」ボタン（disabled or noop、`data-testid="accept-invitation"` を付与しておくと #35 で拾いやすい）
      - **要ユーザー確認**：本 Issue で「参加する」ボタンの見た目だけ作るか、完全に #35 に譲るか
  - **`status === "expired"` / `"used"` / `"not_found"`**（**無効ケース**、DoD 1）：
    - **すべて同一の文言**にまとめて **「何のノートか／誰の招待か」を出さない**：
      - タイトル：「招待リンクが無効です」
      - 本文：「この招待リンクは有効期限が切れているか、既に使用されているか、正しくありません。**招待した方に再送を依頼してください**。」
      - **status 別の言い分けはしない**（screen_spec §6：無効はその旨のみ）
      - 補助リンク：「ホームへ戻る」`<Link href="/">`
    - **HTTP ステータスは 200 で描画**（`notFound()` を使うと Next のデフォルト 404 ページが出て文言を制御しにくいので**使わない**）
  - **`fetch` 例外（ネットワーク / 5xx）**：
    - タイトル：「一時的なエラー」
    - 本文：「時間をおいてもう一度お試しください。」
    - リロード用のリンク（`<Link href={`/invitations/${token}`}>再試行</Link>` or `<a>` で `location.reload()` を促す短い client component）
- [ ] `metadata` は `title: "招待の受諾 | ことづて"` を静的に設定（token を title に含めない — 検索エンジン漏洩防止）
- [ ] レイアウトは `/login` / `/register` のカード基調と揃える（`flex min-h-[calc(100dvh-4rem)] ...`、`w-full max-w-md space-y-6 rounded-2xl border bg-background p-8 shadow-sm`）

### 3. セッション cookie 判定の共通化（`src/lib/auth/session-cookie.ts`）
- [ ] `middleware.ts:6-19` の `hasSessionCookie` ロジックを **共通関数** として抽出
  - `export const hasSessionCookieFromCookies = (all: { name: string }[]): boolean => ...`
  - `export const SESSION_COOKIE_SUFFIX = "_session"`
  - `export const DEFAULT_SESSION_COOKIE = "laravel_session"`
- [ ] `middleware.ts` を書き換えて共通関数を import（**挙動は完全に同じ**、既存 `middleware.test.ts` は緑を維持）
- [ ] `page.tsx` からは `const jar = await cookies(); const isLoggedIn = hasSessionCookieFromCookies(jar.getAll());`
- [ ] **依存が最小になる形にする**：この共通関数は cookie 名以外に何も知らない。API 呼び出しはしない。

### 4. テスト（Vitest）
- [ ] `src/features/family/api/verifyInvitation.test.ts` を新設
  - `vi.stubGlobal("fetch", fetchMock)` で `apiFetch` を差し替え、以下を検証：
    - **200 `{ status: "valid", inviterName, familyName }`** → 同値が返る
    - **200 `{ status: "expired" }`** → `{ status: "expired" }` が返り、`inviterName` などが**含まれない**
    - **200 `{ status: "used" }`** → `{ status: "used" }`
    - **200 `{ status: "not_found" }`** → `{ status: "not_found" }`
    - **404** → `{ status: "not_found" }` にフォールバック
    - **500** → 例外を再 throw（`ApiError.status === 500`）
    - **cookieHeader を渡すと fetch の headers に `Cookie` が乗る**（未ログイン時は乗らない）
- [ ] `src/lib/auth/session-cookie.test.ts` を新設（`middleware.test.ts` を分解）
  - セッション cookie あり → true
  - `_session` サフィックスあり → true
  - 無関係な cookie のみ → false
  - 空 → false
- [ ] `src/middleware.test.ts` の既存テストが**引き続き緑**であること（挙動を変えない）
- [ ] **`page.tsx` の RSC 直接テストは書かない**（RSC は Vitest + happy-dom で扱いにくいため）。代わりに **verify クライアント単体 + session-cookie 単体で分岐ロジックを担保**する。ページ描画の視覚検証は Playwright に譲る（次項参照）。

### 5. E2E（Playwright）
- [ ] **既定案：本 Issue で最小 1 スペックを追加**（`e2e/invitation-verify.spec.ts`）：
  - **無効トークン**（`/invitations/invalid-token`）→ 「招待リンクが無効です」表示、招待者名が出ない、`/login` へのリンクが**無い**（別画面へ遷移させない、再送を依頼するに留める）
    - **要ユーザー確認**：無効ケースに「ホームへ戻る」以外の CTA を出すか？
  - **未ログイン + 有効トークン** → 「ログイン」CTA を押すと `/login?redirect=%2Finvitations%2F<token>` に飛ぶ
  - **ログイン後の戻り**（DoD 2）：Sanctum セッションを事前に注入した state で `/login?redirect=/invitations/<token>` を開き、ログインすると `/invitations/<token>` に戻る
  - **API mock**：`page.route()` で `/invitations/<token>/verify` を stub（既存 `e2e/*` の書き方に合わせる）
- [ ] **代替案**：#38 W4-08 の主要 E2E シナリオに寄せて、本 Issue では E2E を書かず Vitest だけで済ませる。**要ユーザー確認**

## 完了条件（DoD）
Issue の DoD を転記:
- [ ] **期限切れトークンで「何のノートか」情報が漏れない** — 無効ケース（expired / used / not_found）は同一の文言にまとめ、`inviterName` / `familyName` を描画しない。`verifyInvitation.test.ts` で「無効ステータスの返り値に inviter 情報が含まれない」ことを検証、Playwright で「画面に招待者名が出ない」ことを DOM 検索で担保。
- [ ] **ログイン後に元の招待ページに戻る** — `/login?redirect=/invitations/[token]` を CTA で発行。`LoginForm.tsx:33-51` の既存 redirect 挙動により、ログイン成功後に `/invitations/[token]` に戻る（既存テスト `LoginForm.test.tsx:122-141` で緑）。Playwright の「ログイン後の戻り」シナリオで end-to-end 担保。

Issue「作業内容」の追加確認:
- [ ] サーバコンポーネントでトークン検証（RSC で `verifyInvitation` を呼ぶ）
- [ ] `/login?redirect=/invitations/[token]` と `/register?redirect=/invitations/[token]` に誘導
- [ ] 期限切れ / 使用済み / 不正は**内容を明かさない**共通表示

## リスク / 確認事項
- **バック API 契約が未確定**：
  - **エンドポイント**：`GET /invitations/{token}/verify` を仮定している。実装が `POST` や `HEAD` の場合は合わせる。**要ユーザー確認**（バック側の Issue と同期する）。
  - **レスポンス形式**：200 body の `{ status, inviterName?, familyName? }` を主契約と仮定している。バックが 404/410/409 の HTTP コードで表現する場合は `verifyInvitation` のマッピングを調整。
  - **認証**：verify エンドポイント自体は**招待トークンで認証**され、ログインは不要のはず。バックが Sanctum セッションも要求する場合は cookie 転送方針を再検討。**要ユーザー確認**。
- **valid かつ未ログイン時の情報開示レベル**：screen_spec §6 は「有効な場合」に「招待者の表示名と『◯◯さんから…』を表示」と書いているが、未ログイン時に画面に招待者名を出すか否か**明確な要件は無い**。**既定案は「未ログインでは招待者名を出さない、ログイン済みでのみ出す（#35 で実装）」**。理由：セキュリティ寄り（token 露出時の情報漏洩最小化）。**要ユーザー確認**：未ログインでも招待者名を出すか？
- **本 Issue のスコープ境界（#34 vs #35）**：
  - #34：検証・分岐・無効表示・login/register への redirect 導線
  - #35：有効ケースの参加ボタン + `useAcceptInvitation` + 招待者名の表示 + アカウント違いの警告
  - **合意事項**：valid + ログイン済みの描画は本 Issue では最小プレースホルダに留め、#35 で本実装。**要ユーザー確認**（あるいは本 Issue で見た目だけ作って TODO(#35) を残すか）。
- **`hasSessionCookie` 共通化の是非**：middleware と page.tsx で二重定義するより、`src/lib/auth/session-cookie.ts` に抽出する既定案。**代替案**：page.tsx 側でインラインに書いて共通化しない（変更範囲最小）。**既定案採用**を推奨するが、レビュー観点で「middleware 触るなら security review 対象になる」との判断もあり得る。**要ユーザー確認**。
- **`notFound()` を使うか**：Next.js の `notFound()` で 404 ページに落とすと、無効ケース文言をアプリ側で制御しにくい。**既定案は使わない**（200 で描画）。SEO 上は 200 で無効文言を出すのは望ましくないが、招待 URL は基本 no-index なので許容。**要ユーザー確認**。
- **`register` 側の redirect 挙動**：`RegisterForm.tsx:42-65` は `sanitizeRedirect` を通過した相対パスに `router.push` する。**登録完了後にそのまま招待受諾ページに戻るが、その時点で新規ユーザーはまだ family_members に紐づいていない**ため、#35 の受諾フローに素直に入れる。ここは要検証。
- **cookie 転送で SameSite / Secure が抜ける**：`next/headers` の `cookies().getAll()` は string 表現なので、SSR から API に送るとき `Cookie: name=value; name2=value2` を組み立てるだけで送れる。Sanctum のドメイン設定（`SANCTUM_STATEFUL_DOMAINS`）が SSR fetch のホストを含んでいるかは要検証。**要ユーザー確認**。
- **URL の token をログに残さない配慮**：Next.js のアクセスログ・監視系（Sentry 等）に招待 token が出ないよう `metadata.title` や error boundary からは除外する（本 Issue では静的 title で対応、error boundary は未使用）。将来 Sentry を入れるなら scrubbing 要考慮。
- **audit_logs 書き込み**：受諾フロー（#35）で担うためスコープ外。verify 単体では書き込まない前提。
- **E2E の追加可否**：本 Issue で書くか #38 に寄せるか。**要ユーザー確認**。

## 参照
- `CLAUDE.md`（絶対ルール 1〜5、セキュリティ）
- `docs/frontend_design.md`（§画面とパス／§API 通信と型／§認証／§セキュリティ）
- `docs/screen_spec.md` §6 招待の受諾（本 Issue の一次仕様）、§共通仕様「状態の出し分け」
- 既存実装:
  - `src/app/invitations/[token]/page.tsx`（書き換え対象、現状は仮実装）
  - `src/app/(auth)/login/page.tsx` / `src/app/(auth)/register/page.tsx`（変更不要）
  - `src/features/auth/components/LoginForm.tsx` / `RegisterForm.tsx`（redirect 挙動を利用）
  - `src/features/auth/lib/redirect.ts`（open redirect 対策の既存 util）
  - `src/middleware.ts`（cookie 判定ロジックを共通化して共有）
  - `src/lib/api/client.ts` / `src/lib/api/errors.ts`（`apiFetch` / `ApiError` を SSR でも使用）
  - `src/features/family/api/useInvitations.ts`（未定義 API の手書き型 + TODO パターンの見本）
- 直前の類似 plan: `docs/issues/33/plan.md`
