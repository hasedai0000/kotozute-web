import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthRole, AuthUser } from "@/features/auth/api/useMe";
import { AuthContext, type AuthContextValue } from "@/providers/AuthProvider";

import { ProfileForm } from "./ProfileForm";

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

const renderWithUser = (user: AuthUser | null, isLoading = false) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  if (user) {
    client.setQueryData(["auth", "me"], user);
  }
  const ctx: AuthContextValue = {
    user,
    isLoading,
    refetch: async () => undefined,
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={ctx}>{children}</AuthContext.Provider>
    </QueryClientProvider>
  );
  return { ...render(<ProfileForm />, { wrapper }), client };
};

const submitForm = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /保存/ }));
  });
};

describe("ProfileForm", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a skeleton while auth is loading", () => {
    renderWithUser(null, true);

    expect(
      screen.queryByRole("button", { name: /保存/ }),
    ).not.toBeInTheDocument();
    // Skeleton の親コンテナ (aria-busy) の存在を確認
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it("initializes name / email from the auth user", () => {
    renderWithUser({ id: 1, name: "山田 太郎", email: "taro@example.com" });

    expect(screen.getByLabelText("お名前")).toHaveValue("山田 太郎");
    expect(screen.getByLabelText("メールアドレス")).toHaveValue(
      "taro@example.com",
    );
  });

  it("shows Zod errors when required fields are cleared and submitted", async () => {
    renderWithUser({ id: 1, name: "山田 太郎", email: "taro@example.com" });

    fireEvent.change(screen.getByLabelText("お名前"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "" },
    });
    await submitForm();

    expect(
      await screen.findByText("お名前を入力してください"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("メールアドレスを入力してください"),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits successfully, shows a success toast, and updates the me cache", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(204)) // csrf
      .mockResolvedValueOnce(jsonResponse(204)); // profile update

    const { client } = renderWithUser({
      id: 1,
      name: "山田 太郎",
      email: "taro@example.com",
      role: "owner",
    });

    fireEvent.change(screen.getByLabelText("お名前"), {
      target: { value: "山田 次郎" },
    });
    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "jiro@example.com" },
    });
    await submitForm();

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith(
        "プロフィールを更新しました",
      );
    });

    const cached = client.getQueryData<AuthUser>(["auth", "me"]);
    expect(cached?.name).toBe("山田 次郎");
    expect(cached?.email).toBe("jiro@example.com");
  });

  it("surfaces a 422 field error on the email field", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(204)) // csrf
      .mockResolvedValueOnce(
        jsonResponse(
          422,
          {
            message: "The given data was invalid.",
            errors: {
              email: ["このメールアドレスは既に使用されています。"],
            },
          },
          "Unprocessable Entity",
        ),
      );

    renderWithUser({ id: 1, name: "山田 太郎", email: "taro@example.com" });

    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "taken@example.com" },
    });
    await submitForm();

    expect(
      await screen.findByText("このメールアドレスは既に使用されています。"),
    ).toBeInTheDocument();
    expect(toastSuccessMock).not.toHaveBeenCalled();
  });

  it("renders the form for family role too (own profile is editable)", () => {
    const familyRole: AuthRole = "family";
    renderWithUser({
      id: 2,
      name: "家族 花子",
      email: "hanako@example.com",
      role: familyRole,
    });

    expect(screen.getByLabelText("お名前")).toBeEnabled();
    expect(screen.getByLabelText("メールアドレス")).toBeEnabled();
    expect(screen.getByRole("button", { name: /保存/ })).toBeEnabled();
  });
});
