# Issue #27 — W3-07 [F-12] 設定 プロフィール（氏名・メール・パスワード変更）

- URL: https://github.com/hasedai0000/kotozute-web/issues/27
- ラベル: frontend, week-3
- マイルストーン: MVP-Week3

## Issue 概要
`/settings` の第 1 セクション「プロフィール」を実装する。**氏名・メール**の更新（`ProfileForm`）と、**パスワード変更**（`PasswordChangeForm` = 現行 / 新規 / 確認、Zod で確認一致検証）を、**個別に保存**（それぞれ独立の Submit ボタン＋成功トースト）できるようにする。DoD は「確認不一致でエラー表示」と「family ロールも自分のプロフィールは編集可能」。Vitest でスキーマを検証。

## 調査結果

### 関連ドキュメント
- `CLAUDE.md` 絶対ルール — 「1. features 単位で割る」→ プロフィール／パスワード変更のフォーム・API フックは `src/features/auth/` 配下に置く（Account コンテキスト）。`src/app/(app)/settings/page.tsx` は薄い配線のみ。「2. サーバ状態は TanStack Query が唯一の真実」→ 現在のユーザー情報は `useMe` のキャッシュ、更新は `useMutation`＋`queryKeys.auth.me` invalidate。「4. トークンをフロントで保持しない」→ Sanctum クッキー前提、`getCsrfCookie()`＋`X-XSRF-TOKEN` の既存パターンを踏襲。
- `docs/screen_spec.md` §9 設定 — 「1. プロフィール：氏名、メール、パスワード変更」「各設定は個別保存（保存後にトースト）」「家族ロール：**自分のプロフィールと通知のみ**（ノートの設定は表示しない）」→ **本 Issue で family ロールでも編集可能**にする（設定画面自体の role 分岐は #29 スコープと切り分け、プロフィール／パスワード変更は role によらず有効）。
- `docs/screen_spec.md` §共通仕様 — 「ロールによる出し分け」の表で「編集」は owner 可 / family 不可 だが、これは **ノート項目に対する編集**の話。プロフィール（＝自分自身のアカウント）は role を問わず本人管理可能（DoD 2 番目の根拠）。
- `docs/frontend_design.md` §状態管理 — フォームは RHF + Zod、サーバ状態は TanStack Query。**「YOU MUST：サーバ状態を `useState` に写し取らない」** → `ProfileForm` の `defaultValues` は `useMe` の結果を渡す一度きり、以降 RHF が真実の源。更新後は `queryClient.setQueryData(queryKeys.auth.me, ...)` または invalidate で TanStack Query を更新する。
- `docs/frontend_design.md` §認証 — Sanctum SPA 認証、`credentials: 'include'`、`getCsrfCookie()` → 更新系の各 mutation で継続使用。**フロントはトークンを保持しない**。
- `docs/frontend_design.md` §セキュリティ — 「パスワード…は入力させない／保存しない（在りかのみ）」は **note の記入内容** の話。**アカウントのパスワード変更は本人のログイン資格情報**なので対象外（型/形式のみ制約）。

