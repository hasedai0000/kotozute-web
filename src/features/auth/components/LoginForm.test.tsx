import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LoginForm } from "./LoginForm";

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

const fillCredentials = (email: string, password: string) => {
  fireEvent.change(screen.getByLabelText("メールアドレス"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText("パスワード"), {
    target: { value: password },
  });
};

const submitForm = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /ログイン/ }));
  });
};

describe("LoginForm", () => {
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

  it("shows Zod validation errors on empty submit", async () => {
    renderWithProviders(<LoginForm />);

    await submitForm();

    expect(
      await screen.findByText("メールアドレスを入力してください"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("パスワードを入力してください"),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the credentials error alert on 401 without revealing which field is wrong", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(204)) // csrf
      .mockResolvedValueOnce(
        jsonResponse(401, { message: "Unauthenticated." }, "Unauthorized"),
      );

    renderWithProviders(<LoginForm />);
    fillCredentials("user@example.com", "wrong-password");
    await submitForm();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "メールアドレスまたはパスワードが正しくありません",
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("redirects to /dashboard on success when no redirect param", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(204)) // csrf
      .mockResolvedValueOnce(jsonResponse(204)); // login

    renderWithProviders(<LoginForm />);
    fillCredentials("user@example.com", "secret");
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

    renderWithProviders(<LoginForm />);
    fillCredentials("user@example.com", "secret");
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

    renderWithProviders(<LoginForm />);
    fillCredentials("user@example.com", "secret");
    await submitForm();

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("disables the submit button while pending (prevents double submit)", async () => {
    let resolveLogin: (value: Response) => void = () => undefined;
    fetchMock
      .mockResolvedValueOnce(jsonResponse(204)) // csrf resolves immediately
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveLogin = resolve;
          }),
      );

    renderWithProviders(<LoginForm />);
    fillCredentials("user@example.com", "secret");
    await submitForm();

    const button = await screen.findByRole("button", {
      name: "ログイン中…",
    });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");

    await act(async () => {
      resolveLogin(jsonResponse(204));
    });
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/dashboard");
    });
  });
});
