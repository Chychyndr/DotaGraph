import { expect, test } from "@playwright/test";
import { buildDatasetFromProductionSnapshot } from "../../src/data/productionSnapshot";
import { selectRelations } from "../../src/domain/relationships";

test("published current matchup bundle satisfies production invariants", async ({ request }) => {
  const response = await request.get("/data/current-matchups.json");
  expect(response.ok()).toBe(true);

  const data = await response.json();

  expect(data.schemaVersion).toBe(2);
  expect(data.kind).toBe("current-production-matchups");
  expect(data.patch).toBe("7.41f");
  expect(Number.isNaN(Date.parse(data.generatedAt))).toBe(false);

  expect(data.scope.rankScope).toBe("ancient_plus");
  expect(data.scope.rankLabel).toBe("Ancient+");
  expect(data.scope.minimumSample).toBe(500);
  expect(data.scope.maxVisiblePerDirection).toBe(5);
  expect(data.scope.observationWindowStart).toBe("2026-09-16T00:00:00Z");
  expect(Date.parse(data.scope.observationWindowEndExclusive)).toBeLessThanOrEqual(
    Date.parse(data.generatedAt)
  );

  expect(data.provenance.headlineSource).toBe("OpenDota");
  expect(data.coverage.catalogHeroCount).toBe(127);
  expect(data.coverage.mappedHeroCount).toBe(127);
  expect(Object.keys(data.positions)).toHaveLength(127);
  expect(Object.keys(data.heroStats)).toHaveLength(127);

  expect(data.relationships.length).toBeGreaterThan(0);
  expect(data.relationships.length).toBe(data.coverage.rankedRelationshipCount);

  const ids = new Set<string>();
  for (const relationship of data.relationships) {
    expect(relationship.sourceSlug).not.toBe(relationship.targetSlug);
    expect(relationship.sourceWinRate).toBeGreaterThanOrEqual(0);
    expect(relationship.sourceWinRate).toBeLessThanOrEqual(1);
    expect(relationship.sampleSize).toBeGreaterThanOrEqual(500);
    expect(relationship.baselineAdjustedDelta).toBeGreaterThan(0);
    expect(relationship.standardError).toBeGreaterThanOrEqual(0);
    expect(relationship.rankingScore).toBeGreaterThan(0);
    expect(relationship.source).toBe("OpenDota");

    const id = `${relationship.sourceSlug}--${relationship.targetSlug}`;
    expect(ids.has(id), id).toBe(false);
    ids.add(id);
  }
});

test("published STRATZ evidence is shown in matchup details", async ({ request, page }) => {
  const response = await request.get("/data/current-matchups.json");
  expect(response.ok()).toBe(true);
  const conversion = buildDatasetFromProductionSnapshot(await response.json());
  if (!conversion.ok) throw new Error(conversion.issues.join("\n"));
  const { evidenceObservations, relationships, scope } = conversion.data;
  const observations = (evidenceObservations ?? []).filter((item) => item.provider === "STRATZ");
  test.skip(observations.length === 0, "The committed snapshot predates STRATZ evidence.");

  const observation = observations.find((item) =>
    selectRelations(item.sourceHeroId, relationships, scope).outgoing.some(
      (row) => row.targetHeroId === item.targetHeroId
    )
  );
  if (!observation) throw new Error("STRATZ evidence should overlap a visible matchup");
  expect(observation.sampleSize).toBeGreaterThan(0);
  expect(observation.scope.patch).toBe(scope.patch);
  expect(observation.scope.rankScope).toBe("immortal");

  const params = new URLSearchParams({
    hero: observation.sourceHeroId,
    matchup: observation.targetHeroId
  });
  await page.goto(`/?${params}`);
  const matchup = page.locator(".matchup-card");
  await expect(matchup).toBeVisible();
  await matchup.getByText("Immortal / pro evidence", { exact: true }).click();
  const evidence = page.locator(".population-evidence-item").filter({
    has: page.getByRole("link", { name: "STRATZ", exact: true })
  });
  await expect(evidence.getByText("Accumulated sample for this patch.", { exact: false })).toBeVisible();
  await expect(evidence.getByRole("link", { name: "STRATZ" })).toHaveAttribute("href", "https://stratz.com/api");
});
