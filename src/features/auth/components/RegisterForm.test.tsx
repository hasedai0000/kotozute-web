import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RegisterForm } from "./RegisterForm";

const pushMock = vi.fn();
const searchParamsGetMock = vi.fn<(name: string) => string | null>(() => null);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({ get: searchParamsGetMock }),
}));

const toastErrorMock = vi.fn();
vi.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => toastErrorMock(...args) },
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
    name: "山田 太郎",
    email: "taro@example.com",
    password: "password123",
    passwordConfirmation: "password123",
    ...input,
  };
  fireEvent.change(screen.getByLabelText("お名前"), {
    target: { value: values.name },
  });
  fireEvent.change(screen.getByLabelText("メールアドレス"), {
    target: { value: values.email },
  });
  fireEvent.change(screen.getByLabelText("パスワード"), {
    target: { value: values.password },
  });
  fireEvent.change(screen.getByLabelText("パスワード（確認）"), {
    target: { value: values.passwordConfirmation },
  });
};

const submitForm = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /登録/ }));
  });
};

describe("RegisterForm", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    pushMock.mockReset();
    toastErrorMock.mockReset();
    searchParamsGetMock.mockReset();
    searchParamsGetMock.mockReturnValue(null);
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows Zod validation errors for all required fields on empty submit", async () => {
    renderWithProviders(<RegisterForm />);

    await submitForm();

    expect(
      await screen.findByText("お名前を入力してください"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("メールアドレスを入力してください"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("パスワードを入力してください"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("確認用パスワードを入力してください"),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a mismatch error on the passwordConfirmation field", async () => {
    renderWithProviders(<RegisterForm />);
    fillForm({ passwordConfirmation: "differentPass1" });
    await submitForm();

    expect(
      await screen.findByText("パスワードが一致しません"),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces a 422 field error on the email field (email already taken)", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(204)) // csrf
      .mockResolvedValueOnce(
        jsonResponse(
          422,
          {
            message: "The given data was invalid.",
            errors: {
              email: ["このメールアドレスは既に登録されています。"],
            },
          },
          "Unprocessable Entity",
        ),
      );

    renderWithProviders(<RegisterForm />);
    fillForm();
    await submitForm();

    expect(
      await screen.findByText("このメールアドレスは既に登録されています。"),
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("disables the submit button while pending (prevents double submit)", async () => {
    let resolveRegister: (value: Response) => void = () => undefined;
    fetchMock
      .mockResolvedValueOnce(jsonResponse(204)) // csrf resolves immediately
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveRegister = resolve;
          }),
      );

    renderWithProviders(<RegisterForm />);
    fillForm();
    await submitForm();

    const button = await screen.findByRole("button", { name: "登録中…" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");

    await act(async () => {
      resolveRegister(jsonResponse(204));
    });
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("redirects to /dashboard on success when no redirect param is set", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(204)) // csrf
      .mockResolvedValueOnce(jsonResponse(204)); // register

    renderWithProviders(<RegisterForm />);
    fillForm();
    await submitForm();

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("respects a safe redirect query param", async () => {
    searchParamsGetMock.mockImplementation((name) =>
      name === "redirect" ? "/notebook" : null,
    );
    fetchMock
      .mockResolvedValueOnce(jsonResponse(204))
      .mockResolvedValueOnce(jsonResponse(204));

    renderWithProviders(<RegisterForm />);
    fillForm();
    await submitForm();

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/notebook");
    });
  });

  it("ignores an unsafe redirect (protocol-relative URL)", async () => {
    searchParamsGetMock.mockImplementation((name) =>
      name === "redirect" ? "//evil.example.com" : null,
    );
    fetchMock
      .mockResolvedValueOnce(jsonResponse(204))
      .mockResolvedValueOnce(jsonResponse(204));

    renderWithProviders(<RegisterForm />);
    fillForm();
    await submitForm();

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/dashboard");
    });
  });
});
