import { describe, expect, it } from "vitest";
import { isRankWinRates } from "./rankWinRates";

const rates = {
  ancient: { sourceWinRate: 0.6, sampleSize: 600 },
  divinePlus: { sourceWinRate: 0.7, sampleSize: 400 }
};

describe("rank win-rate validation", () => {
  it("requires disjoint populations to reconstruct the headline rate and count", () => {
    expect(isRankWinRates(rates, 1000, 0.64)).toBe(true);
    expect(isRankWinRates(rates, 1100, 0.64)).toBe(false);
    expect(isRankWinRates(rates, 1000, 0.36)).toBe(false);
    expect(isRankWinRates({ ...rates, divinePlus: { ...rates.divinePlus, sampleSize: 600 } }, 1000, 0.64)).toBe(false);
  });

  it("keeps missing population distinct from a zero win rate", () => {
    expect(isRankWinRates({ ancient: null, divinePlus: rates.divinePlus }, 400, 0.7)).toBe(true);
    expect(isRankWinRates({ ancient: { sourceWinRate: 0, sampleSize: 0 }, divinePlus: rates.divinePlus }, 400, 0.7)).toBe(false);
    expect(isRankWinRates({ ancient: rates.ancient }, 600, 0.6)).toBe(false);
    expect(isRankWinRates({ ...rates, ancient: { sourceWinRate: NaN, sampleSize: 600 } }, 1000, 0.64)).toBe(false);
  });
});