### 関連コード
- `src/app/(app)/settings/page.tsx:1-7` — 現状は h1 のみのプレースホルダ。**本 Issue で `ProfileForm` と `PasswordChangeForm` を配置**（セクション区切りで並べる、`Separator` 部品あり）。他セクション（公開タイミング既定 #28 / 通知・エクスポート・退会 #29）は空セクションを **今回は追加しない**（Issue のスコープ外）。
- `src/features/auth/api/useMe.ts:1-34` — 既存。`AuthUser = { id; name; email; role?: "owner"|"family" }` と `queryKeys.auth.me` を提供。**本 Issue で `updateProfile` 成功時に `queryClient.setQueryData(queryKeys.auth.me, next)` で楽観更新 or `invalidateQueries` で再取得**する。
- `src/features/auth/api/useLogin.ts:1-31` — `getCsrfCookie()` → `apiFetch(...)` → `queryKeys.auth.me` invalidate の骨格。**`useUpdateProfile` / `useChangePassword` の設計参考**。
- `src/features/auth/api/useRegister.ts:1-38` — `snake_case` ⇄ `camelCase` の変換（`password_confirmation`）と CSRF の付け方。**`useChangePassword` でも `password_confirmation` を送るため同じ流儀**。
- `src/features/auth/api/useLogout.ts:1-33` — mutation の onSuccess で `setQueryData(queryKeys.auth.me, ...)` を使う実例。**`useUpdateProfile` の楽観更新パターンの参考**。
- `src/features/auth/api/sanctum.ts:1-40` — `getCsrfCookie()`, `readXsrfToken()`。**本 Issue でも同じヘルパを使う**（触らない）。
- `src/features/auth/schema/register.ts:1-27` — `password` 8 文字以上 + `passwordConfirmation` 一致の Zod パターン（`.refine`）が既にある。**`passwordChangeSchema` は同じ流儀で構築**（`currentPassword` / `newPassword` / `newPasswordConfirmation` の 3 フィールド）。
- `src/features/auth/schema/register.test.ts:1-65` — テスト構成（必須・8 文字未満・確認不一致）の参考。**`passwordChangeSchema.test.ts` は同じ観点で書く**。
- `src/features/auth/components/RegisterForm.tsx:1-203` — RHF + Zod + shadcn `Form` + `ApiError` 422 → `form.setError` のパターン、`autoComplete`・`aria-busy`・二重送信防止・ジェネリックエラー表示。**`ProfileForm` / `PasswordChangeForm` は同じ骨格をコピーして最小化**。ただし `autoComplete` は用途別に：Profile の name は `"name"`, email は `"email"`、パスワード変更は current-password / new-password / new-password で。
- `src/features/auth/hooks/useAuth.ts:1-15`, `src/providers/AuthProvider.tsx:1-31` — `useAuth().user` で現在ユーザーが取得できる。**`ProfileForm` は `useAuth()` から初期値を得る**（`useMe` を直接呼ばず、Provider 経由に統一）。ローディング中は `Skeleton` を出す。
- `src/lib/query/queryKeys.ts:1-23` — `queryKeys.auth.me` を使用。**新規キー追加は不要**（更新系は me のキャッシュを差し替える）。
- `src/lib/api/errors.ts:1-93` — `ApiError` の `status` / `fields`。**422 のフィールドエラーマッピング**（`name`/`email`/`current_password`/`password`/`password_confirmation` → RHF field 名）に使う。
- `src/lib/api/client.ts`, `src/lib/api/index.ts` — `apiFetch` は Sanctum クッキー・XSRF・エラー整形を担う。**触らない**、`useUpdateProfile` / `useChangePassword` から呼ぶ。
- `src/components/ui/{form,input,button,label,separator}.tsx` — shadcn 部品。**本 Issue で追加インストールは不要**。
- `src/components/ui/sonner.tsx`, `src/app/layout.tsx` — トースト（`sonner`）は既に組み込み済み。**`toast.success(...)` を各 mutation の `onSuccess` で呼ぶ**（RegisterForm の `toast.error(...)` と対称）。
- `src/middleware.ts` — `/settings` は既に auth-required ルート配下（`(app)`）。**触らない**。
- `src/types/generated/api.ts` — 現状 `/health` のみ。プロフィール／パスワード変更エンドポイントは **未生成**。フロント先行で `apiFetch` に手書きの型を渡し、`TODO(#W1-08+)` コメントで OpenAPI 再生成時の差し替えを明記（`useMe` / `useRegister` と同じ流儀）。

### 依存関係
- **先に必要（完了済み）**:
  - #9 AuthProvider / useAuth / middleware ガード
  - #13 ログイン画面（Sanctum CSRF フロー）
  - #14 新規登録画面（Zod スキーマ / パスワード確認一致の実装パターン）
  - #15 AuthProvider に user 配布
- **並行 / 後続**:
  - **#28 W3-08 公開タイミング既定 + 待機期間スライダー** — 同じ `/settings` ページ内の別セクション。本 Issue では **プロフィール／パスワードのみ**を実装し、page.tsx の他セクションは #28 が追加する（見出しレベル・`Separator` の配置ルールだけ揃える）。
  - **#29 W3-09 通知・エクスポート・退会** — 同上。role 別の出し分け（家族はプロフィール／通知のみ）は #29 のスコープで統合予定。
  - **#36 W4-06 家族ロールの閲覧専用モード** — 家族ロールが `/settings` に来た時に「ノート設定は非表示、プロフィール／通知のみ表示」に落とすのは #36。本 Issue の `ProfileForm` / `PasswordChangeForm` は role に依らず有効（DoD 2 番目）。
  - **バックエンド `kotozute-api`** — プロフィール更新 / パスワード変更エンドポイントは未実装（Fortify を有効化すれば `PUT /user/profile-information` と `PUT /user/password` が生える想定、後述 D2）。フロント先行で `apiFetch` に手書き型で叩き、`TODO(#W1-08+)` コメントで OpenAPI 再生成時の差し替えを明記。

## やること

### 前提の意思決定（**要ユーザー確認**）

実装分岐点。合意後に着手する。

- **D1. コンポーネント配置と粒度**（推奨: **案 A**）
  - **案 A（推奨）**: `src/features/auth/components/` に `ProfileForm.tsx` と `PasswordChangeForm.tsx` を並置。`src/app/(app)/settings/page.tsx` に両者を配置し、`<Separator />` で区切る。**理由**: Issue の作業内容が `ProfileForm` と `PasswordChangeForm` を明確に分けているため、ファイルも分ける（凝集度）。設定ページ自体は薄い配線に留める（`src/app/` はルーティング専任、CLAUDE.md 絶対ルール #1）。
  - 案 B: 1 ファイル `SettingsProfileSection.tsx` に両フォームを詰める。**却下**（Issue の粒度指定と反する、テストが太る）。
  - 案 C: `src/features/settings/` を新設。**却下**（設定は複数機能の集約でしかなく、プロフィール／パスワード変更は Account コンテキストの一部。`src/features/auth/` に置くのが自然、CLAUDE.md「features はバックの境界づけられたコンテキストと対応」に整合）。

