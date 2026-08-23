import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { queryKeys } from "@/lib/query/queryKeys";

import { GracePeriodSection } from "./GracePeriodSection";

import type { NotePreferences } from "@/features/settings/schema/notePreferences";

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

const jsonResponse = (status: number, body: unknown = null): Response =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: body === null ? undefined : { "Content-Type": "application/json" },
  });

const renderWith = (preferences: NotePreferences) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  client.setQueryData<NotePreferences>(
    queryKeys.settings.notePreferences,
    preferences,
  );
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { ...render(<GracePeriodSection />, { wrapper }), client };
};

const submitForm = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /保存/ }));
  });
};

describe("GracePeriodSection", () => {
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

  it("renders the description text from screen_spec §9", () => {
    renderWith({ defaultTiming: "always", gracePeriodDays: 7 });
    expect(
      screen.getByText(
        /ご家族が死後開示を発動してから、実際に公開されるまでの猶予期間/,
      ),
    ).toBeInTheDocument();
  });

  it("initializes the number input from the cached preferences", () => {
    renderWith({ defaultTiming: "always", gracePeriodDays: 14 });
    expect(
      screen.getByLabelText("待機期間（日、数値入力）"),
    ).toHaveValue(14);
  });

  it("rejects a value below the minimum with a Zod error and does not submit", async () => {
    renderWith({ defaultTiming: "always", gracePeriodDays: 7 });

    fireEvent.change(screen.getByLabelText("待機期間（日、数値入力）"), {
      target: { value: "2" },
    });
    await submitForm();

    expect(
      await screen.findByText(/3日以上で指定してください/),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a value above the maximum with a Zod error and does not submit", async () => {
    renderWith({ defaultTiming: "always", gracePeriodDays: 7 });

    fireEvent.change(screen.getByLabelText("待機期間（日、数値入力）"), {
      target: { value: "31" },
    });
    await submitForm();

    expect(
      await screen.findByText(/30日以下で指定してください/),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits a valid value, shows a success toast, and patches the cache", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(204)) // csrf
      .mockResolvedValueOnce(jsonResponse(204)); // update

    const { client } = renderWith({
      defaultTiming: "always",
      gracePeriodDays: 7,
    });

    fireEvent.change(screen.getByLabelText("待機期間（日、数値入力）"), {
      target: { value: "21" },
    });
    await submitForm();

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith("待機期間を更新しました");
    });

    const cached = client.getQueryData<NotePreferences>(
      queryKeys.settings.notePreferences,
    );
    expect(cached?.gracePeriodDays).toBe(21);
    expect(cached?.defaultTiming).toBe("always");
  });
});
