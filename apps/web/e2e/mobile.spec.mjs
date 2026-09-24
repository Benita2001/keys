import { test, expect, devices } from "@playwright/test";

test.use({ ...devices["iPhone 13"] });

const routes = [
  "/start",
  "/home",
  "/learn",
  "/explore",
  "/portfolio",
  "/profile",
  "/parent",
  "/parent/limits",
];

for (const route of routes) {
  test(`WebKit iPhone renders ${route} without horizontal overflow`, async ({ page }) => {
    await page.goto(route, { waitUntil: "networkidle" });
    await expect(page.locator("body")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflow).toBe(false);
  });
}

test("Practice/Money switch supports arrow keys in WebKit", async ({ page }) => {
  await page.goto("/home", { waitUntil: "networkidle" });
  const practice = page.getByRole("radio", { name: "Practice" });
  const money = page.getByRole("radio", { name: "Money" });

  await practice.focus();
  await page.keyboard.press("ArrowRight");
  await expect(money).toHaveAttribute("aria-checked", "true");

  await page.keyboard.press("ArrowLeft");
  await expect(practice).toHaveAttribute("aria-checked", "true");
});
