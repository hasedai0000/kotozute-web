import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SectionProgress } from "./SectionProgress";

describe("SectionProgress", () => {
  it("renders filled/total text and label", () => {
    render(<SectionProgress filled={3} total={10} label="お金のこと" />);
    expect(screen.getByText("お金のこと")).toBeInTheDocument();
    expect(screen.getByText("3/10")).toBeInTheDocument();
    expect(
      screen.getByLabelText("お金のこと の進捗 3/10"),
    ).toBeInTheDocument();
  });

  it("does not throw when total is 0", () => {
    render(<SectionProgress filled={0} total={0} label="未定義" />);
    expect(screen.getByText("0/0")).toBeInTheDocument();
  });

  it("clamps filled to total when filled > total", () => {
    render(<SectionProgress filled={15} total={10} />);
    expect(screen.getByText("10/10")).toBeInTheDocument();
  });
});
