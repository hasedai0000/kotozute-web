import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AcceptInvitationForm } from "./AcceptInvitationForm";

const pushMock = vi.fn();
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

const toastErrorMock = vi.fn();
const toastInfoMock = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    info: (...args: unknown[]) => toastInfoMock(...args),
    success: vi.fn(),
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

type RenderOpts = {
  invitedEmail?: string;
  familyName?: string;
  currentEmail?: string | null; // null = 未ログイン扱い（/user → 401）
};

const renderForm = ({
  invitedEmail,
  familyName,
  currentEmail = "taro@example.com",
}: RenderOpts = {}) => {
  // /user は最初の render で叩かれる。テストシナリオごとに前 / 後で切り替えるため
  // fetchMock 経由でセットする。ここでは default で /user → 200 or 401 を仕込む。
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const view = render(
    <AcceptInvitationForm
      token="tok"
      inviterName="山田 太郎"
      familyName={familyName}
      invitedEmail={invitedEmail}
    />,
    { wrapper },
  );
  return { ...view, client, currentEmail };
};

describe("AcceptInvitationForm", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    pushMock.mockReset();
    refreshMock.mockReset();
    toastErrorMock.mockReset();
    toastInfoMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const primeMe = (email: string | null) => {
    if (email === null) {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(401, { message: "Unauthenticated." }, "Unauthorized"),
      );
    } else {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(200, { id: 1, name: "Taro", email }),
      );
    }
  };

  it("招待者名と家族名を表示する", async () => {
    primeMe("taro@example.com");
    renderForm({ familyName: "山田家" });

    expect(
      screen.getByText(/山田 太郎さんからノートの共有に招待されています/),
    ).toBeInTheDocument();
    expect(screen.getByText("「山田家」")).toBeInTheDocument();
  });

  it("invitedEmail が undefined なら警告を出さない", async () => {
    primeMe("taro@example.com");
    renderForm();

    await waitFor(() => {
      // /user 反映を待つ
      expect(fetchMock).toHaveBeenCalled();
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("invitedEmail === me.email のとき警告を出さない", async () => {
    primeMe("taro@example.com");
    renderForm({ invitedEmail: "taro@example.com" });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("invitedEmail !== me.email のとき警告を出し、参加ボタンは有効のまま", async () => {
    primeMe("taro@example.com");
    renderForm({ invitedEmail: "hanako@example.com" });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("hanako@example.com");
    expect(alert).toHaveTextContent("taro@example.com");

    const button = screen.getByTestId("accept-invitation");
    expect(button).toBeEnabled();
  });

  it("me が未取得のとき警告を出さない（false negative は許容）", async () => {
    primeMe(null);
    renderForm({ invitedEmail: "hanako@example.com" });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("参加ボタン押下で POST /invitations/tok/accept が飛び /dashboard に遷移する", async () => {
    primeMe("taro@example.com");
    // accept: 204
    fetchMock.mockResolvedValueOnce(jsonResponse(204));

    renderForm();

    await act(async () => {
      fireEvent.click(screen.getByTestId("accept-invitation"));
    });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/dashboard");
    });
    const acceptCall = fetchMock.mock.calls[1]!;
    expect(String(acceptCall[0])).toContain("/invitations/tok/accept");
    expect((acceptCall[1] as RequestInit)?.method).toBe("POST");
  });

  it("401 で /login?redirect=/invitations/<token> に遷移する", async () => {
    primeMe("taro@example.com");
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { message: "Unauthenticated." }, "Unauthorized"),
    );

    renderForm();

    await act(async () => {
      fireEvent.click(screen.getByTestId("accept-invitation"));
    });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        `/login?redirect=${encodeURIComponent("/invitations/tok")}`,
      );
    });
  });

  it("409 で toast + /dashboard に遷移する", async () => {
    primeMe("taro@example.com");
    fetchMock.mockResolvedValueOnce(
      jsonResponse(409, { message: "Conflict" }, "Conflict"),
    );

    renderForm();

    await act(async () => {
      fireEvent.click(screen.getByTestId("accept-invitation"));
    });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/dashboard");
    });
    expect(toastInfoMock).toHaveBeenCalled();
  });

  it("410 で toast + router.refresh を呼ぶ", async () => {
    primeMe("taro@example.com");
    fetchMock.mockResolvedValueOnce(
      jsonResponse(410, { message: "Gone" }, "Gone"),
    );

    renderForm();

    await act(async () => {
      fireEvent.click(screen.getByTestId("accept-invitation"));
    });

    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalled();
    });
    expect(toastErrorMock).toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
