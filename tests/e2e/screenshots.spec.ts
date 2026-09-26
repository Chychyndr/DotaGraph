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


test("capture expanded matchup provenance details", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/?hero=viper", { waitUntil: "networkidle" });

  const firstRelationship = page.locator(".relation-row").first();
  await expect(firstRelationship).toBeVisible();
  await firstRelationship.click();

  const details = page.locator(".provenance-details");
  await expect(details).toBeVisible();
  await details.getByText("Source details", { exact: true }).click();
  await expect(details).toHaveAttribute("open", "");

  await page.screenshot({
    path: `${output}/matchup-source-details.png`,
    fullPage: true
  });
});

test("capture expanded Immortal evidence details", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.route("**/data/current-matchups.json", async (route) => {
    const response = await route.fetch();
    const payload = (await response.json()) as {
      patch: string;
      generatedAt: string;
      scope: {
        observationWindowStart: string;
        observationWindowEndExclusive: string;
      };
      relationships: Array<{
        sourceSlug: string;
        targetSlug: string;
        sourceWinRate: number;
        sampleSize: number;
      }>;
      evidenceObservations?: unknown[];
    };

    payload.evidenceObservations = payload.relationships.map(
      (relationship, index) => ({
        id: `screenshot-immortal-${index}`,
        provider: "OpenDota",
        sourceSlug: relationship.sourceSlug,
        targetSlug: relationship.targetSlug,
        sourceWinRate: Math.min(1, relationship.sourceWinRate + 0.012),
        sampleSize: Math.max(1, Math.floor(relationship.sampleSize / 4)),
        scope: {
          patch: payload.patch,
          rankScope: "immortal",
          matchPopulation: "ranked_all_draft_5v5",
          observationWindowStart: payload.scope.observationWindowStart,
          observationWindowEndExclusive:
            payload.scope.observationWindowEndExclusive
        },
        provenance: {
          sourceUrl: "https://www.opendota.com/",
          queryScope: "public_matches:avg_rank_tier>=80:game_mode=22:lobby_type=7",
          collectedAt: payload.generatedAt
        }
      })
    );

    await route.fulfill({ response, json: payload });
  });

  await page.goto("/?hero=viper", { waitUntil: "networkidle" });
  const firstRelationship = page.locator(".relation-row").first();
  await expect(firstRelationship).toBeVisible();
  await firstRelationship.click();

  const details = page.locator(".population-evidence-details");
  await expect(details).toBeVisible();
  await details.getByText("Immortal / pro evidence", { exact: true }).click();
  await expect(details).toHaveAttribute("open", "");

  await page.screenshot({
    path: `${output}/matchup-immortal-evidence.png`,
    fullPage: true
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await details.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `${output}/mobile-matchup-immortal-evidence.png`,
    fullPage: true
  });
});

test("capture compact search results", async ({ page }) => {
  await page.setViewportSize({ width: 432, height: 490 });
  await page.goto("/", { waitUntil: "networkidle" });
  const search = page.getByRole("combobox", { name: "Search for a hero" });
  await search.fill("sh");
  await expect(page.getByRole("listbox", { name: "Hero search results" })).toBeVisible();
  await page.screenshot({ path: `${output}/search-shadow-results.png`, fullPage: true });
});

test("capture one-graph hover state", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.locator("#graph-hero-viper").hover();
  await page.waitForTimeout(180);
  await page.screenshot({ path: `${output}/hover-viper.png`, fullPage: true });
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

test("capture reported attached-badge regression cases", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });

  for (const heroId of ["ancient-apparition", "spirit-breaker", "chen"]) {
    await page.goto(`/?hero=${heroId}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(520);
    await page.screenshot({
      path: `${output}/focus-${heroId}-attached-badges.png`,
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

test("capture owner reference Focus cases on the stable global layout", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });

  for (const heroId of [
    "earthshaker",
    "enchantress",
    "ember-spirit",
    "crystal-maiden",
    "pudge"
  ]) {
    await page.goto(`/?hero=${heroId}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(520);
    await page.screenshot({
      path: `${output}/focus-${heroId}-organic-reference.png`,
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
