import {
  expect,
  test,
  type BrowserContext,
  type Page,
  type Route,
} from "@playwright/test";

// notebook-section.spec.ts と同じスタブ流儀。API 未実装領域は route で 200/空を返す。
const USER_URL_RE = /\/(api\/)?user(\?|$)/;
const SUMMARY_URL_RE = /\/(api\/)?note-summary(\?|$)/;
const FAMILY_MEMBERS_URL_RE = /\/(api\/)?family\/members(\?|$)/;
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

  await page.route(FIELDS_URL_RE, (route: Route) => {
    if (route.request().method() !== "GET") return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ fields: {} }),
    });
  });

  // note-entries: GET は空配列。POST/PATCH/DELETE は簡易にエコーで返す。
  await page.route(ENTRIES_URL_RE, async (route: Route) => {
    const method = route.request().method();
    if (method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ entries: [] }),
      });
    }
    if (method === "POST") {
      const req = route.request();
      const payload = req.postDataJSON() ?? {};
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: `srv-${Date.now()}`,
          category: payload.category,
          values: payload.values ?? {},
          timing: payload.timing ?? "always",
        }),
      });
    }
    return route.fallback();
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

test.describe("/notebook/money EntryDialog", () => {
  test("追加ボタンでダイアログが開き、必須未入力ではエラーが出て、値を入れると閉じる (DoD)", async ({
    page,
    context,
  }) => {
    await setSessionCookie(context);
    await stubApi(page);

    await page.goto("/notebook/money");

    // 「銀行口座 を追加」ボタンを押してダイアログを開く
    const openBtn = page.getByRole("button", { name: /銀行口座 を追加/ });
    await expect(openBtn).toBeVisible();
    await openBtn.click();

    // ダイアログのタイトルが見える
    await expect(
      page.getByRole("heading", { name: /銀行口座 を追加/ }),
    ).toBeVisible();

    // sensitive セクション (money) なので注意カードが出る
    await expect(page.getByRole("note").filter({ hasText: /暗証番号/ })).toBeVisible();

    // 必須未入力で保存 → エラー文
    await page.getByRole("button", { name: "保存" }).click();
    await expect(page.getByText("銀行名を入力してください")).toBeVisible();

    // 銀行名を埋めて保存 → ダイアログが閉じる
    await page.getByLabel(/銀行名/).fill("○○銀行");
    await page.getByRole("button", { name: "保存" }).click();

    await expect(
      page.getByRole("heading", { name: /銀行口座 を追加/ }),
    ).toBeHidden();
  });
});
