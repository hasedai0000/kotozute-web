import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SavingIndicator } from "./SavingIndicator";

describe("SavingIndicator", () => {
  it("renders nothing visible in idle state", () => {
    const { container } = render(<SavingIndicator status="idle" />);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    // placeholder は視覚的に空
    expect(container.textContent).toBe("");
  });

  it("shows 保存中… with role=status while saving", () => {
    render(<SavingIndicator status="saving" />);
    const el = screen.getByRole("status");
    expect(el).toHaveTextContent("保存中");
  });

  it("shows 保存しました with role=status when saved", () => {
    render(<SavingIndicator status="saved" />);
    const el = screen.getByRole("status");
    expect(el).toHaveTextContent("保存しました");
  });

  it("shows 保存できませんでした with role=alert on error", () => {
    render(<SavingIndicator status="error" />);
    const el = screen.getByRole("alert");
    expect(el).toHaveTextContent("保存できませんでした");
  });

  it("invokes onRetry when the retry button is clicked", () => {
    const onRetry = vi.fn();
    render(<SavingIndicator status="error" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: /再試行/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
