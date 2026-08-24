import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PreviewToolbar } from "./PreviewToolbar";

describe("PreviewToolbar", () => {
  const printSpy = vi.fn();

  beforeEach(() => {
    printSpy.mockReset();
    vi.stubGlobal("print", printSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("invokes window.print when the print button is clicked", () => {
    render(
      <PreviewToolbar showUnfilled={false} onShowUnfilledChange={() => {}} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /PDF を保存/ }));
    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it("hides itself from print output via print:hidden utility", () => {
    const { container } = render(
      <PreviewToolbar showUnfilled={false} onShowUnfilledChange={() => {}} />,
    );
    // ルート要素に print:hidden が付いていること（globals.css を触らず Tailwind バリアントで完結する契約）
    expect(container.firstChild).toHaveClass("print:hidden");
  });

  it("emits onShowUnfilledChange when the switch is toggled", () => {
    const onChange = vi.fn();
    render(
      <PreviewToolbar showUnfilled={false} onShowUnfilledChange={onChange} />,
    );
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0]).toBe(true);
  });
});
