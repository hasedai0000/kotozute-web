import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const toastErrorMock = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (msg: string) => toastErrorMock(msg),
  },
}));

import type { AuthUser } from "@/features/auth/api/useMe";
import { AuthContext, type AuthContextValue } from "@/providers/AuthProvider";

import { SectionForm } from "./SectionForm";

const jsonResponse = (status: number, body: unknown = null): Response =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: body === null ? undefined : { "Content-Type": "application/json" },
  });

const ownerUser: AuthUser = {
  id: 1,
  name: "Taro",
  email: "a@b.c",
  role: "owner",
};

const makeWrapper = (user: AuthUser | null = ownerUser) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  const ctx: AuthContextValue = {
    user,
    isLoading: false,
    refetch: async () => undefined,
  };
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={client}>
        <AuthContext.Provider value={ctx}>{children}</AuthContext.Provider>
      </QueryClientProvider>
    );
  };
};

// デバウンスは 800ms 固定なので、実タイマーで待つ。
const WAIT_TIMEOUT = 2000;

describe("SectionForm", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    toastErrorMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders nothing for sections without single-item fields", () => {
    const Wrapper = makeWrapper();
    const { container } = render(<SectionForm slug="other" />, {
      wrapper: Wrapper,
    });
    expect(container.firstChild).toBeNull();
  });

  it("renders 4 form fields for basic once initial data is loaded", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { fields: {} }));
    const Wrapper = makeWrapper();
    render(<SectionForm slug="basic" />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByLabelText("氏名")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("生年月日")).toBeInTheDocument();
    expect(screen.getByLabelText("血液型")).toBeInTheDocument();
    expect(screen.getByLabelText("緊急連絡先")).toBeInTheDocument();
  });

  it("PATCHes /note-fields/basic after debounce and shows 保存しました", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { fields: {} }));
    // #79: 書き込み前に /sanctum/csrf-cookie を叩くようになった。
    fetchMock.mockResolvedValueOnce(jsonResponse(204));
    fetchMock.mockResolvedValueOnce(jsonResponse(204));

    const Wrapper = makeWrapper();
    render(<SectionForm slug="basic" />, { wrapper: Wrapper });

    const nameInput = await screen.findByLabelText<HTMLInputElement>("氏名");

    // 素早い連続入力（DoD: 送信回数が 1 回に収束）
    fireEvent.change(nameInput, { target: { value: "太" } });
    fireEvent.change(nameInput, { target: { value: "太郎" } });

    await waitFor(
      () => {
        expect(screen.getByRole("status")).toHaveTextContent("保存しました");
      },
      { timeout: WAIT_TIMEOUT },
    );

    const patchCalls = fetchMock.mock.calls.filter(
      ([, init]) => (init as RequestInit | undefined)?.method === "PATCH",
    );
    expect(patchCalls).toHaveLength(1);
    const [url, init] = patchCalls[0] as [string, RequestInit];
    expect(url).toMatch(/\/note-fields\/basic$/);
    expect(init.body).toBe(
      JSON.stringify({ fields: { full_name: "太郎" } }),
    );
  });

  it("keeps the input value and shows toast when PATCH fails (DoD)", async () => {
    fetchMock.mockImplementation(async (url, init) => {
      const method = (init as RequestInit | undefined)?.method ?? "GET";
      const href = String(url);
      // #79: 書き込み前に叩かれる /sanctum/csrf-cookie は 204 で成功させる。
      if (href.includes("/sanctum/csrf-cookie")) return jsonResponse(204);
      if (method === "GET") return jsonResponse(200, { fields: {} });
      if (method === "PATCH") return jsonResponse(500);
      return jsonResponse(404);
    });

    const Wrapper = makeWrapper();
    render(<SectionForm slug="basic" />, { wrapper: Wrapper });

    const nameInput = await screen.findByLabelText<HTMLInputElement>("氏名");
    fireEvent.change(nameInput, { target: { value: "太郎" } });

    await waitFor(
      () => {
        expect(toastErrorMock).toHaveBeenCalledTimes(1);
      },
      { timeout: WAIT_TIMEOUT },
    );

    expect(nameInput.value).toBe("太郎");
    expect(toastErrorMock).toHaveBeenCalledWith(
      expect.stringContaining("保存できませんでした"),
    );
    expect(screen.getByRole("button", { name: /再試行/ })).toBeInTheDocument();
  });

  it("family ロールでは編集フォームを描画せず、値を読み取り専用で表示する", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { fields: { full_name: "山田 太郎" } }),
    );
    const Wrapper = makeWrapper({
      id: 2,
      name: "Hanako",
      email: "h@b.c",
      role: "family",
    });
    render(<SectionForm slug="basic" />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText("山田 太郎")).toBeInTheDocument();
    });
    expect(screen.queryByLabelText("氏名")).toBeNull();
    expect(screen.queryByLabelText("生年月日")).toBeNull();
  });

  it("re-sends the PATCH when 再試行 is clicked", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { fields: {} }));
    // #79: 各 PATCH の前に /sanctum/csrf-cookie が入るので 2 回分。
    fetchMock.mockResolvedValueOnce(jsonResponse(204));
    fetchMock.mockResolvedValueOnce(jsonResponse(500));
    fetchMock.mockResolvedValueOnce(jsonResponse(204));
    fetchMock.mockResolvedValueOnce(jsonResponse(204));

    const Wrapper = makeWrapper();
    render(<SectionForm slug="basic" />, { wrapper: Wrapper });

    const nameInput = await screen.findByLabelText<HTMLInputElement>("氏名");
    fireEvent.change(nameInput, { target: { value: "太郎" } });

    const retryBtn = await screen.findByRole(
      "button",
      { name: /再試行/ },
      { timeout: WAIT_TIMEOUT },
    );
    fireEvent.click(retryBtn);

    await waitFor(
      () => {
        expect(screen.getByRole("status")).toHaveTextContent("保存しました");
      },
      { timeout: WAIT_TIMEOUT },
    );

    const patchCalls = fetchMock.mock.calls.filter(
      ([, init]) => (init as RequestInit | undefined)?.method === "PATCH",
    );
    expect(patchCalls).toHaveLength(2);
  });
});
