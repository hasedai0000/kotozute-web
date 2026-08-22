import {
  expect,
  test,
  type BrowserContext,
  type Page,
  type Request,
  type Route,
} from "@playwright/test";

// messages.spec.ts と同じスタブ流儀。API パス /messages を route で吸い取り、
// ページナビゲーション (document) は素通しする。
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

test.describe("/messages/new 作成", () => {
  test("初回入力で POST が飛び URL が /messages/{id} に置き換わる", async ({
    page,
    context,
  }) => {
    await setSessionCookie(context);

    let created = 0;
    await stubApiWithMessages(page, (route) => {
      const method = route.request().method();
      if (method === "POST") {
        created += 1;
        const payload = route.request().postDataJSON() ?? {};
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "srv-1",
            recipient: payload.recipient ?? "",
            body: payload.body ?? "",
            timing: payload.timing ?? "posthumous",
          }),
        });
      }
      if (method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            message: {
              id: "srv-1",
              recipient: "妻へ",
              body: "初回",
              timing: "posthumous",
            },
          }),
        });
      }
      return route.fallback();
    });

    await page.goto("/messages/new");
    await page.getByLabel("宛先").fill("妻へ");

    await page.waitForURL(/\/messages\/srv-1$/, { timeout: 3000 });
    expect(created).toBe(1);
  });

  test("既定 timing は posthumous（死後開示 が選択されている）", async ({
    page,
    context,
  }) => {
    await setSessionCookie(context);
    await stubApiWithMessages(page, (route) => route.fallback());

    await page.goto("/messages/new");
    const posthumous = page.getByRole("radio", { name: /死後開示/ });
    await expect(posthumous).toBeChecked();
  });

  test("素早い連続入力で POST は 1 回に収束する (DoD)", async ({
    page,
    context,
  }) => {
    await setSessionCookie(context);

    const postRequests: Request[] = [];
    page.on("request", (req) => {
      if (
        MESSAGES_URL_RE.test(req.url()) &&
        req.method() === "POST" &&
        (req.resourceType() === "fetch" || req.resourceType() === "xhr")
      ) {
        postRequests.push(req);
      }
    });

    await stubApiWithMessages(page, (route) => {
      const method = route.request().method();
      if (method === "POST") {
        const payload = route.request().postDataJSON() ?? {};
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "srv-1",
            recipient: payload.recipient ?? "",
            body: payload.body ?? "",
            timing: payload.timing ?? "posthumous",
          }),
        });
      }
      if (method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            message: {
              id: "srv-1",
              recipient: "妻へ",
              body: "本文",
              timing: "posthumous",
            },
          }),
        });
      }
      return route.fallback();
    });

    await page.goto("/messages/new");
    const bodyField = page.getByLabel("本文");
    await bodyField.pressSequentially("いつも", { delay: 60 });
    await bodyField.pressSequentially("ありがとう", { delay: 60 });
    await bodyField.pressSequentially("。", { delay: 60 });

    await page.waitForURL(/\/messages\/srv-1$/, { timeout: 3000 });
    expect(postRequests).toHaveLength(1);
    const payload = postRequests[0].postDataJSON();
    expect(payload.body).toBe("いつもありがとう。");
    expect(payload.timing).toBe("posthumous");
  });
});

test.describe("/messages/[id] 編集", () => {
  const initialMessage = {
    id: "m1",
    recipient: "妻へ",
    body: "初期本文",
    timing: "posthumous" as const,
  };

  test("本文編集で PATCH が飛ぶ", async ({ page, context }) => {
    await setSessionCookie(context);

    const patchRequests: Request[] = [];
    page.on("request", (req) => {
      if (
        MESSAGES_URL_RE.test(req.url()) &&
        req.method() === "PATCH" &&
        (req.resourceType() === "fetch" || req.resourceType() === "xhr")
      ) {
        patchRequests.push(req);
      }
    });

    await stubApiWithMessages(page, (route) => {
      const method = route.request().method();
      if (method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ message: initialMessage }),
        });
      }
      if (method === "PATCH") {
        const payload = route.request().postDataJSON() ?? {};
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ...initialMessage, ...payload }),
        });
      }
      return route.fallback();
    });

    await page.goto("/messages/m1");
    await expect(page.getByLabel("本文")).toHaveValue("初期本文");

    await page.getByLabel("本文").fill("更新後の本文");

    await expect
      .poll(() => patchRequests.length, { timeout: 3000 })
      .toBeGreaterThanOrEqual(1);
    const latest = patchRequests[patchRequests.length - 1].postDataJSON();
    expect(latest.body).toBe("更新後の本文");
  });

  test("timing を常時共有に切り替えると PATCH に timing が乗る", async ({
    page,
    context,
  }) => {
    await setSessionCookie(context);

    const patchRequests: Request[] = [];
    page.on("request", (req) => {
      if (
        MESSAGES_URL_RE.test(req.url()) &&
        req.method() === "PATCH" &&
        (req.resourceType() === "fetch" || req.resourceType() === "xhr")
      ) {
        patchRequests.push(req);
      }
    });

    await stubApiWithMessages(page, (route) => {
      const method = route.request().method();
      if (method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ message: initialMessage }),
        });
      }
      if (method === "PATCH") {
        const payload = route.request().postDataJSON() ?? {};
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ...initialMessage, ...payload }),
        });
      }
      return route.fallback();
    });

    await page.goto("/messages/m1");
    await page.getByRole("radio", { name: /常時共有/ }).click();

    await expect
      .poll(() => patchRequests.length, { timeout: 3000 })
      .toBeGreaterThanOrEqual(1);
    const latest = patchRequests[patchRequests.length - 1].postDataJSON();
    expect(latest.timing).toBe("always");
  });

  test("削除は ConfirmDialog を経由し、DELETE 成功で /messages に戻る", async ({
    page,
    context,
  }) => {
    await setSessionCookie(context);

    let deleted = 0;
    await stubApiWithMessages(page, (route) => {
      const method = route.request().method();
      const url = route.request().url();
      if (method === "GET" && url.endsWith("/messages/m1")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ message: initialMessage }),
        });
      }
      if (method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ messages: [] }),
        });
      }
      if (method === "DELETE") {
        deleted += 1;
        return route.fulfill({ status: 204 });
      }
      return route.fallback();
    });

    await page.goto("/messages/m1");
    await page.getByRole("button", { name: "この手紙を削除する" }).click();
    await expect(
      page.getByRole("heading", { name: "この手紙を削除しますか？" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "削除する" }).click();

    await page.waitForURL(/\/messages$/, { timeout: 3000 });
    expect(deleted).toBe(1);
  });
});
