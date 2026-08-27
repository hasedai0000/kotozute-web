import {
  expect,
  test,
  type BrowserContext,
  type Page,
  type Route,
} from "@playwright/test";

const USER_URL_RE = /\/(api\/)?user(\?|$)/;
const SUMMARY_URL_RE = /\/(api\/)?note-summary(\?|$)/;
const FAMILY_MEMBERS_URL_RE = /\/(api\/)?family\/members(\?|$)/;
const FAMILY_INVITATIONS_URL_RE = /\/(api\/)?family\/invitations(\/[^/?]+)?(\?|$)/;
const INVITATION_VERIFY_RE = /\/(api\/)?invitations\/[^/]+\/verify(\?|$)/;
const INVITATION_ACCEPT_RE = /\/(api\/)?invitations\/[^/]+\/accept(\?|$)/;

const emptySummary = {
  perSection: {
    basic: { filledFields: 0, entryCountByCategory: {} },
    medical: { filledFields: 0, entryCountByCategory: {} },
    money: { filledFields: 0, entryCountByCategory: {} },
    digital: { filledFields: 0, entryCountByCategory: {} },
    funeral: { filledFields: 0, entryCountByCategory: {} },
    pet: { filledFields: 0, entryCountByCategory: {} },
    other: { filledFields: 0, entryCountByCategory: {} },
  },
  messagesCount: 0,
};

const setSessionCookie = async (context: BrowserContext) => {
  await context.addCookies([
    {
      name: "laravel_session",
      value: "stub",
      domain: "localhost",
      path: "/",
    },
  ]);
};

type SetupOpts = {
  currentEmail?: string;
  verify?: {
    status: "valid" | "expired" | "used" | "not_found";
    inviterName?: string;
    familyName?: string;
    invitedEmail?: string;
  };
  acceptStatus?: number;
};

const stubBaseApis = async (page: Page, opts: SetupOpts) => {
  const {
    currentEmail = "taro@example.com",
    verify = {
      status: "valid",
      inviterName: "山田 太郎",
      familyName: "山田家",
      invitedEmail: "taro@example.com",
    },
    acceptStatus = 204,
  } = opts;

  // CSRF: POST 前にフロントが叩く
  await page.route("**/sanctum/csrf-cookie", (route: Route) =>
    route.fulfill({
      status: 204,
      headers: {
        "Set-Cookie": "XSRF-TOKEN=test-token; Path=/; SameSite=Lax",
      },
    }),
  );

  await page.route(USER_URL_RE, (route: Route) => {
    if (route.request().method() !== "GET") return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: 1, name: "Taro", email: currentEmail }),
    });
  });

  await page.route(SUMMARY_URL_RE, (route: Route) => {
    if (route.request().method() !== "GET") return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(emptySummary),
    });
  });

  await page.route(FAMILY_MEMBERS_URL_RE, (route: Route) => {
    if (route.request().method() !== "GET") return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  await page.route(FAMILY_INVITATIONS_URL_RE, (route: Route) => {
    if (route.request().method() !== "GET") return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  await page.route(INVITATION_VERIFY_RE, (route: Route) => {
    if (route.request().method() !== "GET") return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(verify),
    });
  });

  await page.route(INVITATION_ACCEPT_RE, (route: Route) => {
    if (route.request().method() !== "POST") return route.fallback();
    return route.fulfill({
      status: acceptStatus,
      contentType: "application/json",
      body: acceptStatus >= 400 ? JSON.stringify({ message: "error" }) : "",
    });
  });
};

test.describe("招待受諾 /invitations/[token]", () => {
  test("有効 + ログイン済み → 参加する → /dashboard (DoD)", async ({
    page,
    context,
  }) => {
    await setSessionCookie(context);
    await stubBaseApis(page, {});

    await page.goto("/invitations/valid-token");

    await expect(
      page.getByText(/山田 太郎さんからノートの共有に招待されています/),
    ).toBeVisible();

    await page.getByTestId("accept-invitation").click();

    await page.waitForURL("**/dashboard");
    expect(new URL(page.url()).pathname).toBe("/dashboard");
  });

  test("招待メールと違うアカウントでは警告が出るが、参加は可能", async ({
    page,
    context,
  }) => {
    await setSessionCookie(context);
    await stubBaseApis(page, {
      currentEmail: "different@example.com",
      verify: {
        status: "valid",
        inviterName: "山田 太郎",
        invitedEmail: "taro@example.com",
      },
    });

    await page.goto("/invitations/valid-token");

    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("taro@example.com");
    await expect(alert).toContainText("different@example.com");

    // 強行できることを確認
    await expect(page.getByTestId("accept-invitation")).toBeEnabled();
  });

  test("受諾が 410 を返すと dashboard に遷移しない", async ({
    page,
    context,
  }) => {
    await setSessionCookie(context);
    await stubBaseApis(page, { acceptStatus: 410 });

    await page.goto("/invitations/valid-token");

    await page.getByTestId("accept-invitation").click();

    // 少し待って dashboard に飛んでいないことを確認
    await page.waitForTimeout(500);
    expect(new URL(page.url()).pathname).not.toBe("/dashboard");
  });
});
