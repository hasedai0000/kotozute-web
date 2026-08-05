import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EntryCard } from "./EntryCard";

describe("EntryCard", () => {
  it("renders title, meta, timing badge and calls onEdit/onDelete", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <EntryCard
        title="○○銀行"
        meta="普通 / 品川支店"
        timing="always"
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );
    expect(screen.getByText("○○銀行")).toBeInTheDocument();
    expect(screen.getByText("普通 / 品川支店")).toBeInTheDocument();
    expect(screen.getByText("常時共有")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "○○銀行 を編集" }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "○○銀行 を削除" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("hides edit/delete buttons when readOnly", () => {
    render(
      <EntryCard
        title="読み取り専用"
        timing="posthumous"
        onEdit={() => undefined}
        onDelete={() => undefined}
        readOnly
      />,
    );
    expect(screen.queryByRole("button", { name: /編集/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /削除/ })).toBeNull();
    expect(screen.getByText("死後開示")).toBeInTheDocument();
  });
});
