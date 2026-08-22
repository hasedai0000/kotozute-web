import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MessageForm } from "./MessageForm";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    push: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

const jsonResponse = (status: number, body: unknown = null): Response =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: body === null ? undefined : { "Content-Type": "application/json" },
  });

const renderForm = (
  ...args: Parameters<typeof MessageForm> extends [infer P] ? [P] : never
) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, ...render(<MessageForm {...args[0]} />, { wrapper }) };
};

describe("MessageForm (create mode)", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    replaceMock.mockReset();
    document.cookie = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to timing=posthumous (死後開示 が選択されている)", () => {
    renderForm({ mode: "create" });
    const posthumousRadio = screen.getByRole("radio", { name: /死後開示/ });
    const alwaysRadio = screen.getByRole("radio", { name: /常時共有/ });
    expect(posthumousRadio).toBeChecked();
    expect(alwaysRadio).not.toBeChecked();
  });

  it("shows a character counter that updates with the body input", async () => {
    renderForm({ mode: "create" });
    expect(screen.getByText("0 / 2000")).toBeInTheDocument();

    const body = screen.getByLabelText("本文");
    fireEvent.change(body, { target: { value: "ありがとう。" } });

    await waitFor(() => {
      expect(screen.getByText("6 / 2000")).toBeInTheDocument();
    });
  });

  it("does not render a delete button in create mode", () => {
    renderForm({ mode: "create" });
    expect(screen.queryByRole("button", { name: /削除/ })).toBeNull();
  });
});

describe("MessageForm (edit mode)", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    replaceMock.mockReset();
    document.cookie = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefills values from the initial message", () => {
    renderForm({
      mode: "edit",
      initial: {
        id: "m1",
        recipient: "妻へ",
        body: "ありがとう。",
        timing: "always",
      },
    });
    expect(screen.getByLabelText("宛先")).toHaveValue("妻へ");
    expect(screen.getByLabelText("本文")).toHaveValue("ありがとう。");
    expect(screen.getByRole("radio", { name: /常時共有/ })).toBeChecked();
  });

  it("opens a ConfirmDialog when the delete button is clicked", () => {
    renderForm({
      mode: "edit",
      initial: {
        id: "m1",
        recipient: "妻へ",
        body: "ありがとう。",
        timing: "posthumous",
      },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "この手紙を削除する" }),
    );
    expect(
      screen.getByRole("heading", { name: "この手紙を削除しますか？" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "削除する" }),
    ).toBeInTheDocument();
  });

  it("fires DELETE and navigates to /messages on confirm", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(204));

    renderForm({
      mode: "edit",
      initial: {
        id: "m1",
        recipient: "妻へ",
        body: "ありがとう。",
        timing: "posthumous",
      },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "この手紙を削除する" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/messages\/m1$/);
    expect(init.method).toBe("DELETE");
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/messages");
    });
  });
});
