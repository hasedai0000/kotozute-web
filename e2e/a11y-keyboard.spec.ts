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

const stubApi = async (
  page: Page,
  invitationsRef: { list: Invitation[] },
) => {
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

// Tab を押しながら、目的の要素がフォーカスされるまで進む。
// マウスクリックを一切使わずに到達できることの検証を目的とする。
const tabUntilFocused = async (page: Page, locator: import("@playwright/test").Locator, maxSteps = 30) => {
  for (let i = 0; i < maxSteps; i += 1) {
    if (await locator.evaluate((el) => el === document.activeElement)) {
      return;
    }
    await page.keyboard.press("Tab");
  }
  throw new Error(
    `Element did not receive keyboard focus within ${maxSteps} Tab presses`,
  );
};

test.describe("a11y: keyboard-only 家族招待フロー (DoD)", () => {
  test("Tab / Enter だけで /dashboard → /family → 招待送信まで完走できる", async ({
    page,
    context,
  }) => {
    await setSessionCookie(context);
    const invitations = { list: [] as Invitation[] };
    await stubApi(page, invitations);

    await page.goto("/dashboard");
    // ユーザーメニューが出るまで待つ（Header の Client 描画完了サイン）
    await expect(
      page.getByRole("button", { name: /ユーザーメニュー/ }),
    ).toBeVisible();

    // ヘッダーの「家族」リンクにキーボードで到達し、Enter で遷移する
    const familyNavLink = page
      .getByRole("navigation", { name: /主要ナビゲーション/ })
      .getByRole("link", { name: /^家族$/ });
    await expect(familyNavLink).toBeVisible();
    await tabUntilFocused(page, familyNavLink);
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/family$/);

    // 「家族を招待」ボタンにキーボードで到達し、Enter でダイアログを開く
    const inviteButton = page.getByRole("button", { name: /^家族を招待$/ });
    await expect(inviteButton).toBeVisible();
    await tabUntilFocused(page, inviteButton);
    await page.keyboard.press("Enter");

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // ダイアログ内のメール入力にキーボード操作で到達
    const emailInput = dialog.getByLabel("メールアドレス");
    await tabUntilFocused(page, emailInput);
    // typing は「入力デバイス＝キーボード」の範疇。マウス操作は使っていない。
    await page.keyboard.type("kb-invite@example.com");

    // フォーカスは次に「キャンセル」→「送信」の順に進む
    const submit = dialog.getByRole("button", { name: /^送信$/ });
    await tabUntilFocused(page, submit);
    await page.keyboard.press("Enter");

    // 招待中カードに新規メールが反映されるまで待つ
    await expect(page.getByText("kb-invite@example.com")).toBeVisible();
  });
});
