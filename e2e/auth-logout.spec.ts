import { expect, test, type Page, type Route } from "@playwright/test";

// フロントは NEXT_PUBLIC_API_URL の有無で送信先が変わる:
//  - 設定あり: `http://localhost:8000/api/logout`（ローカル開発）
//  - 未設定  : `http://localhost:3000/logout`（CI では .env が無い）
// どちらでも同じスタブがマッチするよう regex + method で絞り込む。
const LOGOUT_URL_RE = /\/(api\/)?logout(\?|$)/;
const USER_URL_RE = /\/(api\/)?user(\?|$)/;

const stubApi = async (opts: {
  page: Page;
  logoutStatus: number;
  logoutBody?: unknown;
  user?: unknown;
}) => {
  const { page, logoutStatus, logoutBody, user } = opts;

  // CSRF プリフライト: `/sanctum/csrf-cookie` は `/api` プレフィクスの外。
  await page.route("**/sanctum/csrf-cookie", (route) =>
    route.fulfill({
      status: 204,
      headers: {
        "Set-Cookie": "XSRF-TOKEN=test-token; Path=/; SameSite=Lax",
      },
    }),
  );

  await page.route(LOGOUT_URL_RE, (route: Route) => {
    if (route.request().method() !== "POST") {
      return route.fallback();
    }
    return route.fulfill({
      status: logoutStatus,
      contentType: "application/json",
      body: JSON.stringify(logoutBody ?? {}),
    });
  });

  await page.route(USER_URL_RE, (route: Route) => {
    if (route.request().method() !== "GET") {
      return route.fallback();
    }
    return route.fulfill({
      status: user ? 200 : 401,
      contentType: "application/json",
      body: JSON.stringify(user ?? { message: "Unauthenticated." }),
    });
  });
};

test.describe("logout", () => {
  test("Header のログアウトで / に戻る", async ({ page, context }) => {
    // middleware は session cookie の存在だけを見て一次防衛するので、
    // ダミー cookie を仕込んで (app) 配下に到達できるようにする。
    await context.addCookies([
      {
        name: "laravel_session",
        value: "stub",
        domain: "localhost",
        path: "/",
      },
    ]);

    await stubApi({
      page,
      logoutStatus: 204,
      user: { id: 1, name: "山田 太郎", email: "taro@example.com" },
    });

    await page.goto("/dashboard");
    // ダッシュボードが描画され、Header に UserMenu が出るまで待つ
    await expect(
      page.getByRole("heading", { name: "ダッシュボード" }),
    ).toBeVisible();

    // UserMenu を開いてログアウト
    await page.getByRole("button", { name: "ユーザーメニュー" }).click();
    const [logoutRequest] = await Promise.all([
      page.waitForRequest(
        (req) => LOGOUT_URL_RE.test(req.url()) && req.method() === "POST",
      ),
      page.getByRole("menuitem", { name: "ログアウト" }).click(),
    ]);
    expect(logoutRequest.method()).toBe("POST");

    await page.waitForURL((url) => url.pathname === "/");
    expect(new URL(page.url()).pathname).toBe("/");
  });
});
