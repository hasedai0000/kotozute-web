import AxeBuilder from "@axe-core/playwright";
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
const FAMILY_INVITATIONS_URL_RE =
  /\/(api\/)?family\/invitations(\/[^/?]+)?(\?|$)/;
const FIELDS_URL_RE = /\/(api\/)?note-fields\/[a-z_]+(\?|$)/;
const ENTRIES_URL_RE = /\/(api\/)?note-entries\/[a-z_]+(\/[^/?]+)?(\?|$)/;

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

const stubAppApi = async (page: Page) => {
  await page.route(USER_URL_RE, (route: Route) => {
    if (route.request().method() !== "GET") return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: 1,
        name: "山田 太郎",
        email: "taro@example.com",
      }),
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
      body: JSON.stringify([
        {
          id: 1,
          name: "山田 太郎",
          email: "taro@example.com",
          role: "owner",
          joinedAt: "2026-01-15T00:00:00Z",
        },
      ]),
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

  await page.route(FIELDS_URL_RE, (route: Route) => {
    if (route.request().method() !== "GET") return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ fields: {} }),
    });
  });

  await page.route(ENTRIES_URL_RE, (route: Route) => {
    if (route.request().method() !== "GET") return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ entries: [] }),
    });
  });
};

const runAxe = async (page: Page) =>
  new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();

test.describe("a11y: axe-core critical=0 on primary screens", () => {
  test("/ (LP) は critical 違反 0", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: /終活ノート/ }),
    ).toBeVisible();

    const results = await runAxe(page);
    const critical = results.violations.filter((v) => v.impact === "critical");
    if (critical.length > 0) {
      // 失敗時にどのルールで落ちたか stdout に出す
      console.log(
        "[axe] critical violations on /:",
        JSON.stringify(critical, null, 2),
      );
    }
    expect(critical).toEqual([]);
  });

  test("/login は critical 違反 0", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { level: 1, name: "ログイン" }),
    ).toBeVisible();

    const results = await runAxe(page);
    const critical = results.violations.filter((v) => v.impact === "critical");
    if (critical.length > 0) {
      console.log("[axe] critical violations on /login:", JSON.stringify(critical, null, 2));
    }
    expect(critical).toEqual([]);
  });

  test("/dashboard は critical 違反 0", async ({ page, context }) => {
    await setSessionCookie(context);
    await stubAppApi(page);

    await page.goto("/dashboard");
    // Header の owner 表示（ユーザーメニューボタン）が出るのを待つ
    await expect(page.getByRole("button", { name: /ユーザーメニュー/ })).toBeVisible();

    const results = await runAxe(page);
    const critical = results.violations.filter((v) => v.impact === "critical");
    if (critical.length > 0) {
      console.log("[axe] critical violations on /dashboard:", JSON.stringify(critical, null, 2));
    }
    expect(critical).toEqual([]);
  });

  test("/notebook/basic は critical 違反 0", async ({ page, context }) => {
    await setSessionCookie(context);
    await stubAppApi(page);

    await page.goto("/notebook/basic");
    await expect(
      page.getByRole("heading", { level: 1, name: "基本のこと" }),
    ).toBeVisible();

    const results = await runAxe(page);
    const critical = results.violations.filter((v) => v.impact === "critical");
    if (critical.length > 0) {
      console.log("[axe] critical violations on /notebook/basic:", JSON.stringify(critical, null, 2));
    }
    expect(critical).toEqual([]);
  });
});
