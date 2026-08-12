import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SectionNav } from "./SectionNav";

describe("SectionNav", () => {
  it("先頭 (basic) では 前へ が描画されず、次へ が 医療のこと を指す", () => {
    render(<SectionNav currentSlug="basic" />);
    expect(screen.queryByText(/前へ：/)).not.toBeInTheDocument();
    const next = screen.getByRole("link", { name: /次へ：医療のこと/ });
    expect(next).toHaveAttribute("href", "/notebook/medical");
  });

  it("末尾 (other) では 次へ が描画されず、前へ が ペットのこと を指す", () => {
    render(<SectionNav currentSlug="other" />);
    expect(screen.queryByText(/次へ：/)).not.toBeInTheDocument();
    const prev = screen.getByRole("link", { name: /前へ：ペットのこと/ });
    expect(prev).toHaveAttribute("href", "/notebook/pet");
  });

  it("中間 (money) では 前後 の両方が描画されリンク先も正しい", () => {
    render(<SectionNav currentSlug="money" />);
    const prev = screen.getByRole("link", { name: /前へ：医療のこと/ });
    const next = screen.getByRole("link", { name: /次へ：デジタルのこと/ });
    expect(prev).toHaveAttribute("href", "/notebook/medical");
    expect(next).toHaveAttribute("href", "/notebook/digital");
  });
});
