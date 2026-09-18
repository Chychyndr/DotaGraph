import type { Hero, MatchupRelationship, ScopeConfig } from "../domain/types";
import { formatPercent } from "../domain/relationships";
import { heroById } from "../data/heroes";

interface HeroCardProps {
  hero: Hero;
  incoming: MatchupRelationship[];
  outgoing: MatchupRelationship[];
  scope: ScopeConfig;
  onMatchup: (neighborHeroId: string) => void;
}

function RelationRows({
  relationships,
  selectedHeroId,
  onMatchup
}: {
  relationships: MatchupRelationship[];
  selectedHeroId: string;
  onMatchup: (neighborHeroId: string) => void;
}) {
  if (!relationships.length) {
    return <p className="card-empty">No reliable fixture relationships.</p>;
  }

  return (
    <div className="relation-list">
      {relationships.map((relationship) => {
        const neighborId = relationship.sourceHeroId === selectedHeroId
          ? relationship.targetHeroId
          : relationship.sourceHeroId;
        const neighbor = heroById.get(neighborId);
        if (!neighbor) return null;

        return (
          <button
            key={relationship.id}
            className="relation-row"
            type="button"
            onClick={() => onMatchup(neighborId)}
          >
            <span className="relation-hero">
              <img src={neighbor.portrait} alt="" />
              <span>{neighbor.name}</span>
            </span>
            <strong>{formatPercent(relationship.sourceWinRate)}</strong>
          </button>
        );
      })}
    </div>
  );
}

export function HeroCard({ hero, incoming, outgoing, scope, onMatchup }: HeroCardProps) {
  return (
    <aside className="context-card" aria-label={`${hero.name} counter summary`}>
      <div className="card-hero">
        <img src={hero.portrait} alt="" />
        <div>
          <h2>{hero.name}</h2>
          <p>{scope.rankLabel} · Patch {scope.patch}</p>
        </div>
        <strong className="overall-rate">{formatPercent(hero.overallWinRate)}</strong>
      </div>

      <div className="card-section">
        <div className="section-heading incoming-text">
          <span>Countered by</span>
          <small>{incoming.length}/5</small>
        </div>
        <RelationRows relationships={incoming} selectedHeroId={hero.id} onMatchup={onMatchup} />
      </div>

      <div className="card-section">
        <div className="section-heading outgoing-text">
          <span>Counters</span>
          <small>{outgoing.length}/5</small>
        </div>
        <RelationRows relationships={outgoing} selectedHeroId={hero.id} onMatchup={onMatchup} />
      </div>

      <div className="card-footnote">Development fixture data · {hero.sampleSize.toLocaleString()} hero sample</div>
    </aside>
  );
}
