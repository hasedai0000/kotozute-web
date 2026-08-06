import { expect, test, type Page, type Route } from "@playwright/test";

// フロントは NEXT_PUBLIC_API_URL の有無で送信先が変わる:
//  - 設定あり: `http://localhost:8000/api/login`（ローカル開発）
//  - 未設定  : `http://localhost:3000/login`（CI では .env が無い）
// どちらでも同じスタブがマッチするよう regex + method で絞り込む。
const LOGIN_URL_RE = /\/(api\/)?login(\?|$)/;
const USER_URL_RE = /\/(api\/)?user(\?|$)/;

const stubApi = async (opts: {
  page: Page;
  loginStatus: number;
  loginBody?: unknown;
  userAfterLogin?: unknown;
}) => {
  const { page, loginStatus, loginBody, userAfterLogin } = opts;

  // CSRF プリフライト: `/sanctum/csrf-cookie` は `/api` プレフィクスの外。
  await page.route("**/sanctum/csrf-cookie", (route) =>
    route.fulfill({
      status: 204,
      headers: {
        // 非 httpOnly の XSRF-TOKEN。フォームは document.cookie から読む。
        "Set-Cookie": "XSRF-TOKEN=test-token; Path=/; SameSite=Lax",
      },
    }),
  );

  // POST /login のみスタブする（同名パスの GET ページ描画にはフォールバック）。
  await page.route(LOGIN_URL_RE, (route: Route) => {
    if (route.request().method() !== "POST") {
      return route.fallback();
    }
    return route.fulfill({
      status: loginStatus,
      contentType: "application/json",
      body: JSON.stringify(loginBody ?? {}),
    });
  });

  await page.route(USER_URL_RE, (route: Route) => {
    if (route.request().method() !== "GET") {
      return route.fallback();
    }
    return route.fulfill({
      status: userAfterLogin ? 200 : 401,
      contentType: "application/json",
      body: JSON.stringify(userAfterLogin ?? { message: "Unauthenticated." }),
    });
  });

  // middleware が (app) 配下をガードするので、遷移時の応答は最小 HTML でスタブ。
  await page.route("**/dashboard**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<html><body><h1>Dashboard stub</h1></body></html>",
    }),
  );
};

test.describe("/login", () => {
  test("成功: 資格情報が正しければ /dashboard に遷移する", async ({ page }) => {
    await stubApi({
      page,
      loginStatus: 204,
      userAfterLogin: { id: 1, name: "Taro", email: "user@example.com" },
    });

    await page.goto("/login");
    await page.getByLabel("メールアドレス").fill("user@example.com");
    await page.getByLabel("パスワード").fill("correct-password");
    await page.getByRole("button", { name: "ログイン" }).click();

    await page.waitForURL("**/dashboard");
    expect(page.url()).toContain("/dashboard");
  });

  test("失敗: 401 のときエラーメッセージを出し /login に留まる", async ({
    page,
  }) => {
    await stubApi({
      page,
      loginStatus: 401,
      loginBody: { message: "Unauthenticated." },
    });

    await page.goto("/login");
    await page.getByLabel("メールアドレス").fill("user@example.com");
    await page.getByLabel("パスワード").fill("wrong-password");
    await page.getByRole("button", { name: "ログイン" }).click();

    // Next.js のルートアナウンサーも role="alert" を持つため、テキストで絞り込む。
    const alert = page.getByRole("alert").filter({
      hasText: "メールアドレスまたはパスワードが正しくありません",
    });
    await expect(alert).toBeVisible();
    expect(page.url()).toContain("/login");
  });
});
