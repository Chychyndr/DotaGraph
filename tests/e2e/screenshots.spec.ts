import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

const output = "artifacts/screenshots";

test.beforeAll(() => {
  mkdirSync(output, { recursive: true });
});

test("capture Overview, Focus and Matchup states", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "DotaGraph" })).toBeVisible();
  await page.screenshot({ path: `${output}/overview.png`, fullPage: true });

  const search = page.getByRole("combobox", { name: "Search for a hero" });
  await search.fill("viper");
  await page.getByRole("option", { name: /Viper/ }).click();
  await expect(page.getByLabel("Viper counter summary")).toBeVisible();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${output}/focus-viper.png`, fullPage: true });

  await page.getByRole("button", { name: /Shadow Demon/ }).last().click();
  await expect(page.getByRole("complementary", { name: "Shadow Demon counters Viper" })).toBeVisible();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${output}/matchup-shadow-demon-viper.png`, fullPage: true });
});


test("capture mobile Focus and Matchup states", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?hero=viper", { waitUntil: "networkidle" });

  await expect(page.getByLabel("Viper counter summary")).toBeVisible();
  await page.screenshot({ path: `${output}/mobile-focus-viper.png`, fullPage: true });

  await page.getByRole("button", { name: "Shadow Demon counters Viper; Shadow Demon win rate 57.2%", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Shadow Demon counters Viper" })).toBeVisible();
  await page.screenshot({ path: `${output}/mobile-matchup-shadow-demon-viper.png`, fullPage: true });
});
