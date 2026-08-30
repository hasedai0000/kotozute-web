import { describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => {
  type CookieBag = { name: string; value: string };
  class FakeNextRequest {
    readonly nextUrl: URL & { clone: () => URL };
    private readonly cookieBag: CookieBag[];
    constructor(url: string, cookies: Record<string, string> = {}) {
      const parsed = new URL(url);
      this.nextUrl = Object.assign(parsed, {
        clone: () => new URL(parsed.toString()),
      }) as URL & { clone: () => URL };
      this.cookieBag = Object.entries(cookies).map(([name, value]) => ({
        name,
        value,
      }));
    }
    get cookies() {
      return { getAll: () => this.cookieBag };
    }
  }
  const NextResponse = {
    next: () => ({ type: "next" as const }),
    redirect: (url: URL) => ({ type: "redirect" as const, url }),
  };
  return { NextResponse, NextRequest: FakeNextRequest };
});

import { NextRequest, NextResponse } from "next/server";

import { middleware } from "./middleware";

const makeReq = (url: string, cookies: Record<string, string> = {}) =>
  new (NextRequest as unknown as new (
    url: string,
    cookies?: Record<string, string>,
  ) => NextRequest)(url, cookies);

describe("middleware", () => {
  it("redirects to /login with redirect param when no session cookie", () => {
    const res = middleware(
      makeReq("http://localhost:3000/dashboard"),
    ) as unknown as { type: string; url: URL };

    expect(res.type).toBe("redirect");
    expect(res.url.pathname).toBe("/login");
    expect(res.url.searchParams.get("redirect")).toBe("/dashboard");
  });

  it("preserves query string in the redirect param", () => {
    const res = middleware(
      makeReq("http://localhost:3000/notebook/basic?tab=1"),
    ) as unknown as { type: string; url: URL };

    expect(res.url.searchParams.get("redirect")).toBe("/notebook/basic?tab=1");
  });

  it("passes through when a laravel-session cookie exists", () => {
    const res = middleware(
      makeReq("http://localhost:3000/dashboard", { "laravel-session": "abc" }),
    );

    expect(res).toEqual(NextResponse.next());
  });

  it("passes through when any *-session cookie exists (APP_NAME override)", () => {
    const res = middleware(
      makeReq("http://localhost:3000/dashboard", { "kotozute-session": "abc" }),
    );

    expect(res).toEqual(NextResponse.next());
  });
});
