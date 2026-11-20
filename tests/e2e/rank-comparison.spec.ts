import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { buildDatasetFromProductionSnapshot } from "../../src/data/productionSnapshot";
import { selectRelations, formatPercent, formatSample } from "../../src/domain/relationships";

for (const [width, height] of [[320, 568], [390, 844], [1366, 768]]) {
  test(`rank win rates stay distinct and readable at ${width}x${height}`, async ({ page, request }) => {
    const response = await request.get("/data/current-matchups.json");
    expect(response.ok()).toBe(true);
    const result = buildDatasetFromProductionSnapshot(await response.json());
    if (!result.ok) throw new Error(result.issues.join("\n"));
    const { relationships, scope } = result.data;
    const relationship = relationships.find((row) =>
      row.rankWinRates?.ancient && row.rankWinRates.divinePlus
      && row.rankWinRates.ancient.sampleSize >= 500 && row.rankWinRates.divinePlus.sampleSize >= 500
      && selectRelations(row.sourceHeroId, relationships, scope).outgoing.some((visible) => visible.id === row.id)
    );
    if (!relationship?.rankWinRates) throw new Error("A real, sufficiently sampled comparison is required.");
    await page.setViewportSize({ width, height });
    const params = new URLSearchParams({ hero: relationship.sourceHeroId, matchup: relationship.targetHeroId });
    await page.goto(`/?${params}`, { waitUntil: "networkidle" });
    const comparison = page.locator(".rank-comparison");
    await expect(comparison).toBeVisible();
    for (const key of ["ancient", "divinePlus"] as const) {
      const sample = relationship.rankWinRates[key]!;
      const column = comparison.locator(`[data-rank="${key}"]`);
      await expect(column.locator(".rank-winrate-value")).toHaveText(formatPercent(sample.sourceWinRate));
      await expect(column.locator(".rank-winrate-sample")).toHaveText(`${formatSample(sample.sampleSize)} matches`);
    }
    const boxes = await comparison.locator(".rank-winrate-value").evaluateAll((elements) => elements.map((el) => {
      const rect = el.getBoundingClientRect();
      return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom };
    }));
    expect(boxes).toHaveLength(2);
    expect(Math.abs(boxes[0].y - boxes[1].y)).toBeLessThan(1);
    expect(boxes[0].right).toBeLessThan(boxes[1].x);
    for (const box of boxes) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(width);
      expect(box.bottom).toBeLessThanOrEqual(height);
    }
    mkdirSync("artifacts/screenshots", { recursive: true });
    await page.screenshot({ path: `artifacts/screenshots/rank-comparison-${width}.png`, fullPage: true });
  });
}
