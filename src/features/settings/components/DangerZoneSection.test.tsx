import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { DangerZoneSection } from "./DangerZoneSection";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

const renderSection = (role: "owner" | "family" = "owner") => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<DangerZoneSection role={role} />, { wrapper });
};

describe("DangerZoneSection", () => {
  it("hides the dialog until the destructive button is clicked", async () => {
    renderSection();

    expect(screen.queryByText("アカウントを削除しますか")).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /アカウントを削除する/ }));
    });

    expect(
      await screen.findByText("アカウントを削除しますか"),
    ).toBeInTheDocument();
  });
});
