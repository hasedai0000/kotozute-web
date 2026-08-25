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

type Invitation = {
  id: number | string;
  email: string;
  expiresAt: string;
  status: "pending" | "expired";
};

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

const stubBaseApi = async (page: Page, invitationsRef: { list: Invitation[] }) => {
  await page.route(USER_URL_RE, (route: Route) => {
    if (route.request().method() !== "GET") return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: 1, name: "Taro", email: "taro@example.com" }),
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
          name: "山田太郎",
          email: "taro@example.com",
          role: "owner",
          joinedAt: "2026-01-15T00:00:00Z",
        },
      ]),
    });
  });

  await page.route(FAMILY_INVITATIONS_URL_RE, (route: Route) => {
    const req = route.request();
    const method = req.method();
    if (method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(invitationsRef.list),
      });
    }
    if (method === "POST") {
      const payload = (req.postDataJSON() ?? {}) as { email?: string };
      const created: Invitation = {
        id: `srv-${invitationsRef.list.length + 1}`,
        email: payload.email ?? "",
        expiresAt: "2030-01-01T00:00:00Z",
        status: "pending",
      };
      invitationsRef.list = [...invitationsRef.list, created];
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(created),
      });
    }
    return route.fallback();
  });
};

test.describe("/family 招待発行", () => {
  test("『家族を招待』→ ダイアログ → 送信 → 招待中一覧に反映される (DoD)", async ({
    page,
    context,
  }) => {
    await setSessionCookie(context);
    const invitations = { list: [] as Invitation[] };
    await stubBaseApi(page, invitations);

    await page.goto("/family");

    // 初期状態: 招待中は空
    await expect(page.getByText("まだ招待中の家族はいません")).toBeVisible();

    // ダイアログを開く
    await page.getByRole("button", { name: /家族を招待/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // メールを入力して送信
    await page.getByLabel("メールアドレス").fill("newmember@example.com");
    await page.getByRole("button", { name: /^送信$/ }).click();

    // 招待中一覧に新規メールが表示される（楽観 or 再取得後）
    await expect(page.getByText("newmember@example.com")).toBeVisible();
  });

  test("無効なメールを入力すると送信されずエラーメッセージが表示される", async ({
    page,
    context,
  }) => {
    await setSessionCookie(context);
    const invitations = { list: [] as Invitation[] };
    await stubBaseApi(page, invitations);

    let posted = 0;
    page.on("request", (req) => {
      if (
        FAMILY_INVITATIONS_URL_RE.test(req.url()) &&
        req.method() === "POST"
      ) {
        posted += 1;
      }
    });

    await page.goto("/family");
    await page.getByRole("button", { name: /家族を招待/ }).click();
    await page.getByLabel("メールアドレス").fill("not-an-email");
    await page.getByRole("button", { name: /^送信$/ }).click();

    await expect(
      page.getByText("メールアドレスの形式が正しくありません"),
    ).toBeVisible();
    expect(posted).toBe(0);
  });
});
