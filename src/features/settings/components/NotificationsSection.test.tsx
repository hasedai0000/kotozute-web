import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { queryKeys } from "@/lib/query/queryKeys";

import { NotificationsSection } from "./NotificationsSection";

import type { NotificationPreferences } from "@/features/settings/schema/notifications";

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

const renderWith = (preferences: NotificationPreferences) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  client.setQueryData<NotificationPreferences>(
    queryKeys.settings.notifications,
    preferences,
  );
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { ...render(<NotificationsSection />, { wrapper }), client };
};

const submitForm = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /保存/ }));
  });
};

describe("NotificationsSection", () => {
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

  it("reflects the cached reminderEnabled=false as an unchecked switch", () => {
    renderWith({ reminderEnabled: false });

    const sw = screen.getByRole("switch", { name: /見直しリマインド/ });
    expect(sw.getAttribute("aria-checked")).toBe("false");
  });

  it("reflects the cached reminderEnabled=true as a checked switch", () => {
    renderWith({ reminderEnabled: true });

    const sw = screen.getByRole("switch", { name: /見直しリマインド/ });
    expect(sw.getAttribute("aria-checked")).toBe("true");
  });

  it("submits the toggled value, shows a success toast, and patches the cache", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(204)) // csrf
      .mockResolvedValueOnce(jsonResponse(204)); // update

    const { client } = renderWith({ reminderEnabled: false });

    fireEvent.click(screen.getByRole("switch", { name: /見直しリマインド/ }));
    await submitForm();

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith("通知設定を更新しました");
    });

    const cached = client.getQueryData<NotificationPreferences>(
      queryKeys.settings.notifications,
    );
    expect(cached?.reminderEnabled).toBe(true);

    const putCall = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(putCall[0]).toMatch(/\/user\/notifications$/);
    expect(putCall[1].method).toBe("PUT");
    expect(putCall[1].body).toBe(JSON.stringify({ reminder_enabled: true }));
  });

  it("shows a generic error toast on network failure", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(204)) // csrf
      .mockRejectedValueOnce(new TypeError("network down")); // update

    renderWith({ reminderEnabled: false });

    fireEvent.click(screen.getByRole("switch", { name: /見直しリマインド/ }));
    await submitForm();

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        "通信エラーが発生しました。時間をおいて再度お試しください",
      );
    });
  });
});
