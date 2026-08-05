import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ConfirmDialog } from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  it("shows title/description when open and calls onConfirm on click", async () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="削除しますか"
        description="この操作は元に戻せません。"
        confirmLabel="削除する"
        variant="destructive"
        onConfirm={onConfirm}
      />,
    );
    expect(screen.getByText("削除しますか")).toBeInTheDocument();
    expect(screen.getByText("この操作は元に戻せません。")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "削除する" }));
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("closes when cancel is clicked", () => {
    const onOpenChange = vi.fn();
    render(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="続行しますか"
        description="変更を破棄します。"
        onConfirm={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