- **D2. API エンドポイントの想定**（推奨: **案 A**）
  - **案 A（推奨）**: Laravel Fortify のデフォルトに合わせる。
    - プロフィール更新：`PUT /user/profile-information`（body: `{ name, email }`）
    - パスワード変更：`PUT /user/password`（body: `{ current_password, password, password_confirmation }`）
    - **理由**: `kotozute-api` は Sanctum 前提。Fortify を有効化すれば標準で生えるエンドポイント名。バック側の実装コストが最小。204 No Content が返る想定（`apiFetch<void>`）。
  - 案 B: 独自エンドポイント（例：`PATCH /user`）。**却下しない**（バック側で決めるべき事項）。**バック契約が異なる場合は本 Issue 実装時に差し替え可能**、フロントの API 呼び出しは薄いラッパ 1 関数なので影響は 1 ファイル。
  - **実装方針**: URL は `useUpdateProfile` / `useChangePassword` の各ファイル冒頭で `const ENDPOINT = "/user/profile-information";` のように定数化して差し替えやすくする。
  - **`TODO(#W1-08+)`**: OpenAPI 側で該当エンドポイントが定義され次第、`src/types/generated` から型を差し替える旨のコメントを付ける（`useMe.ts` と同じ流儀）。

- **D3. `ProfileForm` の Zod スキーマ**（推奨: **案 A**）
  - **案 A（推奨）**:
    ```ts
    export const profileUpdateSchema = z.object({
      name: z.string().trim()
        .min(1, "お名前を入力してください")
        .max(100, "お名前は100文字以内で入力してください"),
      email: z.string()
        .min(1, "メールアドレスを入力してください")
        .email("メールアドレスの形式が正しくありません"),
    });
    export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
    ```
  - **理由**: `registerSchema` の name / email 部分と同じ制約に揃える（一貫性）。UI もそこと同じメッセージを出す。

- **D4. `PasswordChangeForm` の Zod スキーマ**（推奨: **案 A**）
  - **案 A（推奨）**:
    ```ts
    export const passwordChangeSchema = z.object({
      currentPassword: z.string().min(1, "現在のパスワードを入力してください"),
      newPassword: z.string()
        .min(1, "新しいパスワードを入力してください")
        .min(8, "パスワードは8文字以上で入力してください"),
      newPasswordConfirmation: z.string()
        .min(1, "確認用パスワードを入力してください"),
    }).refine((v) => v.newPassword === v.newPasswordConfirmation, {
      path: ["newPasswordConfirmation"],
      message: "パスワードが一致しません",
    });
    export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
    ```
  - **理由**: `registerSchema` の `.refine` パターンをそのまま流用。**DoD 1 番目「確認不一致でエラー表示」を Zod で担保**（Vitest でも同じ観点を検証）。
  - **注意**: `currentPassword` に 8 文字下限は課さない（過去に短いパスワードで登録した可能性を排除しない）。新規パスワード側にのみ 8 文字下限を課す。
  - **カスタムルール**: `newPassword` が `currentPassword` と同一の場合の警告は **本 Issue では追加しない**（Fortify のバック側検証に委ねる、Issue の DoD 外）。

- **D5. 個別保存 UI**（推奨: **案 A**）
  - **案 A（推奨）**: 2 フォームを 1 ページに並べ、**各フォームに独立の Submit ボタン**を持たせる（`ProfileForm` = 「保存」、`PasswordChangeForm` = 「パスワードを変更する」）。**成功時は各々 `toast.success(...)`**（例：「プロフィールを更新しました」「パスワードを変更しました」）。**理由**: screen_spec §9「各設定は個別保存」の直接実装。片方の変更で他方に副作用を出さない。
  - 案 B: 1 つの Submit で両方送る。**却下**（画面仕様に反する、パスワード変更は毎回入力が必要なので UX が悪い）。
  - **成功後の後処理**:
    - `ProfileForm`: `queryClient.setQueryData(queryKeys.auth.me, next)` で me を差し替え → `invalidateQueries({ queryKey: queryKeys.auth.me })` で最新を再取得（サーバ側で email 検証などにより値が変わるケースを吸収）。フォームは submit 後に `form.reset(next)` で dirty 状態をリセット。
    - `PasswordChangeForm`: 成功で `form.reset({ currentPassword: "", newPassword: "", newPasswordConfirmation: "" })`。me は変わらないため invalidate 不要。
  - **失敗時**:
    - `ApiError.status === 422` かつ `fields` あり → `form.setError(fieldName, { message })`（API のスネークケース → RHF の名前へマッピング、`RegisterForm` と同じ）。
    - それ以外 → `toast.error(GENERIC_ERROR_MESSAGE)` + フォーム上部にアラート表示（`RegisterForm` と同じ）。
    - 特に `currentPassword` 不一致は 422 で `current_password` フィールドに `Fortify` のメッセージが返る想定（例：「現在のパスワードが正しくありません」）。**API のメッセージをそのまま `setError` に流す**。

