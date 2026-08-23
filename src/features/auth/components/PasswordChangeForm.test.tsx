import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PasswordChangeForm } from "./PasswordChangeForm";

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

const renderWithProviders = (ui: ReactNode) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
};

const fillForm = (input?: Partial<Record<string, string>>) => {
  const values = {
    currentPassword: "current123",
    newPassword: "newpass123",
    newPasswordConfirmation: "newpass123",
    ...input,
  };
  fireEvent.change(screen.getByLabelText("現在のパスワード"), {
    target: { value: values.currentPassword },
  });
  fireEvent.change(screen.getByLabelText("新しいパスワード"), {
    target: { value: values.newPassword },
  });
  fireEvent.change(screen.getByLabelText("新しいパスワード（確認）"), {
    target: { value: values.newPasswordConfirmation },
  });
};

const submitForm = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /パスワード/ }));
  });
};

describe("PasswordChangeForm", () => {
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

  it("shows Zod errors for all required fields on empty submit", async () => {
    renderWithProviders(<PasswordChangeForm />);

    await submitForm();

    expect(
      await screen.findByText("現在のパスワードを入力してください"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("新しいパスワードを入力してください"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("確認用パスワードを入力してください"),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a mismatch error on the newPasswordConfirmation field (DoD)", async () => {
    renderWithProviders(<PasswordChangeForm />);
    fillForm({ newPasswordConfirmation: "differentPass1" });
    await submitForm();

    expect(
      await screen.findByText("パスワードが一致しません"),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the 8-character minimum error for a short new password", async () => {
    renderWithProviders(<PasswordChangeForm />);
    fillForm({ newPassword: "short7c", newPasswordConfirmation: "short7c" });
    await submitForm();

    expect(
      await screen.findByText("パスワードは8文字以上で入力してください"),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits successfully, shows a success toast, and resets the form", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(204)) // csrf
      .mockResolvedValueOnce(jsonResponse(204)); // password change

    renderWithProviders(<PasswordChangeForm />);
    fillForm();
    await submitForm();

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith("パスワードを変更しました");
    });
    expect(screen.getByLabelText("現在のパスワード")).toHaveValue("");
    expect(screen.getByLabelText("新しいパスワード")).toHaveValue("");
    expect(screen.getByLabelText("新しいパスワード（確認）")).toHaveValue("");
  });

  it("surfaces a 422 field error on the current password field", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(204)) // csrf
      .mockResolvedValueOnce(
        jsonResponse(
          422,
          {
            message: "The given data was invalid.",
            errors: {
              current_password: ["現在のパスワードが正しくありません。"],
            },
          },
          "Unprocessable Entity",
        ),
      );

    renderWithProviders(<PasswordChangeForm />);
    fillForm({ currentPassword: "wrong" });
    await submitForm();

    expect(
      await screen.findByText("現在のパスワードが正しくありません。"),
    ).toBeInTheDocument();
    expect(toastSuccessMock).not.toHaveBeenCalled();
  });
});
