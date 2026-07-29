import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("joins class names and drops falsy values", () => {
    expect(cn("a", false && "b", null, undefined, "c")).toBe("a c");
  });

  it("merges conflicting Tailwind classes with the later value winning", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
