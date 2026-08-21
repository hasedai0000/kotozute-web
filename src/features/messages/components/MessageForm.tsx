"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { UseMutationResult } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/layout/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SavingIndicator } from "@/features/notebook/components/SavingIndicator";
import {
  useAutoSave,
  type AutoSaveStatus,
} from "@/features/notebook/hooks/useAutoSave";
import type { TimingVariant } from "@/features/notebook/components/TimingBadge";

import { useCreateMessage } from "../api/useCreateMessage";
import { useDeleteMessage } from "../api/useDeleteMessage";
import { useUpdateMessage } from "../api/useUpdateMessage";
import {
  BODY_MAX,
  RECIPIENT_MAX,
  messageInputSchema,
  type Message,
  type MessageInput,
} from "../schema/message";

import { TimingRadio } from "./TimingRadio";

const SAVE_ERROR_TOAST = "保存できませんでした。時間をおいて再度お試しください";

export type MessageFormProps =
  | { mode: "create" }
  | { mode: "edit"; initial: Message };

export function MessageForm(props: MessageFormProps) {
  const router = useRouter();
  const create = useCreateMessage();
  const update = useUpdateMessage();
  const del = useDeleteMessage();

  const initialValues: MessageInput =
    props.mode === "edit"
      ? {
          recipient: props.initial.recipient,
          body: props.initial.body,
          timing: props.initial.timing,
        }
      : { recipient: "", body: "", timing: "posthumous" };

  const form = useForm<MessageInput>({
    resolver: zodResolver(messageInputSchema),
    defaultValues: initialValues,
    mode: "onChange",
  });

  const [messageId, setMessageId] = useState<string | null>(
    props.mode === "edit" ? props.initial.id : null,
  );
  // 進行中の create を掴んで二重発火を防ぐ（debounce 中に POST が長引いた場合の保険）。
  const createPromiseRef = useRef<Promise<Message> | null>(null);

  const autoSaveMutation = useMemo(() => {
    const mutateAsync = async (diff: Partial<MessageInput>) => {
      if (messageId !== null) {
        await update.mutateAsync({ id: messageId, ...diff });
        return;
      }
      if (createPromiseRef.current) {
        const created = await createPromiseRef.current;
        await update.mutateAsync({ id: created.id, ...diff });
        return;
      }
      const promise = create.mutateAsync({
        recipient: diff.recipient ?? "",
        body: diff.body ?? "",
        timing: diff.timing ?? "posthumous",
      });
      createPromiseRef.current = promise;
      try {
        const created = await promise;
        setMessageId(created.id);
        router.replace(`/messages/${created.id}`, { scroll: false });
      } finally {
        createPromiseRef.current = null;
      }
    };
    return { mutateAsync } as unknown as UseMutationResult<
      void,
      unknown,
      Partial<Record<string, string>>
    >;
  }, [messageId, create, update, router]);

  const auto = useAutoSave({
    form: form as unknown as UseFormReturn<Record<string, string>>,
    mutation: autoSaveMutation,
    delayMs: 800,
  });

  const prevStatusRef = useRef<AutoSaveStatus>(auto.status);
  useEffect(() => {
    if (auto.status === "error" && prevStatusRef.current !== "error") {
      toast.error(SAVE_ERROR_TOAST);
    }
    prevStatusRef.current = auto.status;
  }, [auto.status]);

  const body = form.watch("body");
  const timing = form.watch("timing");
  const recipientError = form.formState.errors.recipient?.message;
  const bodyError = form.formState.errors.body?.message;

  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleTimingChange = (v: TimingVariant) => {
    form.setValue("timing", v, { shouldDirty: true, shouldTouch: true });
  };

  const handleDelete = async () => {
    if (props.mode !== "edit") return;
    await del.mutateAsync({ id: props.initial.id });
    router.replace("/messages");
  };

  return (
    <section className="mx-auto flex w-full max-w-prose flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-heading text-2xl leading-snug">
          {props.mode === "edit" ? "手紙を編集する" : "手紙を書く"}
        </h1>
        <SavingIndicator status={auto.status} onRetry={auto.retry} />
      </div>

      <form
        noValidate
        onSubmit={(e) => e.preventDefault()}
        className="flex flex-col gap-6"
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="message-recipient" className="text-sm font-medium">
            宛先
          </label>
          <Input
            id="message-recipient"
            type="text"
            maxLength={RECIPIENT_MAX}
            placeholder="例：妻へ"
            aria-invalid={recipientError ? true : undefined}
            {...form.register("recipient")}
          />
          {recipientError ? (
            <p role="alert" className="text-sm text-destructive">
              {recipientError}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="message-body" className="text-sm font-medium">
            本文
          </label>
          <Textarea
            id="message-body"
            rows={12}
            maxLength={BODY_MAX}
            placeholder="伝えたいことを綴りましょう。"
            className="text-base leading-loose"
            aria-invalid={bodyError ? true : undefined}
            {...form.register("body")}
          />
          <div className="flex items-center justify-between gap-2">
            {bodyError ? (
              <p role="alert" className="text-sm text-destructive">
                {bodyError}
              </p>
            ) : (
              <span />
            )}
            <span className="text-sm tabular-nums text-muted-foreground">
              {body.length} / {BODY_MAX}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">公開タイミング</span>
          <TimingRadio value={timing} onChange={handleTimingChange} />
        </div>
      </form>

      {props.mode === "edit" ? (
        <div className="flex justify-end">
          <Button
            type="button"
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
          onConfirm={handleDelete}
        />
      ) : null}
    </section>
  );
}
