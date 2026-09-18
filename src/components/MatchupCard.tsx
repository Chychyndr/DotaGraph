import type { Hero, MatchupRelationship, ScopeConfig } from "../domain/types";
import { formatPercent, formatSample } from "../domain/relationships";

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
          <img src={source.portrait} alt="" />
          <strong>{source.name}</strong>
        </span>
        <span className="matchup-arrow" aria-hidden="true">→</span>
        <span className="matchup-hero">
          <img src={target.portrait} alt="" />
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
      </dl>

      <div className="card-section">
        <div className="section-heading"><span>Why?</span></div>
        <p className="matchup-copy">{relationship.explanation}</p>
      </div>

      <div className="fixture-warning">Fixture relationship for UX testing. No production source is attached yet.</div>
    </aside>
  );
}
