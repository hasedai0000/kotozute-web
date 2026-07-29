import { expect, test } from "@playwright/test";

test("LP のタイトルが表示される", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/ことづて/);
});
