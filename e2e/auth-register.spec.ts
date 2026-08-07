import { expect, test, type Page, type Route } from "@playwright/test";

// フロントは NEXT_PUBLIC_API_URL の有無で送信先が変わる:
//  - 設定あり: `http://localhost:8000/api/register`（ローカル開発）
//  - 未設定  : `http://localhost:3000/register`（CI では .env が無い）
// どちらでも同じスタブがマッチするよう regex + method で絞り込む。
const REGISTER_URL_RE = /\/(api\/)?register(\?|$)/;
const USER_URL_RE = /\/(api\/)?user(\?|$)/;

const stubApi = async (opts: {
  page: Page;
  registerStatus: number;
  registerBody?: unknown;
  userAfterRegister?: unknown;
}) => {
  const { page, registerStatus, registerBody, userAfterRegister } = opts;

  // CSRF プリフライト: `/sanctum/csrf-cookie` は `/api` プレフィクスの外。
  await page.route("**/sanctum/csrf-cookie", (route) =>
    route.fulfill({
      status: 204,
      headers: {
        "Set-Cookie": "XSRF-TOKEN=test-token; Path=/; SameSite=Lax",
      },
    }),
  );

  // POST /register のみスタブする（同名パスの GET ページ描画にはフォールバック）。
  await page.route(REGISTER_URL_RE, (route: Route) => {
    if (route.request().method() !== "POST") {
      return route.fallback();
    }
    return route.fulfill({
      status: registerStatus,
      contentType: "application/json",
      body: JSON.stringify(registerBody ?? {}),
    });
  });

  await page.route(USER_URL_RE, (route: Route) => {
    if (route.request().method() !== "GET") {
      return route.fallback();
    }
    return route.fulfill({
      status: userAfterRegister ? 200 : 401,
      contentType: "application/json",
      body: JSON.stringify(
        userAfterRegister ?? { message: "Unauthenticated." },
      ),
    });
  });

  await page.route("**/dashboard**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<html><body><h1>Dashboard stub</h1></body></html>",
    }),
  );
};

test.describe("/register", () => {
  test("成功: 有効な入力で /dashboard に遷移する", async ({ page }) => {
    await stubApi({
      page,
      registerStatus: 204,
      userAfterRegister: {
        id: 1,
        name: "山田 太郎",
        email: "taro@example.com",
      },
    });

    await page.goto("/register");
    await page.getByLabel("お名前").fill("山田 太郎");
    await page.getByLabel("メールアドレス").fill("taro@example.com");
    await page.getByLabel("パスワード", { exact: true }).fill("password123");
    await page.getByLabel("パスワード（確認）").fill("password123");
    await page.getByRole("button", { name: "登録する" }).click();

    await page.waitForURL("**/dashboard");
    expect(page.url()).toContain("/dashboard");
  });

  test("失敗: 422 でメール重複エラーが表示され /register に留まる", async ({
    page,
  }) => {
    await stubApi({
      page,
      registerStatus: 422,
      registerBody: {
        message: "The given data was invalid.",
        errors: {
          email: ["このメールアドレスは既に登録されています。"],
        },
      },
    });

    await page.goto("/register");
    await page.getByLabel("お名前").fill("山田 太郎");
    await page.getByLabel("メールアドレス").fill("taro@example.com");
    await page.getByLabel("パスワード", { exact: true }).fill("password123");
    await page.getByLabel("パスワード（確認）").fill("password123");
    await page.getByRole("button", { name: "登録する" }).click();

    await expect(
      page.getByText("このメールアドレスは既に登録されています。"),
    ).toBeVisible();
    expect(page.url()).toContain("/register");
  });
});
