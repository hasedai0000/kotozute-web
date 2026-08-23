import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataExportSection } from "./DataExportSection";

describe("DataExportSection", () => {
  it("displays a 'preparing' notice", () => {
    render(<DataExportSection />);

    expect(screen.getByText("準備中")).toBeInTheDocument();
    expect(
      screen.getByText(/PDF での書き出しは近日提供予定です/),
    ).toBeInTheDocument();
  });

  it("links to /preview from the CTA button", () => {
    render(<DataExportSection />);

    const link = screen.getByRole("link", { name: /プレビュー画面を開く/ });
    expect(link).toHaveAttribute("href", "/preview");
  });
});
