import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MemberRow } from "./MemberRow";

import type { FamilyMember } from "@/features/family/api/useFamilyMembers";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const owner: FamilyMember = {
  id: 1,
  name: "山田太郎",
  email: "taro@example.com",
  role: "owner",
  joinedAt: "2026-01-15T00:00:00Z",
};

const family: FamilyMember = {
  id: 2,
  name: "山田花子",
  email: "hanako@example.com",
  role: "family",
  joinedAt: "2026-02-10T00:00:00Z",
};

const jsonResponse = (status: number, body: unknown = null): Response =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: body === null ? undefined : { "Content-Type": "application/json" },
  });

const renderRow = (member: FamilyMember, canManage: boolean) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <ul>{children}</ul>
    </QueryClientProvider>
  );
  return render(<MemberRow member={member} canManage={canManage} />, {
    wrapper,
  });
};

describe("MemberRow", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("owner 行には『権限を解除』ボタンが描画されない（DoD）", () => {
    renderRow(owner, true);
    expect(
      screen.queryByRole("button", { name: /権限を解除/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("本人")).toBeInTheDocument();
  });

  it("family 行では owner 閲覧時に『権限を解除』ボタンが描画される", () => {
    renderRow(family, true);
    expect(
      screen.getByRole("button", { name: /権限を解除/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("家族")).toBeInTheDocument();
  });

  it("family 閲覧時（canManage=false）はどの行にもボタンが描画されない", () => {
    renderRow(family, false);
    expect(
      screen.queryByRole("button", { name: /権限を解除/ }),
    ).not.toBeInTheDocument();
  });

  it("氏名・メール・参加日を表示する", () => {
    renderRow(family, false);
    expect(screen.getByText("山田花子")).toBeInTheDocument();
    expect(screen.getByText("hanako@example.com")).toBeInTheDocument();
    expect(screen.getByLabelText("参加日")).toBeInTheDocument();
  });

  it("『権限を解除』クリックで ConfirmDialog が開く（氏名入りタイトル・説明文）", () => {
    renderRow(family, true);
    fireEvent.click(screen.getByRole("button", { name: /権限を解除/ }));
    expect(
      screen.getByRole("dialog", {
        name: /山田花子 さんの権限を解除しますか？/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/すぐにノートを閲覧できなくなります/),
    ).toBeInTheDocument();
  });

  it("ConfirmDialog で『解除する』を押すと DELETE /family/members/{id} が飛ぶ", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(204));

    renderRow(family, true);
    fireEvent.click(screen.getByRole("button", { name: /権限を解除/ }));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "解除する" }));
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("/family/members/2");
    expect((init as RequestInit)?.method).toBe("DELETE");
  });

  it("ConfirmDialog で『キャンセル』を押すと mutation は呼ばれない", () => {
    renderRow(family, true);
    fireEvent.click(screen.getByRole("button", { name: /権限を解除/ }));
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
