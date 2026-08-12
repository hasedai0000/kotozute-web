import { expect, test, type Page, type Route } from "@playwright/test";

// フロントは NEXT_PUBLIC_API_URL の有無で送信先が変わる:
//  - 設定あり: `http://localhost:8000/api/note-summary`（ローカル開発）
//  - 未設定  : `http://localhost:3000/note-summary`（CI では .env が無い）
// どちらでも同じスタブがマッチするよう regex + method で絞り込む。
const USER_URL_RE = /\/(api\/)?user(\?|$)/;
const SUMMARY_URL_RE = /\/(api\/)?note-summary(\?|$)/;
const FAMILY_MEMBERS_URL_RE = /\/(api\/)?family\/members(\?|$)/;

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

const stubApi = async (page: Page) => {
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
};

test.describe("/notebook/[section]", () => {
  test("money セクションに機微情報の注意が表示される", async ({
    page,
    context,
  }) => {
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

    await stubApi(page);

    await page.goto("/notebook/money");

    await expect(
      page.getByRole("heading", { level: 1, name: "お金のこと" }),
    ).toBeVisible();

    const note = page.getByRole("note").filter({ hasText: /暗証番号/ });
    await expect(note).toBeVisible();

    // パンくずの「マイノート」リンクが /notebook を指す。
    const crumb = page.getByRole("link", { name: "マイノート" });
    await expect(crumb).toHaveAttribute("href", "/notebook");
  });
});
