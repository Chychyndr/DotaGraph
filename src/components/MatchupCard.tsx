import type {
  Hero,
  MatchupEvidenceObservation,
  MatchupRelationship,
  ScopeConfig
} from "../domain/types";
import type { DatasetMetadata } from "../data/dataset";
import { formatPercent, formatSample } from "../domain/relationships";
import { HeroPortrait } from "./HeroPortrait";

interface MatchupCardProps {
  source: Hero;
  target: Hero;
  relationship: MatchupRelationship;
  scope: ScopeConfig;
  metadata: DatasetMetadata;
  evidenceObservations: MatchupEvidenceObservation[];
  onBack: () => void;
}

const formatUtcTimestamp = (value: string) =>
  `${new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC"
  }).format(new Date(value))} UTC`;

const formatEvidenceScope = (rankScope: string) => {
  if (rankScope === "immortal") return "Immortal";
  if (rankScope === "pro") return "Professional";
  return rankScope.replaceAll("_", " ");
};

export function MatchupCard({
  source,
  target,
  relationship,
  scope,
  metadata,
  evidenceObservations,
  onBack
}: MatchupCardProps) {
  const provenance = metadata.provenance;
  const observationStart =
    relationship.observationWindowStart ?? metadata.observationWindowStart;
  const observationEnd =
    relationship.observationWindowEndExclusive ??
    metadata.observationWindowEndExclusive;
  const showProvenance =
    relationship.sourceKind === "generated" &&
    metadata.schemaVersion === 2 &&
    provenance;

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

      {showProvenance && (
        <details className="provenance-details">
          <summary>Source details</summary>
          <dl className="provenance-list">
            <div>
              <dt>Provider</dt>
              <dd>
                {provenance.sourceUrl ? (
                  <a href={provenance.sourceUrl} target="_blank" rel="noreferrer">
                    {relationship.provenanceSource ?? provenance.headlineSource}
                  </a>
                ) : (
                  relationship.provenanceSource ?? provenance.headlineSource
                )}
              </dd>
            </div>
            {provenance.queryMode && (
              <div>
                <dt>Dataset</dt>
                <dd>{provenance.queryMode.replaceAll("_", " ")}</dd>
              </div>
            )}
            {provenance.endpoint && (
              <div>
                <dt>Endpoint</dt>
                <dd><code>{provenance.endpoint}</code></dd>
              </div>
            )}
            {observationStart && observationEnd && (
              <div>
                <dt>Observed</dt>
                <dd>
                  <time dateTime={observationStart}>
                    {formatUtcTimestamp(observationStart)}
                  </time>
                  <span aria-hidden="true"> → </span>
                  <time dateTime={observationEnd}>
                    {formatUtcTimestamp(observationEnd)}
                  </time>
                </dd>
              </div>
            )}
            <div>
              <dt>Generated</dt>
              <dd>
                <time dateTime={metadata.generatedAt}>
                  {formatUtcTimestamp(metadata.generatedAt)}
                </time>
              </dd>
            </div>
          </dl>
        </details>
      )}

      {evidenceObservations.length > 0 && (
        <details className="population-evidence-details">
          <summary>Immortal / pro evidence</summary>
          <div className="population-evidence-list">
            {evidenceObservations.map((observation) => (
              <article className="population-evidence-item" key={observation.id}>
                <div className="population-evidence-heading">
                  <strong>{formatEvidenceScope(observation.scope.rankScope)}</strong>
                  <a
                    href={observation.provenance.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {observation.provider}
                  </a>
                </div>
                <div className="population-evidence-stat">
                  <strong>{formatPercent(observation.sourceWinRate)}</strong>
                  <span>{source.name} win rate</span>
                </div>
                <dl className="population-evidence-meta">
                  <div>
                    <dt>Matches</dt>
                    <dd>
                      {typeof observation.sampleSize === "number"
                        ? formatSample(observation.sampleSize)
                        : "Unknown"}
                    </dd>
                  </div>
                  <div>
                    <dt>Observed</dt>
                    <dd>
                      <time dateTime={observation.scope.observationWindowStart}>
                        {formatUtcTimestamp(observation.scope.observationWindowStart)}
                      </time>
                      <span aria-hidden="true"> → </span>
                      <time dateTime={observation.scope.observationWindowEndExclusive}>
                        {formatUtcTimestamp(
                          observation.scope.observationWindowEndExclusive
                        )}
                      </time>
                    </dd>
                  </div>
                </dl>
                <p className="population-evidence-note">
                  Separate population; excluded from the {scope.rankLabel} headline
                  and cross-source consensus.
                </p>
              </article>
            ))}
          </div>
        </details>
      )}

      {relationship.explanation && (
        <div className="card-section">
          <div className="section-heading"><span>Why?</span></div>
          <p className="matchup-copy">{relationship.explanation}</p>
        </div>
      )}
    </aside>
  );
}
