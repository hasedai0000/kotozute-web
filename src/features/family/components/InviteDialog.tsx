"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

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
import { useInvite } from "@/features/family/api/useInvite";
import {
  EMPTY_INVITE_VALUES,
  inviteSchema,
  type InviteInput,
} from "@/features/family/schema/invite";
import { ApiError } from "@/lib/api";

const GENERIC_ERROR_MESSAGE =
  "招待メールを送信できませんでした。時間をおいて再度お試しください";
const SUCCESS_MESSAGE = "招待メールを送信しました。";

type InviteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function InviteDialog({ open, onOpenChange }: InviteDialogProps) {
  const invite = useInvite();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema),
    defaultValues: EMPTY_INVITE_VALUES,
    mode: "onSubmit",
  });

  const isSubmitting = invite.isPending || form.formState.isSubmitting;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      form.reset(EMPTY_INVITE_VALUES);
      setFormError(null);
    }
    onOpenChange(next);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await invite.mutateAsync(values);
      toast.success(SUCCESS_MESSAGE);
      handleOpenChange(false);
    } catch (err) {
      if (
        ApiError.isApiError(err) &&
        err.status === 422 &&
        err.fields?.email?.[0]
      ) {
        form.setError("email", { message: err.fields.email[0] });
        return;
      }
      toast.error(GENERIC_ERROR_MESSAGE);
      setFormError(GENERIC_ERROR_MESSAGE);
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>家族を招待</DialogTitle>
          <DialogDescription>
            招待メールを送ります。相手がメール内のリンクから参加すると、ノートを閲覧できるようになります。
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={onSubmit}
            noValidate
            className="space-y-4"
            aria-label="家族招待フォーム"
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>メールアドレス</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="family@example.com"
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
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? "送信中…" : "送信"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
