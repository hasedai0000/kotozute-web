import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { queryKeys } from "@/lib/query/queryKeys";

import { DeleteAccountDialog } from "./DeleteAccountDialog";

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

const routerReplaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: routerReplaceMock }),
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

const renderDialog = (role: "owner" | "family" = "owner") => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  client.setQueryData(queryKeys.auth.me, {
    id: 1,
    name: "Taro",
    email: "taro@example.com",
  });
  const onOpenChange = vi.fn();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const view = render(
    <DeleteAccountDialog open onOpenChange={onOpenChange} role={role} />,
    { wrapper },
  );
  return { ...view, client, onOpenChange };
};

describe("DeleteAccountDialog", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    routerReplaceMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows what will be deleted and that family will lose access (owner)", () => {
    renderDialog("owner");

    expect(screen.getByText("削除されるもの")).toBeInTheDocument();
    expect(
      screen.getByText(/ノートの記入内容/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/家族への招待・共有設定/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/共有していた家族からもノートは見えなくなります/),
    ).toBeInTheDocument();
  });

  it("shows a family-specific removal list when role is family", () => {
    renderDialog("family");

    expect(
      screen.getByText(/共有されていた家族のノートへのアクセス権/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/ノートの記入内容/),
    ).not.toBeInTheDocument();
  });

  it("blocks submission when password is empty", async () => {
    renderDialog();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /削除する/ }));
    });

    expect(
      await screen.findByText(/現在のパスワードを入力してください/),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("deletes on submit, clears auth, and redirects to '/'", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(204)) // csrf
      .mockResolvedValueOnce(jsonResponse(204)); // delete

    const { client, onOpenChange } = renderDialog();

    fireEvent.change(screen.getByLabelText("現在のパスワード"), {
      target: { value: "secret" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /削除する/ }));
    });

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith("アカウントを削除しました");
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(routerReplaceMock).toHaveBeenCalledWith("/");
    expect(client.getQueryData(queryKeys.auth.me)).toBeUndefined();
  });

  it("maps 422 password error to the field message", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(204)) // csrf
      .mockResolvedValueOnce(
        jsonResponse(
          422,
          {
            message: "The given data was invalid.",
            errors: { password: ["現在のパスワードが正しくありません"] },
          },
          "Unprocessable Entity",
        ),
      );

    renderDialog();

    fireEvent.change(screen.getByLabelText("現在のパスワード"), {
      target: { value: "wrong" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /削除する/ }));
    });

    expect(
      await screen.findByText("現在のパスワードが正しくありません"),
    ).toBeInTheDocument();
    expect(toastErrorMock).not.toHaveBeenCalled();
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });

  it("shows a generic error toast on network failure", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(204)) // csrf
      .mockRejectedValueOnce(new TypeError("network down")); // delete

    renderDialog();

    fireEvent.change(screen.getByLabelText("現在のパスワード"), {
      target: { value: "secret" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /削除する/ }));
    });

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        "通信エラーが発生しました。時間をおいて再度お試しください",
      );
    });
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });
});
