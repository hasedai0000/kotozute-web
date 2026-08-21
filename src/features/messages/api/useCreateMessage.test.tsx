import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { queryKeys } from "@/lib/query/queryKeys";

import { createMessage, useCreateMessage } from "./useCreateMessage";
import type { MessageResponse } from "./useMessage";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const { toast } = await import("sonner");

const jsonResponse = (status: number, body: unknown = null): Response =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: body === null ? undefined : { "Content-Type": "application/json" },
  });

const wrapWith = (client: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = "TestWrapper";
  return Wrapper;
};

describe("createMessage", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs /messages with the input body", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        id: "srv-1",
        recipient: "妻へ",
        body: "ありがとう",
        timing: "posthumous",
      }),
    );
    await createMessage({
      recipient: "妻へ",
      body: "ありがとう",
      timing: "posthumous",
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/messages$/);
    expect(init.method).toBe("POST");
    expect(init.body).toBe(
      JSON.stringify({
        recipient: "妻へ",
        body: "ありがとう",
        timing: "posthumous",
      }),
    );
  });

  it("attaches X-XSRF-TOKEN when the cookie is present", async () => {
    document.cookie = "XSRF-TOKEN=csrf-value";
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: "1" }));
    await createMessage({ recipient: "", body: "", timing: "posthumous" });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get("X-XSRF-TOKEN")).toBe("csrf-value");
  });
});

describe("useCreateMessage", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(toast.error).mockClear();
    document.cookie = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("seeds the detail cache and invalidates list + summary on success", async () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const listInvalidate = vi.spyOn(client, "invalidateQueries");

    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        id: "srv-1",
        recipient: "妻へ",
        body: "ありがとう",
        timing: "posthumous",
      }),
    );

    const { result } = renderHook(() => useCreateMessage(), {
      wrapper: wrapWith(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        recipient: "妻へ",
        body: "ありがとう",
        timing: "posthumous",
      });
    });

    const detail = client.getQueryData<MessageResponse>(
      queryKeys.messages.detail("srv-1"),
    );
    expect(detail?.message.recipient).toBe("妻へ");

    const invalidated = listInvalidate.mock.calls.map(
      (c) => (c[0] as { queryKey: unknown }).queryKey,
    );
    expect(invalidated).toContainEqual(queryKeys.messages.list);
    expect(invalidated).toContainEqual(queryKeys.notebook.summary);
  });

  it("shows an error toast on failure", async () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    fetchMock.mockRejectedValueOnce(new TypeError("Network down"));

    const { result } = renderHook(() => useCreateMessage(), {
      wrapper: wrapWith(client),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({
          recipient: "",
          body: "",
          timing: "posthumous",
        });
      } catch {
        /* expected */
      }
    });

    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith("保存できませんでした");
    });
  });
});
