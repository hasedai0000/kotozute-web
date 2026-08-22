import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { queryKeys } from "@/lib/query/queryKeys";

import type { MessageResponse } from "./useMessage";
import type { MessagesResponse } from "./useMessages";
import { updateMessage, useUpdateMessage } from "./useUpdateMessage";

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

describe("updateMessage", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("PATCHes /messages/{id} with only provided fields", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        id: "m1",
        recipient: "妻へ",
        body: "更新後",
        timing: "posthumous",
      }),
    );
    await updateMessage({ id: "m1", body: "更新後" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/messages\/m1$/);
    expect(init.method).toBe("PATCH");
    expect(init.body).toBe(JSON.stringify({ body: "更新後" }));
  });
});

describe("useUpdateMessage (optimistic + rollback)", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
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
    const detailKey = queryKeys.messages.detail("m1");
    const listKey = queryKeys.messages.list;
    client.setQueryData<MessageResponse>(detailKey, {
      message: {
        id: "m1",
        recipient: "妻へ",
        body: "初期",
        timing: "posthumous",
      },
    });
    client.setQueryData<MessagesResponse>(listKey, {
      messages: [
        {
          id: "m1",
          recipient: "妻へ",
          body: "初期",
          timing: "posthumous",
        },
      ],
    });
    return { client, detailKey, listKey };
  };

  it("optimistically updates the detail and list caches", async () => {
    const { client, detailKey, listKey } = setup();

    let resolveFetch!: (r: Response) => void;
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((res) => {
        resolveFetch = res;
      }),
    );

    const { result } = renderHook(() => useUpdateMessage(), {
      wrapper: wrapWith(client),
    });

    act(() => {
      result.current.mutate({ id: "m1", body: "更新中" });
    });

    await waitFor(() => {
      const d = client.getQueryData<MessageResponse>(detailKey);
      expect(d?.message.body).toBe("更新中");
    });
    const listSnap = client.getQueryData<MessagesResponse>(listKey);
    expect(listSnap?.messages[0].body).toBe("更新中");

    resolveFetch(
      jsonResponse(200, {
        id: "m1",
        recipient: "妻へ",
        body: "更新中",
        timing: "posthumous",
      }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("rolls back both caches on failure", async () => {
    const { client, detailKey, listKey } = setup();
    fetchMock.mockRejectedValueOnce(new TypeError("Network down"));

    const { result } = renderHook(() => useUpdateMessage(), {
      wrapper: wrapWith(client),
    });

    act(() => {
      result.current.mutate({ id: "m1", body: "だめだった" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(client.getQueryData<MessageResponse>(detailKey)?.message.body).toBe(
      "初期",
    );
    expect(
      client.getQueryData<MessagesResponse>(listKey)?.messages[0].body,
    ).toBe("初期");
  });
});
