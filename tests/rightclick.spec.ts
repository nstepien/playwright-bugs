import { expect, test } from "@playwright/test";

test("right click", async ({ page }) => {
  await page.goto(import.meta.resolve("./rightclick.html"));

  const button = page.getByRole("button");
  const count = page.getByRole("paragraph");

  await expect(count).toHaveText("Count: 0");

  await button.click();
  await expect(count).toHaveText("Count: 1");

  await button.click();
  await expect(count).toHaveText("Count: 2");

  await button.click({ button: "right" });
  await expect(count).toHaveText("Count: 2");

  await button.click();
  // this fails in webkit
  await expect(count).toHaveText("Count: 3");
});
