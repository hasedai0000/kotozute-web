# kotozute-web ⇔ kotozute-api エンドポイントマッピング

Bug #79 の再調査で判明した、フロントとバックのエンドポイント実装差分の一覧。
`docs/bugs/79-.../analysis.md` の仮説 A（CSRF）は誤診で、**仮説 B（バック未実装）＋ URL 契約の不一致** が実際の根本原因。

- 調査日: 2026-09-01
- kotozute-api: `/Users/hasegawadaichi/work/kotozute-api`（別リポジトリ、`main` ブランチ、最新コミット `2e3fee6 CORSの対応`）

## 根本問題 1: コンテキストルートが未登録

- API は DDD 構造で、ルートを **`src/{Account,Notebook,Disclosure}/Presentation/Http/routes.php`** に分けて定義している
- しかし `bootstrap/app.php:8-13` は `routes/api.php` しか読み込んでいない
- `routes/api.php` は Laravel の初期スケルトンのまま（`/user` のみ）→ **コンテキストルートはどれも実際には登録されていない**

現状で `/api/*` から実際に応答するのは:
- `GET  /api/user`（Sanctum auth 要求）
- `GET  /sanctum/csrf-cookie`

それ以外は 404。

## 根本問題 2: URL・HTTP メソッド・body 形状の不一致

`bootstrap/app.php` を直しても、フロントの契約とバックのルート定義がほぼ全て噛み合わない。CLAUDE.md 「URL 設計の原則」で **パスに `family_id` を含めない** と明記されているが、バック実装は `familyId` を path 必須にしている点が最大の乖離。

### Auth
| 用途 | フロント（呼び出し） | バック（定義） | ギャップ |
|---|---|---|---|
| 登録 | `POST /api/register`（`useRegister.ts:12`） | `POST /api/auth/register`（`Account/.../routes.php:8`） | パスプレフィックス `auth/` の有無 |
| ログイン | `POST /api/login`（`useLogin.ts:12`） | `POST /api/auth/login`（`Account/.../routes.php:9`） | 同上 |
| ログアウト | `POST /api/logout`（`useLogout.ts:10`） | **未定義** | 未実装 |
| 認証中ユーザー | `GET /api/user`（`useMe.ts:18`） | `GET /api/user` ✅ | 一致 |
| プロフィール更新 | `PUT /api/user/profile-information`（`useUpdateProfile.ts:14`） | **未定義** | 未実装（Fortify 想定？） |
| パスワード変更 | `PUT /api/user/password`（推定） | **未定義** | 未実装 |
| アカウント削除 | `DELETE /api/user`（推定） | **未定義** | 未実装 |

### Notebook（今回の #79 の直接原因）
| 用途 | フロント（呼び出し） | バック（定義） | ギャップ |
|---|---|---|---|
| 進捗サマリ | `GET /api/note-summary`（`useNoteSummary.ts:40`） | `GET /api/notebook/families/{familyId}/progress`（`Notebook/.../routes.php:20-23`） | パス構造・path に `familyId` |
| セクション項目取得 | `GET /api/note-fields/:section`（`useNoteFields.ts:17`） | `GET /api/notebook/families/{familyId}/note-fields`（同 25-28） | パス構造・`section` パラメータの位置 |
| **セクション項目更新（#79 本命）** | `PATCH /api/note-fields/:section`, body `{ fields: {...} }`（`usePatchNoteFields.ts:17-19`） | `PUT /api/notebook/families/{familyId}/note-fields/{section}/{fieldKey}`（同 30-35） | **メソッド差（PATCH vs PUT）／パス構造／1 リクエスト 1 フィールド vs 一括** |
| セクション項目 timing 変更 | フロント側未対応（`usePatchNoteFields` が body に `timing` を含めていない） | `PATCH /api/notebook/families/{familyId}/note-fields/{section}/{fieldKey}/timing`（同 37-42） | フロント側に該当ミューテーションなし |
| エントリ一覧 | `GET /api/note-entries/:section`（`useEntries.ts:28`） | `GET /api/notebook/families/{familyId}/entries`（同 44-47） | パス構造・`section` パラメータの位置 |
| エントリ追加 | `POST /api/note-entries/:section` body `{ category, values, timing }`（`useAddEntry.ts:30-38`） | `POST /api/notebook/families/{familyId}/entries`（同 49-52） | パス構造・`section` パラメータの位置 |
| エントリ更新 | `PATCH /api/note-entries/:section/:id`（`useUpdateEntry.ts:31-38`） | `PATCH /api/notebook/families/{familyId}/entries/{entryId}`（同 54-57） | パス構造・`section` パラメータの位置 |
| エントリ削除 | `DELETE /api/note-entries/:section/:id`（`useDeleteEntry.ts:25-31`） | `DELETE /api/notebook/families/{familyId}/entries/{entryId}`（同 59-62） | パス構造・`section` パラメータの位置 |

### Messages
| 用途 | フロント（呼び出し） | バック（定義） | ギャップ |
|---|---|---|---|
| 一覧 | `GET /api/messages`（`useMessages.ts:15`） | `GET /api/notebook/families/{familyId}/messages`（`Notebook/.../routes.php:64-67`） | パス構造 |
| 単体取得 | `GET /api/messages/:id`（`useMessage.ts:14`） | **未定義**（一覧のみ） | 未実装 |
| 作成 | `POST /api/messages`（`useCreateMessage.ts:12`） | `POST /api/notebook/families/{familyId}/messages`（同 69-72） | パス構造 |
| 更新 | `PATCH /api/messages/:id`（`useUpdateMessage.ts:26`） | `PATCH /api/notebook/families/{familyId}/messages/{messageId}`（同 74-77） | パス構造 |
| 削除 | `DELETE /api/messages/:id`（`useDeleteMessage.ts:22`） | `DELETE /api/notebook/families/{familyId}/messages/{messageId}`（同 79-82） | パス構造 |

