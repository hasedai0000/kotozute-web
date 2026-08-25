import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Invitation } from "@/features/family/api/useInvitations";

import { InvitationRow } from "./InvitationRow";

const pending: Invitation = {
  id: 1,
  email: "invited@example.com",
  expiresAt: "2999-01-01T00:00:00Z",
  status: "pending",
};

const expired: Invitation = {
  id: 2,
  email: "old@example.com",
  expiresAt: "2000-01-01T00:00:00Z",
  status: "expired",
};

const wrapInList = (child: React.ReactNode) => <ul>{child}</ul>;

describe("InvitationRow", () => {
  it("status='expired' で『期限切れ』Badge が付く（DoD）", () => {
    render(wrapInList(<InvitationRow invitation={expired} canManage />));
    expect(screen.getByText("期限切れ")).toBeInTheDocument();
  });

  it("status='pending' で有効期限が表示される", () => {
    render(wrapInList(<InvitationRow invitation={pending} canManage />));
    expect(screen.getByText(/有効期限:/)).toBeInTheDocument();
    expect(screen.queryByText("期限切れ")).not.toBeInTheDocument();
  });

  it("owner 閲覧時に『再送』『取り消し』ボタンが描画される", () => {
    render(wrapInList(<InvitationRow invitation={pending} canManage />));
    expect(screen.getByRole("button", { name: "再送" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "取り消し" }),
    ).toBeInTheDocument();
  });

  it("family 閲覧時（canManage=false）は再送・取り消しが描画されない", () => {
    render(
      wrapInList(<InvitationRow invitation={pending} canManage={false} />),
    );
    expect(
      screen.queryByRole("button", { name: "再送" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "取り消し" }),
    ).not.toBeInTheDocument();
  });
});
