import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TimingBadge } from "./TimingBadge";

describe("TimingBadge", () => {
  it("renders the always variant with green token classes", () => {
    const { container } = render(<TimingBadge variant="always" />);
    expect(screen.getByText("常時共有")).toBeInTheDocument();
    const badge = container.querySelector('[data-slot="badge"]');
    expect(badge?.className).toContain("bg-timing-always");
    expect(badge?.className).toContain("text-timing-always-foreground");
  });

  it("renders the posthumous variant with amber token classes and a lock icon", () => {
    const { container } = render(<TimingBadge variant="posthumous" />);
    expect(screen.getByText("死後開示")).toBeInTheDocument();
    const badge = container.querySelector('[data-slot="badge"]');
    expect(badge?.className).toContain("bg-timing-posthumous");
    expect(badge?.className).toContain("text-timing-posthumous-foreground");
    const icon = badge?.querySelector("svg");
    expect(icon).not.toBeNull();
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
  });
});
