import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InviteDialog } from "./InviteDialog";

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

const jsonResponse = (
  status: number,
  body: unknown = null,
  statusText = "",
): Response =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    statusText,
    headers: body === null ? undefined : { "Content-Type": "application/json" },
  });

const renderDialog = () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const onOpenChange = vi.fn();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const view = render(
    <InviteDialog open onOpenChange={onOpenChange} />,
    { wrapper },
  );
  return { ...view, client, onOpenChange };
};

describe("InviteDialog", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("無効なメールでエラー表示（DoD）", async () => {
    renderDialog();

    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "foo" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /送信/ }));
    });

    expect(
      await screen.findByText("メールアドレスの形式が正しくありません"),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("空文字で送信すると必須エラーを表示する", async () => {
    renderDialog();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /送信/ }));
    });

    expect(
      await screen.findByText("メールアドレスを入力してください"),
    ).toBeInTheDocument();
  });

  it("有効なメールで POST が飛び、成功トーストで dialog が閉じる", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(201, {
        id: 99,
        email: "new@example.com",
        expiresAt: "2030-01-01T00:00:00Z",
        status: "pending",
      }),
    );

    const { onOpenChange } = renderDialog();

    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "new@example.com" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /送信/ }));
    });

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith("招待メールを送信しました。");
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("422 のフィールドエラーがメール欄に反映される", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        422,
        {
          message: "The given data was invalid.",
          errors: { email: ["この招待は既に送信されています"] },
        },
        "Unprocessable Entity",
      ),
    );

    renderDialog();

    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "dup@example.com" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /送信/ }));
    });

    expect(
      await screen.findByText("この招待は既に送信されています"),
    ).toBeInTheDocument();
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it("通信失敗で generic トーストが表示される", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("network down"));

    renderDialog();

    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "network@example.com" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /送信/ }));
    });

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalled();
    });
  });
});
