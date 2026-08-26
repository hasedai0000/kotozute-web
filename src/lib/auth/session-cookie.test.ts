import { describe, expect, it } from "vitest";

import { hasSessionCookieFromCookies } from "./session-cookie";

describe("hasSessionCookieFromCookies", () => {
  it("returns false for empty cookie list", () => {
    expect(hasSessionCookieFromCookies([])).toBe(false);
  });

  it("returns true when the default laravel_session cookie exists", () => {
    expect(hasSessionCookieFromCookies([{ name: "laravel_session" }])).toBe(
      true,
    );
  });

  it("returns true when any *_session cookie exists (APP_NAME override)", () => {
    expect(hasSessionCookieFromCookies([{ name: "kotozute_session" }])).toBe(
      true,
    );
  });

  it("returns false when only unrelated cookies exist", () => {
    expect(
      hasSessionCookieFromCookies([
        { name: "XSRF-TOKEN" },
        { name: "some_other" },
      ]),
    ).toBe(false);
  });
});
