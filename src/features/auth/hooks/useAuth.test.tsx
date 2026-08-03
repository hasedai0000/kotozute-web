import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useAuth } from "./useAuth";

describe("useAuth", () => {
  it("throws when used outside AuthProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      expect(() => renderHook(() => useAuth())).toThrowError(
        /useAuth must be used within an AuthProvider/,
      );
    } finally {
      spy.mockRestore();
    }
  });
});
