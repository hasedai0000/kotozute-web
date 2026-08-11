import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SECTIONS } from "../constants/sections";

import { SectionCard } from "./SectionCard";

describe("SectionCard", () => {
  it("renders label and links to the section page", () => {
    render(<SectionCard slug="money" />);
    expect(screen.getByText(SECTIONS.money.label)).toBeInTheDocument();
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/notebook/money");
  });

  it("shows filled/total from useSectionProgress", () => {
    render(
      <SectionCard
        slug="money"
        entryCountByCategory={{ bank_account: 1, insurance: 1 }}
      />,
    );
    const total = SECTIONS.money.entryCategories.length;
    expect(screen.getByText(`2/${total}`)).toBeInTheDocument();
  });
});
