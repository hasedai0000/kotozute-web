import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAutoSave, type UseAutoSaveOptions } from "./useAutoSave";

type Values = Record<string, string>;

const makeMutation = (
  mutateAsync: (input: Partial<Values>) => Promise<void>,
): UseAutoSaveOptions<Values>["mutation"] =>
  ({
    mutateAsync,
  }) as unknown as UseAutoSaveOptions<Values>["mutation"];

const makeWrapper = () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
};

const setup = (opts?: {
  mutateImpl?: (input: Partial<Values>) => Promise<void>;
}) => {
  const mutateAsync = vi.fn(opts?.mutateImpl ?? (async () => undefined));
  const mutation = makeMutation(mutateAsync);
  const wrapper = makeWrapper();

  const rendered = renderHook(
    () => {
      const form = useForm<Values>({
        defaultValues: { full_name: "", blood_type: "" },
      });
      const auto = useAutoSave({ form, mutation, delayMs: 800 });
      return { form, auto };
    },
    { wrapper },
  );

  return { mutateAsync, rendered };
};

describe("useAutoSave", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("collapses rapid changes into a single mutation call (収束 / DoD)", async () => {
    const { mutateAsync, rendered } = setup();

    act(() => {
      rendered.result.current.form.setValue("full_name", "山");
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    act(() => {
      rendered.result.current.form.setValue("full_name", "山田");
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    act(() => {
      rendered.result.current.form.setValue("full_name", "山田 太郎");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutateAsync).toHaveBeenCalledWith({ full_name: "山田 太郎" });
  });

  it("transitions idle -> saving -> saved (and back to idle after 3s)", async () => {
    const { rendered } = setup();
    expect(rendered.result.current.auto.status).toBe("idle");

    act(() => {
      rendered.result.current.form.setValue("full_name", "太郎");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    expect(rendered.result.current.auto.status).toBe("saved");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(rendered.result.current.auto.status).toBe("idle");
  });

  it("preserves values on error and lets retry() re-send (DoD)", async () => {
    let shouldFail = true;
    const { mutateAsync, rendered } = setup({
      mutateImpl: async () => {
        if (shouldFail) throw new Error("network");
      },
    });

    act(() => {
      rendered.result.current.form.setValue("full_name", "太郎");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    expect(rendered.result.current.auto.status).toBe("error");
    expect(rendered.result.current.form.getValues("full_name")).toBe("太郎");

    shouldFail = false;
    await act(async () => {
      rendered.result.current.auto.retry();
      // マイクロタスクを進める
      await Promise.resolve();
    });
    expect(mutateAsync).toHaveBeenCalledTimes(2);
    expect(rendered.result.current.auto.status).toBe("saved");
  });

  it("does not fire mutation when there is no diff", async () => {
    const { mutateAsync } = setup();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("clears the pending timer on unmount", async () => {
    const { mutateAsync, rendered } = setup();
    act(() => {
      rendered.result.current.form.setValue("full_name", "太郎");
    });
    rendered.unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});