### Family / Invitations
| 用途 | フロント（呼び出し） | バック（定義） | ギャップ |
|---|---|---|---|
| メンバー一覧 | `GET /api/family/members`（`useFamilyMembers.ts:18`） | `GET /api/notebook/families/{familyId}/members`（`Notebook/.../routes.php:15-18`） | パス構造 |
| メンバー権限解除 | `DELETE /api/family/members/:id`（`useRevokeMember.ts:20`） | **未定義** | 未実装 |
| 招待発行 | `POST /api/family/invitations`（`useInvite.ts:20`） | `POST /api/notebook/families/{familyId}/invitations`（同 89-92） | パス構造 |
| 招待一覧 | `GET /api/family/invitations`（`useInvitations.ts:17`） | `GET /api/notebook/families/{familyId}/invitations`（同 84-87） | パス構造 |
| 招待取り消し | `DELETE /api/family/invitations/:id`（`useRevokeInvite.ts:20`） | `DELETE /api/notebook/families/{familyId}/invitations/{invitationId}`（同 94-97） | パス構造 |
| 招待再送 | `POST /api/family/invitations/:id/resend`（`useResendInvite.ts:22`） | **未定義** | 未実装 |
| 招待受諾 | `POST /api/invitations/accept`（`useAcceptInvitation.ts:16`） | `POST /api/invitations/accept`（同 99-102） | 一致 ✅ |
| 招待検証 | `GET /api/invitations/:token`（`verifyInvitation.ts:67`） | **未定義** | 未実装 |

### Settings
| 用途 | フロント（呼び出し） | バック（定義） | ギャップ |
|---|---|---|---|
| 通知設定 取得 | `GET /api/user/notifications`（`useNotifications.ts:21`） | **未定義** | 未実装 |
| 通知設定 更新 | `PATCH /api/user/notifications`（`useUpdateNotifications.ts:18`） | **未定義** | 未実装 |
| ノート既定タイミング取得 | `GET /api/user/note-preferences`（`useNotePreferences.ts:24`） | **未定義** | 未実装 |
| 既定タイミング更新 | `PATCH /api/user/note-preferences`（`useUpdateDefaultTiming.ts:18`） | **未定義** | 未実装 |
| 待機期間更新 | `PATCH /api/user/note-preferences`（`useUpdateGracePeriod.ts:18`） | **未定義** | 未実装 |

### Disclosure（v1 スコープ）
- フロント: `features/disclosure/` は枠のみ、実 API 呼び出しなし
- バック: `Disclosure/Presentation/Http/routes.php` は空（コメントのみ）

## 設計の食い違いの根

- CLAUDE.md / `docs/frontend_design.md` 「URL 設計の原則」:
  > パスに `family_id` / `user_id` を含めない（ログイン中のユーザーから解決する）。例外は招待トークンのみ
- 対して kotozute-api は path に `familyId` 必須の RESTful リソース設計を採用
- どちらかを合わせないと接続できない。**設計原則の合意（フロント設計 vs バック設計）が最初に必要**

## 対応方針の選択肢

### 案 A: バックをフロントの契約に合わせる（フロント設計原則優先）
- `bootstrap/app.php` にコンテキストルートを追加登録
- ルート定義を `family_id` フリーに書き換え、ログインユーザーから解決する middleware / helper を追加
- 未定義エンドポイント（logout, profile update, notifications, note-preferences, revokeMember, resendInvite, verifyInvitation, message show, note-fields 一括 PATCH 等）を実装
- **メリット**: フロント側の変更が最小
- **デメリット**: バック側の DDD 構造やリソース設計を大きく書き換える必要あり

### 案 B: フロントをバックの契約に合わせる（バック実装優先）
- フロント全ミューテーション・クエリの URL / method / body を書き換え
- `familyId` を `useMe`（現在のユーザー）から取得して各 URL に埋め込む
- 未実装機能（logout 等）は暫定で落とすか、バックに追加依頼
- **メリット**: バックの実装済み範囲を活かせる
- **デメリット**: CLAUDE.md の設計原則（`family_id` を path に含めない）に反する。フロントの API 層全体の書き換え

### 案 C: 両方の設計を突き合わせて再合意（推奨）
- 「path に `familyId` を含めるか」を仕様レベルで再議論
- 未実装エンドポイントの実装優先度を要件と突き合わせて決める
- 決定後、案 A / B のいずれかで詰める
- MVP スコープ（LP・認証・ノート編集・家族招待・常時共有閲覧）だけに絞ることで工数を圧縮できる

## Bug #79 だけを最短で治すには

MVP の「基本のこと」を保存できるようにすることに絞るなら:

1. kotozute-api の `bootstrap/app.php` にコンテキストルートを追加登録
2. 認証まわりで `/api/login` / `/api/register` / `/api/logout` を追加（フロントは `/auth/*` を叩いていない）
3. `PATCH /api/note-fields/:section` を実装（一括更新、body `{ fields: {...} }` 受け取り）
   - もしくはフロントの `usePatchNoteFields` を「フィールドごとに PUT `/note-fields/:section/:key` を並列送信」に書き換える
4. `GET /api/note-fields/:section` と `GET /api/note-summary` を実装
5. ログインユーザーから familyId を解決する仕組みを middleware または controller で導入

これらは #79 の枠を大きく超え、実質「バック側の API 整備」タスクになる。**新しい Issue に分離する** のが妥当。