- **D6. 家族ロールでの動作**（推奨: **案 A**、DoD 2 番目の実装）
  - **案 A（推奨）**: **role によらず `ProfileForm` / `PasswordChangeForm` を描画・機能有効**にする。`useAuth()` の `user.role` を **参照しない**（notebook のようにノート項目を消す必要がない、アカウント自身の管理は本人権利）。**理由**: DoD 2 番目「家族ロールでも自分のプロフィールは編集可能」に直接対応。
  - **`/settings` 内の他セクション**（公開タイミング既定 #28、通知 / エクスポート / 退会 #29）は role 別の出し分けが必要だが、それらは **本 Issue のスコープ外**。
  - **家族ロールに関する Vitest / E2E の観点**: プロフィール／パスワードは role 分岐がないため、**追加テストは不要**（Vitest でスキーマとフォーム挙動、E2E は共通経路で担保）。DoD の証跡として plan.md 側で明記する。

- **D7. `useUpdateProfile` / `useChangePassword` の実装スケッチ**（推奨: **案 A**）
  - **案 A（推奨）**:
    ```ts
    // src/features/auth/api/useUpdateProfile.ts
    import { useMutation, useQueryClient } from "@tanstack/react-query";
    import { apiFetch } from "@/lib/api";
    import { queryKeys } from "@/lib/query/queryKeys";
    import { getCsrfCookie, readXsrfToken } from "./sanctum";
    import type { ProfileUpdateInput } from "@/features/auth/schema/profile";
    import type { AuthUser } from "./useMe";

    // TODO(#W1-08+): OpenAPI 側で /user/profile-information が定義され次第、
    // src/types/generated から型を差し替える。
    export async function updateProfileRequest(input: ProfileUpdateInput): Promise<void> {
      const token = readXsrfToken();
      await apiFetch<void>("/user/profile-information", {
        method: "PUT",
        json: { name: input.name, email: input.email },
        headers: token ? { "X-XSRF-TOKEN": token } : undefined,
      });
    }

    export function useUpdateProfile() {
      const queryClient = useQueryClient();
      return useMutation({
        mutationFn: async (input: ProfileUpdateInput) => {
          await getCsrfCookie();
          await updateProfileRequest(input);
          return input;
        },
        onSuccess: async (next) => {
          const prev = queryClient.getQueryData<AuthUser | null>(queryKeys.auth.me);
          if (prev) {
            queryClient.setQueryData<AuthUser>(queryKeys.auth.me, {
              ...prev,
              name: next.name,
              email: next.email,
            });
          }
          await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
        },
      });
    }
    ```
    ```ts
    // src/features/auth/api/useChangePassword.ts
    import { useMutation } from "@tanstack/react-query";
    import { apiFetch } from "@/lib/api";
    import { getCsrfCookie, readXsrfToken } from "./sanctum";
    import type { PasswordChangeInput } from "@/features/auth/schema/passwordChange";

    // TODO(#W1-08+): OpenAPI 側で /user/password が定義され次第、差し替える。
    export async function changePasswordRequest(input: PasswordChangeInput): Promise<void> {
      const token = readXsrfToken();
      await apiFetch<void>("/user/password", {
        method: "PUT",
        json: {
          current_password: input.currentPassword,
          password: input.newPassword,
          password_confirmation: input.newPasswordConfirmation,
        },
        headers: token ? { "X-XSRF-TOKEN": token } : undefined,
      });
    }

    export function useChangePassword() {
      return useMutation({
        mutationFn: async (input: PasswordChangeInput) => {
          await getCsrfCookie();
          await changePasswordRequest(input);
        },
      });
    }
    ```

