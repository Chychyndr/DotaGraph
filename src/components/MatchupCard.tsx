import type { Hero, MatchupRelationship, ScopeConfig } from "../domain/types";
import { formatPercent, formatSample } from "../domain/relationships";
import { HeroPortrait } from "./HeroPortrait";

interface MatchupCardProps {
  source: Hero;
  target: Hero;
  relationship: MatchupRelationship;
  scope: ScopeConfig;
  onBack: () => void;
}

export function MatchupCard({ source, target, relationship, scope, onBack }: MatchupCardProps) {
  return (
    <aside className="context-card matchup-card" aria-label={`${source.name} counters ${target.name}`}>
      <button className="card-back" type="button" onClick={onBack}>← Hero overview</button>

      <div className="matchup-title">
        <span className="matchup-hero">
          <HeroPortrait hero={source} />
          <strong>{source.name}</strong>
        </span>
        <span className="matchup-arrow" aria-hidden="true">→</span>
        <span className="matchup-hero">
          <HeroPortrait hero={target} />
          <strong>{target.name}</strong>
        </span>
      </div>

      <div className="matchup-stat">
        <strong>{formatPercent(relationship.sourceWinRate)}</strong>
        <span>{source.name} win rate</span>
      </div>

      <dl className="matchup-meta">
        <div><dt>Matches</dt><dd>{formatSample(relationship.sampleSize)}</dd></div>
        <div><dt>Scope</dt><dd>{scope.rankLabel}</dd></div>
        <div><dt>Patch</dt><dd>{scope.patch}</dd></div>
        {relationship.provenanceSource && (
          <div><dt>Source</dt><dd>{relationship.provenanceSource}</dd></div>
        )}
        {typeof relationship.baselineAdjustedDelta === "number" && (
          <div>
            <dt>Matchup advantage</dt>
            <dd>{relationship.baselineAdjustedDelta >= 0 ? "+" : ""}{(relationship.baselineAdjustedDelta * 100).toFixed(1)} pp</dd>
          </div>
        )}
      </dl>

      {relationship.explanation && (
        <div className="card-section">
          <div className="section-heading"><span>Why?</span></div>
          <p className="matchup-copy">{relationship.explanation}</p>
        </div>
      )}
    </aside>
  );
}
