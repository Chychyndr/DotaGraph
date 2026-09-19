import type { Hero, MatchupRelationship } from "../domain/types";
import { formatPercent } from "../domain/relationships";
import { HeroPortrait } from "./HeroPortrait";

interface HeroCardProps {
  hero: Hero;
  incoming: MatchupRelationship[];
  outgoing: MatchupRelationship[];
  onMatchup: (neighborHeroId: string) => void;
  heroesById: ReadonlyMap<string, Hero>;
}

function RelationRows({
  relationships,
  selectedHeroId,
  onMatchup,
  heroesById
}: {
  relationships: MatchupRelationship[];
  selectedHeroId: string;
  onMatchup: (neighborHeroId: string) => void;
  heroesById: ReadonlyMap<string, Hero>;
}) {
  if (!relationships.length) {
    return <p className="card-empty">No reliable relationships.</p>;
  }

  return (
    <div className="relation-list">
      {relationships.map((relationship) => {
        const neighborId = relationship.sourceHeroId === selectedHeroId
          ? relationship.targetHeroId
          : relationship.sourceHeroId;
        const neighbor = heroesById.get(neighborId);
        const source = heroesById.get(relationship.sourceHeroId);
        const target = heroesById.get(relationship.targetHeroId);
        if (!neighbor || !source || !target) return null;

        return (
          <button
            key={relationship.id}
            className="relation-row"
            type="button"
            aria-label={`${source.name} counters ${target.name}; ${source.name} win rate ${formatPercent(relationship.sourceWinRate)}`}
            onClick={() => onMatchup(neighborId)}
          >
            <span className="relation-hero">
              <HeroPortrait hero={neighbor} />
              <span>{neighbor.name}</span>
            </span>
            <strong>{formatPercent(relationship.sourceWinRate)}</strong>
          </button>
        );
      })}
    </div>
  );
}

export function HeroCard({ hero, incoming, outgoing, onMatchup, heroesById }: HeroCardProps) {
  return (
    <aside className="context-card" aria-label={`${hero.name} counter summary`}>
      <div className="card-hero">
        <HeroPortrait hero={hero} />
        <h2>{hero.name}</h2>
        {typeof hero.overallWinRate === "number" && (
          <strong className="overall-rate">{formatPercent(hero.overallWinRate)}</strong>
        )}
      </div>

      <div className="card-section">
        <div className="section-heading incoming-text">
          <span>Countered by</span>
        </div>
        <RelationRows
          relationships={incoming}
          selectedHeroId={hero.id}
          onMatchup={onMatchup}
          heroesById={heroesById}
        />
      </div>

      <div className="card-section">
        <div className="section-heading outgoing-text">
          <span>Counters</span>
        </div>
        <RelationRows
          relationships={outgoing}
          selectedHeroId={hero.id}
          onMatchup={onMatchup}
          heroesById={heroesById}
        />
      </div>
    </aside>
  );
}
