import { describe, it, expect } from "vitest";
import { ApiError, fromResponse } from "./errors";

const jsonResponse = (
  status: number,
  body: unknown,
  statusText = "",
): Response =>
  new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { "Content-Type": "application/json" },
  });

describe("ApiError", () => {
  it("isApiError narrows unknown values", () => {
    const err = new ApiError({ status: 500, message: "boom" });
    expect(ApiError.isApiError(err)).toBe(true);
    expect(ApiError.isApiError(new Error("plain"))).toBe(false);
    expect(ApiError.isApiError("nope")).toBe(false);
  });

  it("networkError uses status 0 and Japanese message", () => {
    const cause = new Error("offline");
    const err = ApiError.networkError(cause);
    expect(err.status).toBe(0);
    expect(err.message).toBe("ネットワークに接続できませんでした");
    expect((err as Error & { cause?: unknown }).cause).toBe(cause);
  });
});

describe("fromResponse", () => {
  it("parses Laravel 422 validation errors into fields", async () => {
    const res = jsonResponse(422, {
      message: "The given data was invalid.",
      errors: {
        email: ["メールアドレスの形式が正しくありません"],
        password: ["パスワードを入力してください"],
      },
    });

    const err = await fromResponse(res);

    expect(err.status).toBe(422);
    expect(err.message).toBe("The given data was invalid.");
    expect(err.fields).toEqual({
      email: ["メールアドレスの形式が正しくありません"],
      password: ["パスワードを入力してください"],
    });
  });

  it("parses 401 with message and optional code", async () => {
    const res = jsonResponse(401, {
      message: "認証に失敗しました",
      code: "unauthorized",
    });

    const err = await fromResponse(res);

    expect(err.status).toBe(401);
    expect(err.message).toBe("認証に失敗しました");
    expect(err.code).toBe("unauthorized");
    expect(err.fields).toBeUndefined();
  });

  it("parses 429 with message and no fields", async () => {
    const res = jsonResponse(429, {
      message: "Too Many Requests",
    });

    const err = await fromResponse(res);

    expect(err.status).toBe(429);
    expect(err.message).toBe("Too Many Requests");
    expect(err.fields).toBeUndefined();
    expect(err.code).toBeUndefined();
  });

  it("falls back to statusText when the body is not JSON", async () => {
    const res = new Response("<html>oops</html>", {
      status: 500,
      statusText: "Internal Server Error",
      headers: { "Content-Type": "text/html" },
    });

    const err = await fromResponse(res);

    expect(err.status).toBe(500);
    expect(err.message).toBe("Internal Server Error");
    expect(err.fields).toBeUndefined();
  });

  it("falls back to statusText when JSON parsing fails", async () => {
    const res = new Response("not-json", {
      status: 500,
      statusText: "Internal Server Error",
      headers: { "Content-Type": "application/json" },
    });

    const err = await fromResponse(res);

    expect(err.status).toBe(500);
    expect(err.message).toBe("Internal Server Error");
  });
});
