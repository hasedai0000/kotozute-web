import { expect, test, type Page } from "@playwright/test";

// LP・middleware・実 API を巻き込まないため、
// /sanctum/csrf-cookie と /login と /user はすべてブラウザ側で page.route() スタブする。
const stubApi = async (opts: {
  page: Page;
  loginStatus: number;
  loginBody?: unknown;
  userAfterLogin?: unknown;
}) => {
  const { page, loginStatus, loginBody, userAfterLogin } = opts;

  await page.route("**/sanctum/csrf-cookie", (route) =>
    route.fulfill({
      status: 204,
      headers: {
        // 非 httpOnly の XSRF-TOKEN。フォームは document.cookie から読む。
        "Set-Cookie": "XSRF-TOKEN=test-token; Path=/; SameSite=Lax",
      },
    }),
  );

  await page.route("**/api/login", (route) =>
    route.fulfill({
      status: loginStatus,
      contentType: "application/json",
      body: JSON.stringify(loginBody ?? {}),
    }),
  );

  await page.route("**/api/user", (route) =>
    route.fulfill({
      status: userAfterLogin ? 200 : 401,
      contentType: "application/json",
      body: JSON.stringify(
        userAfterLogin ?? { message: "Unauthenticated." },
      ),
    }),
  );

  // middleware が (app) 配下をガードするので、ダッシュボード遷移時の応答も
  // ネットワーク経由で来ないよう最小の HTML を返しておく。
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