- **D8. `ProfileForm` の骨格**（推奨: **案 A**）
  - **案 A（推奨）**:
    ```tsx
    // src/features/auth/components/ProfileForm.tsx（骨格）
    "use client";
    import { zodResolver } from "@hookform/resolvers/zod";
    import { useEffect, useMemo, useState } from "react";
    import { useForm } from "react-hook-form";
    import { toast } from "sonner";
    import { useAuth } from "@/features/auth/hooks/useAuth";
    import { useUpdateProfile } from "@/features/auth/api/useUpdateProfile";
    import { profileUpdateSchema, type ProfileUpdateInput } from "@/features/auth/schema/profile";
    import { Button } from "@/components/ui/button";
    import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
    import { Input } from "@/components/ui/input";
    import { Skeleton } from "@/components/ui/skeleton";
    import { ApiError } from "@/lib/api";

    const GENERIC_ERROR_MESSAGE = "通信エラーが発生しました。時間をおいて再度お試しください";
    const API_FIELD_TO_FORM_FIELD: Record<string, keyof ProfileUpdateInput> = {
      name: "name",
      email: "email",
    };

    export function ProfileForm() {
      const { user, isLoading } = useAuth();
      const update = useUpdateProfile();
      const [formError, setFormError] = useState<string | null>(null);

      const defaultValues = useMemo<ProfileUpdateInput>(
        () => ({ name: user?.name ?? "", email: user?.email ?? "" }),
        [user?.name, user?.email],
      );

      const form = useForm<ProfileUpdateInput>({
        resolver: zodResolver(profileUpdateSchema),
        defaultValues,
        mode: "onSubmit",
      });

      // user が後から届いた場合に defaultValues を反映（dirty でない時のみ）
      useEffect(() => {
        if (!form.formState.isDirty) form.reset(defaultValues);
      }, [defaultValues, form]);

      if (isLoading || !user) {
        return <Skeleton className="h-32 w-full" />;
      }

      const onSubmit = form.handleSubmit(async (values) => {
        setFormError(null);
        try {
          await update.mutateAsync(values);
          toast.success("プロフィールを更新しました");
          form.reset(values); // dirty をリセット
        } catch (err) {
          if (ApiError.isApiError(err) && err.status === 422 && err.fields) {
            let matched = false;
            for (const [apiField, messages] of Object.entries(err.fields)) {
              const formField = API_FIELD_TO_FORM_FIELD[apiField];
              const message = messages[0];
              if (formField && message) {
                form.setError(formField, { message });
                matched = true;
              }
            }
            if (matched) return;
          }
          toast.error(GENERIC_ERROR_MESSAGE);
          setFormError(GENERIC_ERROR_MESSAGE);
        }
      });

      const isSubmitting = update.isPending || form.formState.isSubmitting;

      return (
        <Form {...form}>
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            {/* formError alert（RegisterForm と同じ書き方） */}
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>お名前</FormLabel>
                <FormControl><Input type="text" autoComplete="name" disabled={isSubmitting} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>メールアドレス</FormLabel>
                <FormControl><Input type="email" autoComplete="email" inputMode="email" disabled={isSubmitting} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? "保存中…" : "保存"}
            </Button>
          </form>
        </Form>
      );
    }
    ```
  - **細部**: `useAuth().user` を初期値に使う。`user` が後から届く場合（初回レンダー時 null）に備え、`form.reset(defaultValues)` を `useEffect` で流す（`isDirty` の間は上書きしない）。

- **D9. `PasswordChangeForm` の骨格**（推奨: **案 A**）
  - **案 A（推奨）**:
    ```tsx
    // src/features/auth/components/PasswordChangeForm.tsx（骨格）
    "use client";
    import { zodResolver } from "@hookform/resolvers/zod";
    import { useState } from "react";
    import { useForm } from "react-hook-form";
    import { toast } from "sonner";
    import { useChangePassword } from "@/features/auth/api/useChangePassword";
    import { passwordChangeSchema, type PasswordChangeInput } from "@/features/auth/schema/passwordChange";
    import { Button } from "@/components/ui/button";
    import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
    import { Input } from "@/components/ui/input";
    import { ApiError } from "@/lib/api";

    const GENERIC_ERROR_MESSAGE = "通信エラーが発生しました。時間をおいて再度お試しください";
    const API_FIELD_TO_FORM_FIELD: Record<string, keyof PasswordChangeInput> = {
      current_password: "currentPassword",
      password: "newPassword",
      password_confirmation: "newPasswordConfirmation",
    };

    export function PasswordChangeForm() {
      const change = useChangePassword();
      const [formError, setFormError] = useState<string | null>(null);
      const form = useForm<PasswordChangeInput>({
        resolver: zodResolver(passwordChangeSchema),
        defaultValues: { currentPassword: "", newPassword: "", newPasswordConfirmation: "" },
        mode: "onSubmit",
      });

      const onSubmit = form.handleSubmit(async (values) => {
        setFormError(null);
        try {
          await change.mutateAsync(values);
          toast.success("パスワードを変更しました");
          form.reset({ currentPassword: "", newPassword: "", newPasswordConfirmation: "" });
        } catch (err) {
          if (ApiError.isApiError(err) && err.status === 422 && err.fields) {
            let matched = false;
            for (const [apiField, messages] of Object.entries(err.fields)) {
              const formField = API_FIELD_TO_FORM_FIELD[apiField];
              const message = messages[0];
              if (formField && message) { form.setError(formField, { message }); matched = true; }
            }
            if (matched) return;
          }
          toast.error(GENERIC_ERROR_MESSAGE);
          setFormError(GENERIC_ERROR_MESSAGE);
        }
      });

      const isSubmitting = change.isPending || form.formState.isSubmitting;

      return (
        <Form {...form}>
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            {/* formError alert */}
            <FormField control={form.control} name="currentPassword" render={({ field }) => (
              <FormItem>
                <FormLabel>現在のパスワード</FormLabel>
                <FormControl><Input type="password" autoComplete="current-password" disabled={isSubmitting} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="newPassword" render={({ field }) => (
              <FormItem>
                <FormLabel>新しいパスワード</FormLabel>
                <FormControl><Input type="password" autoComplete="new-password" disabled={isSubmitting} {...field} /></FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground">8文字以上でご設定ください。</p>
              </FormItem>
            )} />
            <FormField control={form.control} name="newPasswordConfirmation" render={({ field }) => (
              <FormItem>
                <FormLabel>新しいパスワード（確認）</FormLabel>
                <FormControl><Input type="password" autoComplete="new-password" disabled={isSubmitting} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? "変更中…" : "パスワードを変更する"}
            </Button>
          </form>
        </Form>
      );
    }
    ```

