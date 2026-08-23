"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useDeleteAccount } from "@/features/auth/api/useDeleteAccount";
import {
  accountDeletionSchema,
  type AccountDeletionInput,
} from "@/features/auth/schema/accountDeletion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";

const GENERIC_ERROR_MESSAGE =
  "通信エラーが発生しました。時間をおいて再度お試しください";
const SUCCESS_MESSAGE = "アカウントを削除しました";

const EMPTY_VALUES: AccountDeletionInput = { currentPassword: "" };

type DeleteAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: "owner" | "family";
};

export function DeleteAccountDialog({
  open,
  onOpenChange,
  role,
}: DeleteAccountDialogProps) {
  const router = useRouter();
  const del = useDeleteAccount();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<AccountDeletionInput>({
    resolver: zodResolver(accountDeletionSchema),
    defaultValues: EMPTY_VALUES,
    mode: "onSubmit",
  });

  const isSubmitting = del.isPending || form.formState.isSubmitting;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      form.reset(EMPTY_VALUES);
      setFormError(null);
    }
    onOpenChange(next);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await del.mutateAsync(values);
      toast.success(SUCCESS_MESSAGE);
      handleOpenChange(false);
      router.replace("/");
    } catch (err) {
      if (
        ApiError.isApiError(err) &&
        err.status === 422 &&
        err.fields?.password?.[0]
      ) {
        form.setError("currentPassword", { message: err.fields.password[0] });
        return;
      }
      toast.error(GENERIC_ERROR_MESSAGE);
      setFormError(GENERIC_ERROR_MESSAGE);
    }
  });

  const removalItems =
    role === "family"
      ? [
          "お客様のプロフィール",
          "共有されていた家族のノートへのアクセス権",
          "登録した通知設定",
        ]
      : [
          "お客様のプロフィール",
          "ノートの記入内容（口座・保険・契約 など）",
          "大切な人へ残した手紙",
          "家族への招待・共有設定",
        ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>アカウントを削除しますか</DialogTitle>
          <DialogDescription>
            以下のデータが削除され、家族にも見えなくなります。この操作は取り消せません。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p className="font-medium">削除されるもの</p>
          <ul className="list-inside list-disc space-y-1 text-muted-foreground">
            {removalItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="text-muted-foreground">
            削除後、共有していた家族からもノートは見えなくなります。
          </p>
        </div>

        <Form {...form}>
          <form
            onSubmit={onSubmit}
            noValidate
            className="space-y-4"
            aria-label="アカウント削除フォーム"
          >
            {formError && (
              <div
                role="alert"
                aria-live="assertive"
                className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {formError}
              </div>
            )}

            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>現在のパスワード</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? "削除中…" : "削除する"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
