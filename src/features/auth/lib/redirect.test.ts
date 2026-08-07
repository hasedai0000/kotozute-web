import { describe, expect, it } from "vitest";

import { sanitizeRedirect } from "./redirect";

describe("sanitizeRedirect", () => {
  it("returns null for empty or null input", () => {
    expect(sanitizeRedirect(null)).toBeNull();
    expect(sanitizeRedirect("")).toBeNull();
  });

  it("accepts a same-origin relative path", () => {
    expect(sanitizeRedirect("/notebook")).toBe("/notebook");
    expect(sanitizeRedirect("/dashboard?tab=a")).toBe("/dashboard?tab=a");
  });

  it("rejects protocol-relative URLs (//evil.com)", () => {
    expect(sanitizeRedirect("//evil.example.com")).toBeNull();
  });

  it("rejects absolute URLs", () => {
    expect(sanitizeRedirect("https://evil.example.com")).toBeNull();
    expect(sanitizeRedirect("http://foo")).toBeNull();
  });

  it("rejects paths not starting with /", () => {
    expect(sanitizeRedirect("notebook")).toBeNull();
  });
});
