import {
  expect,
  test,
  type BrowserContext,
  type Page,
  type Route,
} from "@playwright/test";

// notebook-section.spec.ts / notebook-entry-dialog.spec.ts と同じスタブ流儀。
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

type EntriesHandler = (route: Route) => Promise<void> | void;

const stubApiWithEntries = async (page: Page, entries: EntriesHandler) => {
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

  await page.route(ENTRIES_URL_RE, entries);
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

test.describe("/notebook/money entries CRUD", () => {
  test("追加成功でカードとトーストが出る", async ({ page, context }) => {
    await setSessionCookie(context);
    await stubApiWithEntries(page, (route) => {
      const method = route.request().method();
      if (method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ entries: [] }),
        });
      }
      if (method === "POST") {
        const payload = route.request().postDataJSON() ?? {};
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "srv-1",
            category: payload.category,
            values: payload.values,
            timing: payload.timing ?? "always",
          }),
        });
      }
      return route.fallback();
    });

    await page.goto("/notebook/money");
    await page.getByRole("button", { name: /銀行口座 を追加/ }).click();
    await page.getByLabel(/銀行名/).fill("○○銀行");
    await page.getByRole("button", { name: "保存" }).click();

    // 楽観的追加で即カードが出る
    const card = page.getByRole("listitem").filter({ hasText: "○○銀行" });
    await expect(card).toBeVisible();
    // 成功トースト
    await expect(page.getByText("追加しました")).toBeVisible();
  });

  test("追加失敗で楽観的更新が巻き戻り、エラートーストが出る (DoD)", async ({
    page,
    context,
  }) => {
    await setSessionCookie(context);
    await stubApiWithEntries(page, (route) => {
      const method = route.request().method();
      if (method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ entries: [] }),
        });
      }
      if (method === "POST") {
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "Server error" }),
        });
      }
      return route.fallback();
    });

    await page.goto("/notebook/money");
    await page.getByRole("button", { name: /銀行口座 を追加/ }).click();
    await page.getByLabel(/銀行名/).fill("△△銀行");
    await page.getByRole("button", { name: "保存" }).click();

    // 失敗トーストが出て、カードは残らない
    await expect(page.getByText("追加できませんでした")).toBeVisible();
    await expect(
      page.getByRole("listitem").filter({ hasText: "△△銀行" }),
    ).toHaveCount(0);
  });

  test("削除は ConfirmDialog を経由し、成功でカードが消える", async ({
    page,
    context,
  }) => {
    await setSessionCookie(context);
    await stubApiWithEntries(page, (route) => {
      const method = route.request().method();
      if (method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            entries: [
              {
                id: "e1",
                category: "bank_account",
                values: { bank_name: "◯銀行" },
                timing: "always",
              },
            ],
          }),
        });
      }
      if (method === "DELETE") {
        return route.fulfill({ status: 204 });
      }
      return route.fallback();
    });

    await page.goto("/notebook/money");
    await expect(
      page.getByRole("listitem").filter({ hasText: "◯銀行" }),
    ).toBeVisible();

    // 削除ボタン → ConfirmDialog
    await page.getByRole("button", { name: /◯銀行 を削除/ }).click();
    await expect(
      page.getByRole("heading", { name: "この項目を削除しますか" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "削除する" }).click();

    // カードが消える + 成功トースト
    await expect(
      page.getByRole("listitem").filter({ hasText: "◯銀行" }),
    ).toHaveCount(0);
    await expect(page.getByText("削除しました")).toBeVisible();
  });

  test("削除失敗で楽観的削除が巻き戻る (DoD)", async ({ page, context }) => {
    await setSessionCookie(context);
    await stubApiWithEntries(page, (route) => {
      const method = route.request().method();
      if (method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            entries: [
              {
                id: "e1",
                category: "bank_account",
                values: { bank_name: "◇銀行" },
                timing: "always",
              },
            ],
          }),
        });
      }
      if (method === "DELETE") {
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "Server error" }),
        });
      }
      return route.fallback();
    });

    await page.goto("/notebook/money");
    const card = page.getByRole("listitem").filter({ hasText: "◇銀行" });
    await expect(card).toBeVisible();

    await page.getByRole("button", { name: /◇銀行 を削除/ }).click();
    await page.getByRole("button", { name: "削除する" }).click();

    // エラートースト → カードは戻る
    await expect(page.getByText("削除できませんでした")).toBeVisible();
    await expect(card).toBeVisible();
  });
});