- **D10. `settings/page.tsx` の骨格**（推奨: **案 A**）
  - **案 A（推奨）**:
    ```tsx
    // src/app/(app)/settings/page.tsx
    import { ProfileForm } from "@/features/auth/components/ProfileForm";
    import { PasswordChangeForm } from "@/features/auth/components/PasswordChangeForm";
    import { Separator } from "@/components/ui/separator";

    export default function SettingsPage() {
      return (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
          <header>
            <h1 className="text-2xl font-semibold">設定</h1>
          </header>

          <section aria-labelledby="profile-heading" className="flex flex-col gap-4">
            <h2 id="profile-heading" className="text-lg font-medium">プロフィール</h2>
            <ProfileForm />
          </section>

          <Separator />

          <section aria-labelledby="password-heading" className="flex flex-col gap-4">
            <h2 id="password-heading" className="text-lg font-medium">パスワード変更</h2>
            <PasswordChangeForm />
          </section>
        </div>
      );
    }
    ```
  - **注**: `ProfileForm` / `PasswordChangeForm` が `"use client"` なので、page 自体はサーバーコンポーネントのままで良い（Client Component を子として配置するのは Next.js の許容範囲）。

- **D11. Vitest ユニット**（推奨: **案 A**）
  - **案 A（推奨・Issue の作業内容「Vitest でスキーマ」に対応）**:
    - `src/features/auth/schema/profile.test.ts` — `profileUpdateSchema` の name / email 必須・上限・メール形式・trim
    - `src/features/auth/schema/passwordChange.test.ts` — currentPassword 必須、newPassword 8 文字以上、確認不一致で `newPasswordConfirmation` にエラー（**DoD 1 番目の Vitest レベル担保**）
    - `src/features/auth/api/useUpdateProfile.test.ts` — 成功で `queryKeys.auth.me` の name / email が更新 → invalidate 実行、422 のフィールドエラー透過（`useLogin.test.ts` を参考）
    - `src/features/auth/api/useChangePassword.test.ts` — 成功で 204、422 の `current_password` 不一致メッセージが `ApiError.fields` に載る
    - `src/features/auth/components/ProfileForm.test.tsx` — `AuthProvider` モック（`useAuth` を差し替え）で name / email 初期値表示、submit 成功でトースト、422 で `setError` によりフィールド下エラー表示
    - `src/features/auth/components/PasswordChangeForm.test.tsx` — 確認不一致で `passwordConfirmation` 下にエラー表示（**DoD 1 番目の UI レベル担保**）、成功でトースト＋フォームリセット、422 で `current_password` にエラー
  - **既存テストへの影響**: `RegisterForm.test.tsx` は変更なし。

- **D12. E2E（Playwright）**（推奨: **案 B — 追加しない**）
  - **案 A**: `/settings` の E2E を追加（プロフィール保存、パスワード確認不一致でエラー表示、パスワード成功、家族ロールでも同じ画面）。**メリット**: DoD を UI レベルで最終担保。**デメリット**: `stub` handler の追加とサーバ側 Fortify 未実装で実接続は不可、モックが増える。
  - **案 B（推奨）**: **本 Issue では E2E を追加しない**。Vitest（スキーマ + フォームコンポーネント）で DoD 1 番目・2 番目を担保。`/settings` の E2E は #28 / #29 の完成後に **統合的な `settings.spec.ts`** として追加する方が保守しやすい。**理由**: (i) 現時点で `/settings` は本 Issue のみ、モック追加コストに比べて価値が薄い、(ii) Issue 本文の「作業内容」に E2E は含まれない、(iii) スキーマの DoD は Vitest で十分。
  - **要ユーザー確認**: 「E2E も欲しい」場合は案 A に切り替え（`e2e/settings.spec.ts` を新規、モックで PUT を受け、UI 検証）。

