import type { RankWinRates } from "../domain/types";
import { formatPercent, formatSample } from "../domain/relationships";

interface Props {
  sourceName: string;
  rates?: RankWinRates;
  minimumSample: number;
}

export function RankWinRateComparison({ sourceName, rates, minimumSample }: Props) {
  const groups = [
    { key: "ancient", label: "Ancient", description: "Below Divine" },
    { key: "divinePlus", label: "Divine+", description: "Includes Immortal" }
  ] as const;
  const ancient = rates?.ancient;
  const divinePlus = rates?.divinePlus;
  const difference = ancient && divinePlus
    && ancient.sampleSize >= minimumSample && divinePlus.sampleSize >= minimumSample
    ? (divinePlus.sourceWinRate - ancient.sourceWinRate) * 100 : undefined;

  return (
    <section className="rank-comparison" aria-label={`${sourceName} win rate by rank`}>
      <p className="rank-comparison-caption">{sourceName} win rate</p>
      <dl className="rank-winrates">
        {groups.map(({ key, label, description }) => {
          const sample = rates?.[key];
          const limited = sample && sample.sampleSize < minimumSample;
          return (
            <div className="rank-winrate" key={key} data-rank={key}>
              <dt>
                <span className="rank-winrate-label">{label}</span>
                <span className="rank-winrate-description">{description}</span>
              </dt>
              <dd>
                <strong className="rank-winrate-value">
                  {sample ? formatPercent(sample.sourceWinRate) : <span aria-label="Not available">—</span>}
                </strong>
                <span className="rank-winrate-sample">
                  {sample ? `${formatSample(sample.sampleSize)} matches` : rates ? "No matches" : "No rank data"}
                </span>
                {limited && <span className="rank-winrate-limited">Small sample</span>}
              </dd>
            </div>
          );
        })}
      </dl>
      {difference !== undefined && (
        <p className="rank-comparison-difference">
          Divine+ difference <strong>{difference > 0 ? "+" : ""}{difference.toFixed(1)} pp</strong>
        </p>
      )}
    </section>
  );
}
