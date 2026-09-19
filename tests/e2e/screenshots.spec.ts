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
  await page.waitForTimeout(520);
  await page.screenshot({ path: `${output}/focus-viper.png`, fullPage: true });

  const firstRelationship = page.locator(".relation-row").first();
  await expect(firstRelationship).toBeVisible();
  await firstRelationship.click();
  await expect(page.locator(".matchup-card")).toBeVisible();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${output}/matchup-current-viper.png`, fullPage: true });
});


test("capture settled Spectre focus badge rendering", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/?hero=spectre", { waitUntil: "networkidle" });
  await expect(page.getByLabel("Spectre counter summary")).toBeVisible();
  await page.waitForTimeout(520);
  await page.screenshot({ path: `${output}/focus-spectre-settled.png`, fullPage: true });
});

test("capture dense Dragon Knight and Rubick focus geometry", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });

  for (const heroId of ["dragon-knight", "rubick"]) {
    await page.goto(`/?hero=${heroId}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(520);
    await page.screenshot({
      path: `${output}/focus-${heroId}-edge-labels.png`,
      fullPage: true
    });
  }
});

test("capture clean directional Focus regression cases", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });

  for (const heroId of ["crystal-maiden", "terrorblade", "dark-willow"]) {
    await page.goto(`/?hero=${heroId}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(520);
    await page.screenshot({
      path: `${output}/focus-${heroId}-directional.png`,
      fullPage: true
    });
  }
});

test("capture mobile Focus and Matchup states", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?hero=viper", { waitUntil: "networkidle" });

  await expect(page.getByLabel("Viper counter summary")).toBeVisible();
  await page.screenshot({ path: `${output}/mobile-focus-viper.png`, fullPage: true });

  const firstRelationship = page.locator(".relation-row").first();
  await expect(firstRelationship).toBeVisible();
  await firstRelationship.click();
  await expect(page.locator(".matchup-card")).toBeVisible();
  await page.screenshot({ path: `${output}/mobile-matchup-current-viper.png`, fullPage: true });
});
