import {
  expect,
  test,
  type BrowserContext,
  type Page,
  type Route,
} from "@playwright/test";

// notebook-entries.spec.ts と同じスタブ流儀。
const USER_URL_RE = /\/(api\/)?user(\?|$)/;
const SUMMARY_URL_RE = /\/(api\/)?note-summary(\?|$)/;
const FAMILY_MEMBERS_URL_RE = /\/(api\/)?family\/members(\?|$)/;
const MESSAGES_URL_RE = /\/(api\/)?messages(\/[^/?]+)?(\?|$)/;

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

type MessagesHandler = (route: Route) => Promise<void> | void;

const stubApiWithMessages = async (page: Page, messages: MessagesHandler) => {
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
      body: JSON.stringify([]),
    });
  });

  // /messages は Next.js のページ URL でもあり、API パスとも一致する。
  // ページナビゲーション（document 要求）は素通しし、fetch/XHR のみを API として扱う。
  await page.route(MESSAGES_URL_RE, (route: Route) => {
    const type = route.request().resourceType();
    if (type !== "fetch" && type !== "xhr") return route.fallback();
    return messages(route);
  });
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

test.describe("/messages 一覧", () => {
  test("空配列のとき EmptyState と CTA が描画される", async ({
    page,
    context,
  }) => {
    await setSessionCookie(context);
    await stubApiWithMessages(page, (route) => {
      if (route.request().method() !== "GET") return route.fallback();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ messages: [] }),
      });
    });

    await page.goto("/messages");

    await expect(page.getByText("まだ手紙がありません")).toBeVisible();
    // ヘッダ + EmptyState の 2 箇所に CTA
    await expect(
      page.getByRole("button", { name: /手紙を書く/ }).first(),
    ).toBeVisible();
  });

  // 家族ロール想定：バックが posthumous を除外して空配列を返すケース。
  // CLAUDE.md 絶対ルール #8：クライアントでは何もフィルタしない。
  test("家族ロール想定（API が空配列）で EmptyState が描画される", async ({
    page,
    context,
  }) => {
    await setSessionCookie(context);
    await stubApiWithMessages(page, (route) => {
      if (route.request().method() !== "GET") return route.fallback();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ messages: [] }),
      });
    });

    await page.goto("/messages");
    await expect(page.getByText("まだ手紙がありません")).toBeVisible();
    // カードは 1 件も描画されない
    await expect(page.getByRole("listitem")).toHaveCount(0);
  });

  test("404 のとき EmptyState にフォールバックする（バック未実装対応）", async ({
    page,
    context,
  }) => {
    await setSessionCookie(context);
    await stubApiWithMessages(page, (route) => {
      if (route.request().method() !== "GET") return route.fallback();
      return route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ message: "Not Found" }),
      });
    });

    await page.goto("/messages");
    await expect(page.getByText("まだ手紙がありません")).toBeVisible();
  });

  test("複数の手紙が並び、TimingBadge の色分けが反映される", async ({
    page,
    context,
  }) => {
    await setSessionCookie(context);
    await stubApiWithMessages(page, (route) => {
      if (route.request().method() !== "GET") return route.fallback();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          messages: [
            {
              id: "m1",
              recipient: "妻へ",
              body: "いつもありがとう。感謝しています。",
              timing: "posthumous",
            },
            {
              id: "m2",
              recipient: "息子へ",
              body: "健康で。頼みます。",
              timing: "always",
            },
          ],
        }),
      });
    });

    await page.goto("/messages");

    const wifeCard = page.getByRole("listitem").filter({ hasText: "妻へ" });
    const sonCard = page.getByRole("listitem").filter({ hasText: "息子へ" });
    await expect(wifeCard).toBeVisible();
    await expect(sonCard).toBeVisible();
    await expect(wifeCard.getByLabel("死後開示")).toBeVisible();
    await expect(sonCard.getByLabel("常時共有")).toBeVisible();
  });

  test.describe("モバイルビューポート", () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test("iPhone サイズでも宛先・本文・バッジが可視である", async ({
      page,
      context,
    }) => {
      await setSessionCookie(context);
      await stubApiWithMessages(page, (route) => {
        if (route.request().method() !== "GET") return route.fallback();
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            messages: [
              {
                id: "m1",
                recipient: "母へ",
                body: "ありがとうございました。",
                timing: "posthumous",
              },
            ],
          }),
        });
      });

      await page.goto("/messages");
      const card = page.getByRole("listitem").filter({ hasText: "母へ" });
      await expect(card).toBeVisible();
      await expect(card.getByText("ありがとうございました。")).toBeVisible();
      await expect(card.getByLabel("死後開示")).toBeVisible();
    });
  });
});
