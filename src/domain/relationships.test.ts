import { describe, expect, it } from "vitest";
import heroCatalog from "../data/heroCatalog.json";
import { buildHeroes } from "../data/heroes";
import { fixtureRelationships, scope } from "../data/fixtures";

const heroes = buildHeroes({
  positions: Object.fromEntries(
    heroCatalog.map((hero, index) => [
      hero.slug,
      {
        x: 60 + (index % 16) * 65,
        y: 60 + Math.floor(index / 16) * 75
      }
    ])
  ),
  heroStats: Object.fromEntries(heroCatalog.map((hero) => [hero.slug, null]))
});
const heroById = new Map(heroes.map((hero) => [hero.id, hero]));
import { findRelationship, searchHeroes, selectRelations } from "./relationships";

describe("relationship semantics", () => {
  it("treats A -> B as A counters B and caps each direction at five", () => {
    const selected = selectRelations("viper", fixtureRelationships, scope);

    expect(selected.incoming).toHaveLength(5);
    expect(selected.outgoing).toHaveLength(5);
    expect(selected.incoming.every((r) => r.targetHeroId === "viper")).toBe(true);
    expect(selected.outgoing.every((r) => r.sourceHeroId === "viper")).toBe(true);
  });

  it("excludes low-sample relationships", () => {
    const selected = selectRelations("viper", fixtureRelationships, scope);
    expect(selected.incoming.some((r) => r.sourceHeroId === "axe")).toBe(false);
  });

  it("sorts reliable relationships by ranking score rather than raw win rate", () => {
    const ranked = [
      {
        id: "a--viper",
        sourceHeroId: "axe",
        targetHeroId: "viper",
        sourceWinRate: 0.61,
        sampleSize: 1200,
        patch: scope.patch,
        rankScope: scope.rankScope,
        sourceKind: "generated" as const,
        rankingScore: 0.01,
        baselineAdjustedDelta: 0.04
      },
      {
        id: "b--viper",
        sourceHeroId: "bristleback",
        targetHeroId: "viper",
        sourceWinRate: 0.56,
        sampleSize: 1200,
        patch: scope.patch,
        rankScope: scope.rankScope,
        sourceKind: "generated" as const,
        rankingScore: 0.05,
        baselineAdjustedDelta: 0.07
      }
    ];

    const selected = selectRelations("viper", ranked, scope);
    expect(selected.incoming.map((relationship) => relationship.sourceHeroId)).toEqual([
      "bristleback",
      "axe"
    ]);
  });

  it("finds the active directed relationship for a selected neighbor", () => {
    const relationship = findRelationship("viper", "shadow-demon", fixtureRelationships, scope);
    expect(relationship?.sourceHeroId).toBe("shadow-demon");
    expect(relationship?.targetHeroId).toBe("viper");
    expect(relationship?.sourceWinRate).toBeCloseTo(0.572);
  });
});

describe("hero search", () => {
  it("resolves common aliases from hero metadata", () => {
    expect(searchHeroes(heroes, "pa")[0]?.id).toBe("phantom-assassin");
    expect(searchHeroes(heroes, "wr")[0]?.id).toBe("windranger");
  });
});


describe("hero roster", () => {
  it("contains the complete current 127-hero roster with stable unique identity", () => {
    expect(heroes).toHaveLength(127);
    expect(new Set(heroes.map((hero) => hero.id)).size).toBe(127);
    expect(new Set(heroes.map((hero) => hero.slug)).size).toBe(127);
    expect(heroes.some((hero) => hero.name === "Largo")).toBe(true);
    expect(heroes.some((hero) => hero.name === "Kez")).toBe(true);
    expect(heroes.some((hero) => hero.name === "Ringmaster")).toBe(true);
  });

  it("keeps the deterministic overview layout inside the graph with useful spacing", () => {
    for (const hero of heroes) {
      expect(hero.x).toBeGreaterThanOrEqual(48);
      expect(hero.x).toBeLessThanOrEqual(1152);
      expect(hero.y).toBeGreaterThanOrEqual(48);
      expect(hero.y).toBeLessThanOrEqual(712);
    }

    let closest = Infinity;
    for (let i = 0; i < heroes.length; i += 1) {
      for (let j = i + 1; j < heroes.length; j += 1) {
        closest = Math.min(
          closest,
          Math.hypot(heroes[i].x - heroes[j].x, heroes[i].y - heroes[j].y)
        );
      }
    }

    expect(closest).toBeGreaterThanOrEqual(40);
  });

  it("does not invent overall statistics for heroes without fixture observations", () => {
    expect(heroById.get("largo")?.overallWinRate).toBeUndefined();
    expect(heroById.get("largo")?.sampleSize).toBeUndefined();
  });
});
