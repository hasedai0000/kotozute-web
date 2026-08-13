import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SectionBreadcrumb } from "./SectionBreadcrumb";

describe("SectionBreadcrumb", () => {
  it("マイノート リンクが /notebook を指す", () => {
    render(<SectionBreadcrumb sectionLabel="お金のこと" />);
    const link = screen.getByRole("link", { name: "マイノート" });
    expect(link).toHaveAttribute("href", "/notebook");
  });

  it("末尾に sectionLabel が aria-current='page' で描画される", () => {
    render(<SectionBreadcrumb sectionLabel="お金のこと" />);
    const current = screen.getByText("お金のこと");
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("nav に aria-label='パンくず' が付く", () => {
    render(<SectionBreadcrumb sectionLabel="基本のこと" />);
    expect(screen.getByRole("navigation", { name: "パンくず" })).toBeInTheDocument();
  });
});
