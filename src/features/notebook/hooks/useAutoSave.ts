"use client";

import type { UseMutationResult } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";

export type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

type FormValues = Record<string, string>;

export type UseAutoSaveOptions<TValues extends FormValues = FormValues> = {
  form: UseFormReturn<TValues>;
  mutation: UseMutationResult<void, unknown, Partial<TValues>>;
  delayMs?: number;
  isEnabled?: boolean;
};

export type UseAutoSaveResult = {
  status: AutoSaveStatus;
  retry: () => void;
  lastError: unknown;
};

export function useAutoSave<TValues extends FormValues>({
  form,
  mutation,
  delayMs = 800,
  isEnabled = true,
}: UseAutoSaveOptions<TValues>): UseAutoSaveResult {
  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const [lastError, setLastError] = useState<unknown>(null);

  // 最新参照は effect の中で反映（render 中の書き換えを避けるため）。
  const formRef = useRef(form);
  const mutationRef = useRef(mutation);
  useEffect(() => {
    formRef.current = form;
    mutationRef.current = mutation;
  });

  const savedRef = useRef<TValues>(form.getValues());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetIdleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const computeDiff = useCallback((current: TValues): Partial<TValues> => {
    const diff: Partial<TValues> = {};
    for (const key of Object.keys(current) as Array<keyof TValues>) {
      if (current[key] !== savedRef.current[key]) {
        diff[key] = current[key];
      }
    }
    return diff;
  }, []);

  const flush = useCallback(async () => {
    const current = formRef.current.getValues();
    const diff = computeDiff(current);
    if (Object.keys(diff).length === 0) return;

    setStatus("saving");
    setLastError(null);
    try {
      await mutationRef.current.mutateAsync(diff);
      savedRef.current = { ...savedRef.current, ...diff } as TValues;
      setStatus("saved");
      if (resetIdleRef.current) clearTimeout(resetIdleRef.current);
      resetIdleRef.current = setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      setLastError(err);
      setStatus("error");
    }
  }, [computeDiff]);

  useEffect(() => {
    if (!isEnabled) return;
    const sub = formRef.current.watch(() => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void flush();
      }, delayMs);
    });
    return () => {
      sub.unsubscribe();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (resetIdleRef.current) {
        clearTimeout(resetIdleRef.current);
        resetIdleRef.current = null;
      }
    };
  }, [delayMs, flush, isEnabled]);

  const retry = useCallback(() => {
    void flush();
  }, [flush]);

  return { status, retry, lastError };
}
