import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { queryKeys } from "@/lib/query/queryKeys";

import { DefaultTimingSection } from "./DefaultTimingSection";

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
  return { ...render(<DefaultTimingSection />, { wrapper }), client };
};

const submitForm = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /保存/ }));
  });
};

describe("DefaultTimingSection", () => {
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

  it("initializes the selected timing from the cache", () => {
    renderWith({ defaultTiming: "posthumous", gracePeriodDays: 7 });

    // base-ui の radio は aria-checked と data-checked で選択状態を示す
    const radios = screen.getAllByRole("radio");
    const checked = radios.filter(
      (el) => el.getAttribute("aria-checked") === "true",
    );
    expect(checked).toHaveLength(1);
    // 選択されている radio の隣に「死後開示」ラベルが表示されている
    expect(screen.getByText("死後開示")).toBeInTheDocument();
  });

  it("submits the selected timing, shows a success toast, and patches the cache", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(204)) // csrf
      .mockResolvedValueOnce(jsonResponse(204)); // update

    const { client } = renderWith({
      defaultTiming: "always",
      gracePeriodDays: 7,
    });

    fireEvent.click(screen.getByText("死後開示"));
    await submitForm();

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith(
        "公開タイミングの既定を更新しました",
      );
    });

    const cached = client.getQueryData<NotePreferences>(
      queryKeys.settings.notePreferences,
    );
    expect(cached?.defaultTiming).toBe("posthumous");
    expect(cached?.gracePeriodDays).toBe(7);
  });

  it("shows a generic error toast on network failure", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(204)) // csrf
      .mockRejectedValueOnce(new TypeError("network down")); // update

    renderWith({ defaultTiming: "always", gracePeriodDays: 7 });

    fireEvent.click(screen.getByText("死後開示"));
    await submitForm();

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        "通信エラーが発生しました。時間をおいて再度お試しください",
      );
    });
  });
});
