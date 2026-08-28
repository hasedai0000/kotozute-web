import {
  expect,
  test,
  type BrowserContext,
  type Page,
  type Route,
} from "@playwright/test";

// W4-08 (#38) — 記入 → 家族招待 → 家族閲覧の縦串 E2E。
// バックエンド未実装のため、既存 spec と同じ `page.route` スタブ流儀で API を模す。
// 2 つの BrowserContext（owner / family）で共有可変ステート (entries / invitations) を持ち回す。

const USER_URL_RE = /\/(api\/)?user(\?|$)/;
const SUMMARY_URL_RE = /\/(api\/)?note-summary(\?|$)/;
const FAMILY_MEMBERS_URL_RE = /\/(api\/)?family\/members(\?|$)/;
const FAMILY_INVITATIONS_URL_RE =
  /\/(api\/)?family\/invitations(\/[^/?]+)?(\?|$)/;
const FIELDS_URL_RE = /\/(api\/)?note-fields\/[a-z_]+(\?|$)/;
const ENTRIES_URL_RE = /\/(api\/)?note-entries\/[a-z_]+(\/[^/?]+)?(\?|$)/;

type Entry = {
  id: string;
  category: string;
  values: Record<string, string>;
  timing: "always" | "posthumous";
};

type Invitation = {
  id: string;
  email: string;
  expiresAt: string;
  status: "pending" | "expired";
  token: string;
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

type SharedState = {
  entries: Entry[];
  invitations: Invitation[];
};

// owner セッションの API スタブ。entries / invitations は shared state を参照して書き換える。
const stubOwnerApi = async (page: Page, state: SharedState) => {
  await page.route(USER_URL_RE, (route: Route) => {
    if (route.request().method() !== "GET") return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: 1,
        name: "Taro",
        email: "taro@example.com",
        role: "owner",
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
    // token はサーバ→クライアントに漏らさない（メール経由で family に届く想定）。
    // レスポンスに含めないため、明示的に必要フィールドだけを取り出す。
    const strip = (inv: Invitation) => ({
      id: inv.id,
      email: inv.email,
      expiresAt: inv.expiresAt,
      status: inv.status,
    });

    if (method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(state.invitations.map(strip)),
      });
    }
    if (method === "POST") {
      const payload = (req.postDataJSON() ?? {}) as { email?: string };
      const idx = state.invitations.length + 1;
      const created: Invitation = {
        id: `srv-${idx}`,
        email: payload.email ?? "",
        expiresAt: "2030-01-01T00:00:00Z",
        status: "pending",
        token: `tok-${idx}`,
      };
      state.invitations.push(created);
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(strip(created)),
      });
    }
    return route.fallback();
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
    const req = route.request();
    const method = req.method();
    if (method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ entries: state.entries }),
      });
    }
    if (method === "POST") {
      const payload = (req.postDataJSON() ?? {}) as {
        category?: string;
        values?: Record<string, string>;
        timing?: "always" | "posthumous";
      };
      const created: Entry = {
        id: `e-${state.entries.length + 1}`,
        category: payload.category ?? "bank_account",
        values: payload.values ?? {},
        timing: payload.timing ?? "always",
      };
      state.entries.push(created);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(created),
      });
    }
    return route.fallback();
  });
};

// family セッションの API スタブ。
// - `/user`: role: family を返す（受諾前後で切り替える必要は無い。role の切替は accept 側で
//   invalidate されて再取得されるが、テスト用途では終始 family でよい）。
// - `/note-entries/money`: CLAUDE.md #8 のとおり `posthumous` は「API が返さない」ので、
//   常に always だけを返す。クライアント側で隠す実装は禁止なので、スタブでもフィルタする。
const stubFamilyApi = async (page: Page, state: SharedState) => {
  await page.route(USER_URL_RE, (route: Route) => {
    if (route.request().method() !== "GET") return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: 2,
        name: "Hanako",
        email: "hanako@example.com",
        role: "family",
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
          name: "山田太郎",
          email: "taro@example.com",
          role: "owner",
          joinedAt: "2026-01-15T00:00:00Z",
        },
        {
          id: 2,
          name: "Hanako",
          email: "hanako@example.com",
          role: "family",
          joinedAt: "2026-08-28T00:00:00Z",
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
    // API 側で posthumous はフィルタして返さない前提を再現する。
    const alwaysOnly = state.entries.filter((e) => e.timing === "always");
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ entries: alwaysOnly }),
    });
  });

};

