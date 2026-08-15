import {
  expect,
  test,
  type BrowserContext,
  type Page,
  type Route,
} from "@playwright/test";

// フロントは NEXT_PUBLIC_API_URL の有無で送信先が変わる:
//  - 設定あり: `http://localhost:8000/api/note-summary`（ローカル開発）
//  - 未設定  : `http://localhost:3000/note-summary`（CI では .env が無い）
// どちらでも同じスタブがマッチするよう regex + method で絞り込む。
const USER_URL_RE = /\/(api\/)?user(\?|$)/;
const SUMMARY_URL_RE = /\/(api\/)?note-summary(\?|$)/;
const FAMILY_MEMBERS_URL_RE = /\/(api\/)?family\/members(\?|$)/;
const FIELDS_URL_RE = /\/(api\/)?note-fields\/[a-z_]+(\?|$)/;

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

  // 既定は空の初期値。テストごとに個別 route を上書きできる。
  await page.route(FIELDS_URL_RE, (route: Route) => {
    if (route.request().method() !== "GET") return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ fields: {} }),
    });
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

test.describe("/notebook/[section]", () => {
  test("money セクションに機微情報の注意が表示される", async ({
    page,
    context,
  }) => {
    // middleware は session cookie の存在だけを見て一次防衛するので、
    // ダミー cookie を仕込んで (app) 配下に到達できるようにする。
    await setSessionCookie(context);
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

  test("basic の氏名を入力すると debounce 後に PATCH が 1 回だけ発火する (DoD)", async ({
    page,
    context,
  }) => {
    await setSessionCookie(context);
    await stubApi(page);

    // PATCH をカウントしつつ 204 を返すスタブ。
    let patchCalls = 0;
    await page.route(FIELDS_URL_RE, async (route: Route) => {
      const req = route.request();
      if (req.method() !== "PATCH") return route.fallback();
      patchCalls += 1;
      await route.fulfill({ status: 204 });
    });

    await page.goto("/notebook/basic");

    const nameInput = page.getByLabel("氏名");
    await expect(nameInput).toBeVisible();

    // 素早い連続入力（送信は 1 回に収束するはず）
    await nameInput.pressSequentially("山田 太郎", { delay: 30 });

    // 保存インジケータが「保存しました」に到達するまで待つ。
    await expect(
      page.getByRole("status").filter({ hasText: /保存しました/ }),
    ).toBeVisible({ timeout: 5000 });

    expect(patchCalls).toBe(1);
  });

  test("basic の PATCH が失敗すると値が保持され、再試行できる (DoD)", async ({
    page,
    context,
  }) => {
    await setSessionCookie(context);
    await stubApi(page);

    let patchCalls = 0;
    await page.route(FIELDS_URL_RE, async (route: Route) => {
      const req = route.request();
      if (req.method() !== "PATCH") return route.fallback();
      patchCalls += 1;
      // 1 回目は 500、2 回目以降は 204。
      if (patchCalls === 1) {
        await route.fulfill({ status: 500 });
      } else {
        await route.fulfill({ status: 204 });
      }
    });

    await page.goto("/notebook/basic");
    const nameInput = page.getByLabel("氏名");
    await nameInput.fill("太郎");

    // エラー表示と再試行ボタンを待つ
    const retry = page.getByRole("button", { name: /再試行/ });
    await expect(retry).toBeVisible({ timeout: 5000 });
    // 値は消えていない
    await expect(nameInput).toHaveValue("太郎");

    await retry.click();

    await expect(
      page.getByRole("status").filter({ hasText: /保存しました/ }),
    ).toBeVisible({ timeout: 5000 });
    expect(patchCalls).toBe(2);
  });
});
