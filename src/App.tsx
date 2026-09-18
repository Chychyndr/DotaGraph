import { useEffect, useMemo, useState } from "react";
import { HeroCard } from "./components/HeroCard";
import { MatchupCard } from "./components/MatchupCard";
import { Search } from "./components/Search";
import { fixtureRelationships, scope } from "./data/fixtures";
import { heroById, heroes } from "./data/heroes";
import { findRelationship, selectRelations } from "./domain/relationships";
import { GraphView } from "./graph/GraphView";

function readInitialState() {
  const params = new URLSearchParams(window.location.search);
  const hero = params.get("hero");
  const matchup = params.get("matchup");
  return {
    hero: hero && heroById.has(hero) ? hero : null,
    matchup: matchup && heroById.has(matchup) ? matchup : null
  };
}

export default function App() {
  const initial = useMemo(readInitialState, []);
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(initial.hero);
  const [matchupHeroId, setMatchupHeroId] = useState<string | null>(initial.matchup);
  const [hoveredHeroId, setHoveredHeroId] = useState<string | null>(null);

  const selectedHero = selectedHeroId ? heroById.get(selectedHeroId) : undefined;
  const selectedRelations = useMemo(
    () => selectedHeroId
      ? selectRelations(selectedHeroId, fixtureRelationships, scope)
      : { incoming: [], outgoing: [] },
    [selectedHeroId]
  );

  const matchup = selectedHeroId && matchupHeroId
    ? findRelationship(selectedHeroId, matchupHeroId, fixtureRelationships, scope)
    : undefined;

  useEffect(() => {
    if (matchupHeroId && !matchup) setMatchupHeroId(null);
  }, [matchupHeroId, matchup]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedHeroId) params.set("hero", selectedHeroId);
    if (selectedHeroId && matchupHeroId && matchup) params.set("matchup", matchupHeroId);
    const query = params.toString();
    window.history.replaceState({}, "", query ? `?${query}` : window.location.pathname);
  }, [selectedHeroId, matchupHeroId, matchup]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (document.activeElement instanceof HTMLInputElement) return;
      if (matchupHeroId) setMatchupHeroId(null);
      else if (selectedHeroId) setSelectedHeroId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [matchupHeroId, selectedHeroId]);

  const selectHero = (heroId: string) => {
    setSelectedHeroId(heroId);
    setMatchupHeroId(null);
  };

  const reset = () => {
    setMatchupHeroId(null);
    setSelectedHeroId(null);
    setHoveredHeroId(null);
  };

  const matchupSource = matchup ? heroById.get(matchup.sourceHeroId) : undefined;
  const matchupTarget = matchup ? heroById.get(matchup.targetHeroId) : undefined;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img
            className="brand-logo"
            src={`${import.meta.env.BASE_URL}favicon.svg`}
            alt=""
            aria-hidden="true"
          />
          <div className="brand-block">
            <h1>DotaGraph</h1>
            <p>{scope.rankLabel} · Patch {scope.patch}</p>
          </div>
        </div>

        <div className="topbar-actions">
          <Search heroes={heroes} onSelect={(hero) => selectHero(hero.id)} />
          {selectedHeroId && (
            <button className="reset-button" type="button" onClick={reset}>Reset</button>
          )}
        </div>
      </header>

      <section className="graph-stage" aria-label="DotaGraph counter map">
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {matchup && matchupSource && matchupTarget
            ? `${matchupSource.name} counters ${matchupTarget.name}`
            : selectedHero
              ? `${selectedHero.name} selected`
              : "Graph overview"}
        </div>

        <GraphView
          heroes={heroes}
          relationships={fixtureRelationships.filter((relationship) => relationship.sampleSize >= scope.minimumSample)}
          selectedHeroId={selectedHeroId}
          hoveredHeroId={hoveredHeroId}
          matchupHeroId={matchupHeroId}
          selectedRelations={selectedRelations}
          onSelectHero={selectHero}
          onSelectMatchup={setMatchupHeroId}
          onHoverHero={setHoveredHeroId}
          onClearSelection={reset}
        />

        {!selectedHero && (
          <div className="empty-guidance">
            <strong>Explore the graph</strong>
            <span>Search or select a hero. Drag to move and use the mouse wheel to zoom.</span>
          </div>
        )}

        {selectedHero && !matchup && (
          <HeroCard
            hero={selectedHero}
            incoming={selectedRelations.incoming}
            outgoing={selectedRelations.outgoing}
            onMatchup={setMatchupHeroId}
          />
        )}

        {matchup && matchupSource && matchupTarget && (
          <MatchupCard
            source={matchupSource}
            target={matchupTarget}
            relationship={matchup}
            scope={scope}
            onBack={() => setMatchupHeroId(null)}
          />
        )}
      </section>
    </main>
  );
}
