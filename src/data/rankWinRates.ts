import type { RankWinRates, RankWinRateSample } from "../domain/types";

const isSample = (value: unknown): value is RankWinRateSample | null => {
  if (value === null) return true;
  if (typeof value !== "object" || value === null) return false;
  const sample = value as Record<string, unknown>;
  return typeof sample.sourceWinRate === "number" && Number.isFinite(sample.sourceWinRate)
    && sample.sourceWinRate >= 0 && sample.sourceWinRate <= 1
    && typeof sample.sampleSize === "number" && Number.isInteger(sample.sampleSize)
    && sample.sampleSize > 0;
};

export function isRankWinRates(
  value: unknown, totalSample: unknown, totalWinRate: unknown
): value is RankWinRates {
  if (typeof value !== "object" || value === null
    || typeof totalSample !== "number" || typeof totalWinRate !== "number") return false;
  const rates = value as Record<string, unknown>;
  if (!isSample(rates.ancient) || !isSample(rates.divinePlus)) return false;
  const samples = [rates.ancient, rates.divinePlus].filter((sample) => sample !== null);
  const count = samples.reduce((sum, sample) => sum + sample.sampleSize, 0);
  const wins = samples.reduce((sum, sample) => sum + sample.sampleSize * sample.sourceWinRate, 0);
  return count === totalSample && count > 0 && Math.abs(wins / count - totalWinRate) < 1e-9;
}
