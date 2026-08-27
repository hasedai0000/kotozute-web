import { expect, test } from "@playwright/test";

// globals.css の @media (prefers-reduced-motion: reduce) で
// * / *::before / *::after の animation-duration・transition-duration が
// 0.01ms に丸められることを回帰検知する。
//
// 対象要素は shadcn Button（transition-all を付与）の実装が LP のヒーロー CTA に
// 出るためそこを検査する。将来的に対象クラスが変わってもこのテストで気づける。
test.describe("a11y: prefers-reduced-motion の抑制が効く", () => {
  test("LP のヒーロー CTA ボタンでアニメ/トランジションが 0.01ms 以下になる", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    // ヒーロー CTA（未ログイン時: 「無料で始める」）
    const cta = page.getByRole("link", { name: /^無料で始める$/ }).first();
    await expect(cta).toBeVisible();

    const durations = await cta.evaluate((el) => {
      const s = window.getComputedStyle(el);
      const toMs = (v: string) =>
        v
          .split(",")
          .map((raw) => raw.trim())
          .map((raw) => {
            if (raw.endsWith("ms")) return parseFloat(raw);
            if (raw.endsWith("s")) return parseFloat(raw) * 1000;
            return Number.NaN;
          });
      return {
        transition: toMs(s.transitionDuration),
        animation: toMs(s.animationDuration),
      };
    });

    for (const ms of durations.transition) {
      expect(ms).toBeLessThanOrEqual(0.02);
    }
    for (const ms of durations.animation) {
      expect(ms).toBeLessThanOrEqual(0.02);
    }
  });
});