- **D13. アクセシビリティ / セキュリティ**（推奨: **案 A**）
  - **案 A（推奨）**:
    - パスワード入力欄には `autoComplete="current-password"` / `"new-password"`（ブラウザ管理と競合しない）。
    - `<Button disabled aria-busy>` で二重送信防止（RegisterForm と同じ）。
    - `FormMessage` は `role="alert"` 相当（shadcn/ui の Form が担保）。
    - 通信中の状態変化を `aria-live="assertive"`（formError アラート）＋ボタン文言変化で伝える。
    - **セキュリティ**: パスワード変更成功時に **他デバイスからログアウトさせるか**は本 Issue ではスコープ外（Fortify のデフォルトは `password.logout` トークンで管理、UI 追加は #29 相当）。
    - **CLAUDE.md セキュリティルール**「パスワード…は入力させない／保存しない（在りかのみ）」は **note の記入内容**を対象にしており、**アカウントの認証情報は対象外**（本 Issue に矛盾しない）。plan 上に明記して他レビュアーの誤読を防ぐ。

- **D14. ディレクトリ配置**（推奨: **案 A**）
  - **案 A（推奨）**:
    ```
    src/features/auth/
      api/
        useMe.ts                     # 既存、触らない（キャッシュ差し替えはこのキー）
        useLogin.ts / useRegister.ts # 既存、触らない
        useUpdateProfile.ts          # 新規
        useUpdateProfile.test.ts     # 新規
        useChangePassword.ts         # 新規
        useChangePassword.test.ts    # 新規
        sanctum.ts                   # 既存、触らない
      components/
        LoginForm.tsx / RegisterForm.tsx # 既存、触らない
        ProfileForm.tsx              # 新規
        ProfileForm.test.tsx         # 新規
        PasswordChangeForm.tsx       # 新規
        PasswordChangeForm.test.tsx  # 新規
      schema/
        login.ts / register.ts       # 既存、触らない
        profile.ts                   # 新規
        profile.test.ts              # 新規
        passwordChange.ts            # 新規
        passwordChange.test.ts       # 新規
    src/app/(app)/settings/
      page.tsx                       # 既存を差し替え（配線のみ、Server Component）
    ```

### タスク

- [ ] **D1〜D14 の意思決定をユーザーと合意**（本 plan を提示して承認を得る）
- [ ] **`src/features/auth/schema/profile.ts`** を新規作成（D3）
  - [ ] `profileUpdateSchema`（name 100 文字以内、email 形式）
  - [ ] `type ProfileUpdateInput = z.infer<...>`
- [ ] **`src/features/auth/schema/profile.test.ts`** を新規作成（D11）
- [ ] **`src/features/auth/schema/passwordChange.ts`** を新規作成（D4）
  - [ ] `passwordChangeSchema`（current 必須、new 8 文字以上、`.refine` で確認一致）
  - [ ] `type PasswordChangeInput = z.infer<...>`
- [ ] **`src/features/auth/schema/passwordChange.test.ts`** を新規作成（D11）
  - [ ] **確認不一致で `newPasswordConfirmation` にエラー（DoD 1 番目の Vitest レベル担保）**
- [ ] **`src/features/auth/api/useUpdateProfile.ts`** を新規作成（D2/D7）
  - [ ] `updateProfileRequest`: `PUT /user/profile-information` + XSRF
  - [ ] `useUpdateProfile`: 成功で `queryKeys.auth.me` を setQueryData 更新 → invalidate、`TODO(#W1-08+)` コメント
- [ ] **`src/features/auth/api/useUpdateProfile.test.ts`** を新規作成（D11）
- [ ] **`src/features/auth/api/useChangePassword.ts`** を新規作成（D2/D7）
  - [ ] `changePasswordRequest`: `PUT /user/password` + XSRF、`snake_case` 変換
  - [ ] `useChangePassword`
- [ ] **`src/features/auth/api/useChangePassword.test.ts`** を新規作成（D11）
- [ ] **`src/features/auth/components/ProfileForm.tsx`** を新規作成（D8）
  - [ ] `useAuth()` の user を初期値、後着に備え `useEffect` で `form.reset`
  - [ ] 成功で `toast.success` + `form.reset(values)`
  - [ ] 422 → `setError`（RegisterForm と同じマッピング）、他は generic トースト+アラート
- [ ] **`src/features/auth/components/ProfileForm.test.tsx`** を新規作成（D11）
- [ ] **`src/features/auth/components/PasswordChangeForm.tsx`** を新規作成（D9）
  - [ ] 3 フィールド、成功で `toast.success` + 空文字リセット
  - [ ] 422 → `current_password` / `password` / `password_confirmation` を RHF field 名にマッピング
- [ ] **`src/features/auth/components/PasswordChangeForm.test.tsx`** を新規作成（D11）
  - [ ] **確認不一致でフィールド下にエラー表示（DoD 1 番目の UI レベル担保）**
  - [ ] 成功でトースト＋フォームリセット