test.describe("E2E: 記入 → 家族招待 → 家族閲覧 (#38)", () => {
  test("owner が entry を追加し、family が招待受諾後に always のみ閲覧できる (DoD)", async ({
    browser,
  }) => {
    const state: SharedState = { entries: [], invitations: [] };

    // ---- Owner セッション ----
    const ownerContext = await browser.newContext();
    await setSessionCookie(ownerContext);
    const owner = await ownerContext.newPage();
    await stubOwnerApi(owner, state);

    // 1) always の entry を追加
    await owner.goto("/notebook/money");
    await owner.getByRole("button", { name: /銀行口座 を追加/ }).click();
    await owner.getByLabel(/銀行名/).fill("公開銀行");
    await owner.getByRole("button", { name: "保存" }).click();
    await expect(
      owner.getByRole("listitem").filter({ hasText: "公開銀行" }),
    ).toBeVisible();

    // 2) posthumous の entry も追加（家族には見えない担保用）
    await owner.getByRole("button", { name: /銀行口座 を追加/ }).click();
    await owner.getByLabel(/銀行名/).fill("秘密銀行");
    await owner.getByRole("radio", { name: /死後開示/ }).click();
    await owner.getByRole("button", { name: "保存" }).click();
    await expect(
      owner.getByRole("listitem").filter({ hasText: "秘密銀行" }),
    ).toBeVisible();

    // 3) /family で招待発行
    await owner.goto("/family");
    await owner.getByRole("button", { name: /家族を招待/ }).click();
    await owner.getByLabel("メールアドレス").fill("hanako@example.com");
    await owner.getByRole("button", { name: /^送信$/ }).click();
    await expect(owner.getByText("hanako@example.com")).toBeVisible();

    // shared state に招待が積まれたことを確認（家族側は受諾済み前提でセッションを開始する）
    const pending = state.invitations.find(
      (inv) => inv.email === "hanako@example.com",
    );
    expect(pending).toBeTruthy();

    // ---- Family セッション（別コンテキスト = 別アカウント） ----
    // NOTE: /invitations/[token] は Server Component で verifyInvitation を SSR 実行するため、
    // `page.route`（ブラウザ側インターセプト）ではスタブできない。招待受諾 UI 単体の挙動は
    // `AcceptInvitationForm.test.tsx` などで unit-test 済みなので、E2E ではその先の
    // 「受諾後 family が always だけを閲覧できる」を主要 DoD として担保する。
    const familyContext = await browser.newContext();
    await setSessionCookie(familyContext);
    const family = await familyContext.newPage();
    await stubFamilyApi(family, state);

    // 4) family として /notebook/money を閲覧（受諾後の状態を再現）
    await family.goto("/notebook/money");

    // 5a) always の「公開銀行」は見える
    await expect(
      family.getByRole("listitem").filter({ hasText: "公開銀行" }),
    ).toBeVisible();

    // 5b) posthumous の「秘密銀行」は API が返さないので描画されない
    await expect(
      family.getByRole("listitem").filter({ hasText: "秘密銀行" }),
    ).toHaveCount(0);
    await expect(family.getByLabel("死後開示")).toHaveCount(0);

    // 5c) 編集 UI（追加ボタン）が存在しない（家族ロールは閲覧のみ）
    await expect(
      family.getByRole("button", { name: /銀行口座 を追加/ }),
    ).toHaveCount(0);

    await ownerContext.close();
    await familyContext.close();
  });
});
