import { describe, it, expect } from "vitest";

import { ApiError } from "./errors";
import { unwrap } from "./openapi";

const successResult = <T>(data: T, response: Response) => ({
  data,
  response,
});

const errorResult = (error: unknown, response: Response) => ({
  error,
  response,
});

describe("unwrap", () => {
  it("returns data on success", async () => {
    const res = new Response(null, { status: 200 });
    const value = await unwrap<{ status: "ok" }>(
      Promise.resolve(successResult({ status: "ok" as const }, res)),
    );
    expect(value).toEqual({ status: "ok" });
  });

  it("throws ApiError with parsed body on error", async () => {
    const res = new Response(null, {
      status: 422,
      statusText: "Unprocessable Entity",
    });
    const body = {
      message: "invalid",
      errors: { email: ["required"] },
    };

    await expect(
      unwrap(Promise.resolve(errorResult(body, res))),
    ).rejects.toMatchObject({
      name: "ApiError",
      status: 422,
      message: "invalid",
      fields: { email: ["required"] },
    });
  });

  it("uses statusText as fallback message when error body has no message", async () => {
    const res = new Response(null, {
      status: 500,
      statusText: "Internal Server Error",
    });

    const promise = unwrap(Promise.resolve(errorResult({}, res)));

    await expect(promise).rejects.toMatchObject({
      status: 500,
      message: "Internal Server Error",
    });
  });

  it("wraps fetch rejections as ApiError.networkError", async () => {
    const cause = new Error("network down");

    const promise = unwrap(Promise.reject(cause));

    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({
      status: 0,
      message: "ネットワークに接続できませんでした",
    });
  });
});
