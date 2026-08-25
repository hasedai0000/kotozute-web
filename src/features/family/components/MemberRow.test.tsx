import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MemberRow } from "./MemberRow";

import type { FamilyMember } from "@/features/family/api/useFamilyMembers";

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

const wrapInList = (child: React.ReactNode) => <ul>{child}</ul>;

describe("MemberRow", () => {
  it("owner 行には『権限を解除』ボタンが描画されない（DoD）", () => {
    render(wrapInList(<MemberRow member={owner} canManage />));
    expect(
      screen.queryByRole("button", { name: /権限を解除/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("本人")).toBeInTheDocument();
  });

  it("family 行では owner 閲覧時に『権限を解除』ボタンが描画される", () => {
    render(wrapInList(<MemberRow member={family} canManage />));
    expect(
      screen.getByRole("button", { name: /権限を解除/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("家族")).toBeInTheDocument();
  });

  it("family 閲覧時（canManage=false）はどの行にもボタンが描画されない", () => {
    render(wrapInList(<MemberRow member={family} canManage={false} />));
    expect(
      screen.queryByRole("button", { name: /権限を解除/ }),
    ).not.toBeInTheDocument();
  });

  it("氏名・メール・参加日を表示する", () => {
    render(wrapInList(<MemberRow member={family} canManage={false} />));
    expect(screen.getByText("山田花子")).toBeInTheDocument();
    expect(screen.getByText("hanako@example.com")).toBeInTheDocument();
    expect(screen.getByLabelText("参加日")).toBeInTheDocument();
  });
});
