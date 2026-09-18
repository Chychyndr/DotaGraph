import { describe, expect, it } from "vitest";
import { heroes } from "../data/heroes";
import { fixtureRelationships, scope } from "../data/fixtures";
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
