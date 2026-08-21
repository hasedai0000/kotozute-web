import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { queryKeys } from "@/lib/query/queryKeys";

import type { MessagesResponse } from "./useMessages";
import { deleteMessage, useDeleteMessage } from "./useDeleteMessage";

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

describe("deleteMessage", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("DELETEs /messages/{id}", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(204));
    await deleteMessage({ id: "m1" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/messages\/m1$/);
    expect(init.method).toBe("DELETE");
  });
});

describe("useDeleteMessage (optimistic + rollback)", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
    document.cookie = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const setup = () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const listKey = queryKeys.messages.list;
    client.setQueryData<MessagesResponse>(listKey, {
      messages: [
        { id: "m1", recipient: "妻へ", body: "a", timing: "posthumous" },
        { id: "m2", recipient: "息子へ", body: "b", timing: "always" },
      ],
    });
    return { client, listKey };
  };

  it("optimistically removes the message and shows success toast", async () => {
    const { client, listKey } = setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(204));

    const { result } = renderHook(() => useDeleteMessage(), {
      wrapper: wrapWith(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: "m1" });
    });

    const snap = client.getQueryData<MessagesResponse>(listKey);
    expect(snap?.messages.map((m) => m.id)).toEqual(["m2"]);
    expect(vi.mocked(toast.success)).toHaveBeenCalledWith("削除しました");
  });

  it("rolls back on failure", async () => {
    const { client, listKey } = setup();
    fetchMock.mockRejectedValueOnce(new TypeError("Network down"));

    const { result } = renderHook(() => useDeleteMessage(), {
      wrapper: wrapWith(client),
    });

    act(() => {
      result.current.mutate({ id: "m1" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const snap = client.getQueryData<MessagesResponse>(listKey);
    expect(snap?.messages.map((m) => m.id)).toEqual(["m1", "m2"]);
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith("削除できませんでした");
  });
});