- [ ] **`src/app/(app)/settings/page.tsx`** を差し替え（D10）
  - [ ] `<ProfileForm />`, `<Separator />`, `<PasswordChangeForm />` を配置
  - [ ] role による分岐は入れない（DoD 2 番目：家族でも編集可）
- [ ] **既存 Vitest / E2E の点検**
  - [ ] `RegisterForm.test.tsx` などが変わらず通ること
- [ ] **（任意）** D12 を案 A に切り替える場合、`e2e/settings.spec.ts` を新規追加

## 完了条件（DoD）

Issue の DoD を転記:
- [ ] **パスワード変更時に確認不一致でエラー表示**
  - Zod の `.refine` で `newPasswordConfirmation` パスにメッセージを付ける → `PasswordChangeForm` の `FormMessage` に表示。Vitest（schema + form）で担保。
- [ ] **家族ロールでも自分のプロフィールは編集可能**
  - `ProfileForm` / `PasswordChangeForm` は `useAuth().user.role` を参照せず描画・機能有効。**role 判定を入れない** ことで担保。

Issue 作業内容のチェックリスト:
- [ ] `ProfileForm`（氏名 / メール） — D8
- [ ] `PasswordChangeForm`（現行 / 新規 / 確認、Zod） — D4 + D9
- [ ] 個別保存 + 成功トースト — D5（各フォームに独立 Submit、`toast.success`）
- [ ] Vitest でスキーマ — D11（`profile.test.ts`, `passwordChange.test.ts`）

## リスク / 確認事項

- **D2（API エンドポイント名）**: バックエンド `kotozute-api` に Fortify が入っていない場合、`PUT /user/profile-information` / `PUT /user/password` は存在せず、独自エンドポイント設計が必要。フロント側では URL を定数化して差し替えやすくしておくが、**バック側の実装完了までは実データが動かない**旨を PR に明記。
- **D6（役割分岐）**: プロフィール／パスワード変更は role 分岐なしで実装するが、`screen_spec.md` §9 の家族向け表示（「プロフィールと通知のみ」ノートの設定は非表示）は **`/settings` ページ全体の役割分岐**を意味する。本 Issue では他セクションを実装しないため、ページ全体の role 分岐は #28/#29/#36 に委ねる。**「/settings 全体の家族専用ビュー」が本 Issue で必要かは要確認**。
- **D11（テストの粒度）**: Issue 本文の作業内容には「Vitest でスキーマ」とだけあるが、フォームコンポーネントのテストも合わせて書く方針を採用する（DoD 1 番目「確認不一致でエラー表示」は UI 挙動でも担保したい）。**要ユーザー確認**。
- **D12（E2E の有無）**: 本 Issue では E2E を追加しない方針だが、W3 全体で `/settings` の統合 E2E を求める場合は先行して追加する。**要相談**。
- **`useAuth()` が初回レンダーで null を返すケース**: 401 だと middleware が `/login` に飛ばすはずなので `/settings` に到達しないが、`isLoading` 中は `Skeleton` を出す（D8）。**認証キャッシュがまだない状態でフォームがマウントされる導線を否定できない場合は要確認**。
- **`newPassword` と `currentPassword` の同一チェック**: 本 Issue では Zod では課さず、バック（Fortify）の検証に委ねる。UX 上気になる場合は要相談（`.refine` を 1 本追加）。
- **メールアドレス変更時の再認証**: Laravel Fortify のデフォルトでは email 変更で verification が走ることがある（`MustVerifyEmail`）。**バック契約が固まり次第、UI 側で「確認メールを送信しました」表示等の追加を検討**（本 Issue のスコープ外、`TODO` コメントに残す）。
- **成功トースト後のフォーム状態**: `ProfileForm` は成功後に `form.reset(values)` で dirty をリセットするため、直後に別項目を編集する UX は自然。`PasswordChangeForm` は成功後に空文字リセットする（連続変更は稀なので）。
- **キャッシュキーの再検討**: `useUpdateProfile` は `queryKeys.auth.me` を触るだけ。他機能（family メンバー一覧など）に自分の name / email が表示される場合、それらは `useMe` を独立に読み直せば整合する（**本 Issue では追加 invalidate は不要**）。

## 参照
- `CLAUDE.md` 絶対ルール #1（features 単位）／ #2（TanStack Query 唯一の真実）／ #4（トークンをフロントで持たない）
- `docs/frontend_design.md` §状態管理 / §認証 / §セキュリティ
- `docs/screen_spec.md` §9 設定（1. プロフィール、各設定は個別保存）／ §共通仕様（ロールによる出し分けはノート項目対象）
- `docs/issues/14/plan.md`（RegisterForm の Zod / RHF / setError パターン）
- 既存コード: `src/features/auth/schema/register.ts`, `src/features/auth/components/RegisterForm.tsx`, `src/features/auth/api/useRegister.ts`
