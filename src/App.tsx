import { useEffect, useMemo, useState } from "react";
import { HeroCard } from "./components/HeroCard";
import { MatchupCard } from "./components/MatchupCard";
import { usePortraitAsset } from "./components/PortraitProvider";
import { Search } from "./components/Search";
import type { DatasetBundle } from "./data/dataset";
import { loadDataset, type DatasetLoadResult } from "./data/loadDataset";
import { findRelationship, selectRelations } from "./domain/relationships";
import type { Hero } from "./domain/types";
import { GraphView } from "./graph/GraphView";

type AppDataState =
  | { status: "loading" }
  | { status: "ready"; data: DatasetBundle }
  | { status: "malformed"; issues: string[] }
  | { status: "unavailable" };

interface AppProps {
  datasetLoader?: () => Promise<DatasetLoadResult>;
}

function readInitialState(heroById: ReadonlyMap<string, Hero>) {
  const params = new URLSearchParams(window.location.search);
  const hero = params.get("hero");
  const matchup = params.get("matchup");
  return {
    hero: hero && heroById.has(hero) ? hero : null,
    matchup: matchup && heroById.has(matchup) ? matchup : null
  };
}

function Brand({ data }: { data?: DatasetBundle }) {
  return (
    <div className="brand">
      <img
        className="brand-logo"
        src={`${import.meta.env.BASE_URL}favicon.svg`}
        alt=""
        aria-hidden="true"
      />
      <div className="brand-block">
        <h1>DotaGraph</h1>
        {data && <p>{data.scope.rankLabel} · Patch {data.scope.patch}</p>}
      </div>
    </div>
  );
}

function BlockingDataState({
  status,
  issues,
  onRetry
}: {
  status: "loading" | "malformed" | "unavailable";
  issues?: string[];
  onRetry: () => void;
}) {
  if (status === "loading") {
    return (
      <section className="graph-stage data-state-stage" aria-label="DotaGraph counter map">
        <div className="data-state-panel" role="status" aria-live="polite">
          <span className="data-state-spinner" aria-hidden="true" />
          <strong>Loading matchup data…</strong>
          <span>Checking the published graph before it is shown.</span>
        </div>
      </section>
    );
  }

  const malformed = status === "malformed";

  return (
    <section className="graph-stage data-state-stage" aria-label="DotaGraph counter map">
      <div className="data-state-panel data-state-error" role="alert">
        <strong>{malformed ? "Matchup data failed validation" : "Matchup data could not be loaded"}</strong>
        <span>
          {malformed
            ? "DotaGraph will not show partial or potentially misleading relationships."
            : "The local published data bundle is unavailable."}
        </span>
        {malformed && issues?.[0] && (
          <small className="data-state-detail">Validation: {issues[0]}</small>
        )}
        <button type="button" className="retry-button" onClick={onRetry}>Retry</button>
      </div>
    </section>
  );
}

function ReadyApp({ data }: { data: DatasetBundle }) {
  const portraitAsset = usePortraitAsset();
  const {
    heroes,
    relationships,
    evidenceObservations = [],
    scope,
    metadata
  } = data;
  const heroById = useMemo(() => new Map(heroes.map((hero) => [hero.id, hero])), [heroes]);
  const initial = useMemo(() => readInitialState(heroById), [heroById]);
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(initial.hero);
  const [matchupHeroId, setMatchupHeroId] = useState<string | null>(initial.matchup);
  const [hoveredHeroId, setHoveredHeroId] = useState<string | null>(null);

  const selectedHero = selectedHeroId ? heroById.get(selectedHeroId) : undefined;
  const selectedRelations = useMemo(
    () => selectedHeroId
      ? selectRelations(selectedHeroId, relationships, scope)
      : { incoming: [], outgoing: [] },
    [relationships, scope, selectedHeroId]
  );

  const matchup = selectedHeroId && matchupHeroId
    ? findRelationship(selectedHeroId, matchupHeroId, relationships, scope)
    : undefined;

  const matchupEvidence = useMemo(
    () =>
      matchup
        ? evidenceObservations.filter(
            (observation) =>
              observation.sourceHeroId === matchup.sourceHeroId &&
              observation.targetHeroId === matchup.targetHeroId &&
              observation.scope.patch === scope.patch &&
              (observation.scope.rankScope === "immortal" ||
                observation.scope.rankScope === "pro")
          )
        : [],
    [evidenceObservations, matchup, scope.patch]
  );

  const visibleRelationships = useMemo(
    () => relationships.filter(
      (relationship) =>
        relationship.sampleSize >= scope.minimumSample &&
        relationship.patch === scope.patch &&
        relationship.rankScope === scope.rankScope
    ),
    [relationships, scope]
  );

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
        <Brand data={data} />

        <div className="topbar-actions">
          <Search heroes={heroes} onSelect={(hero) => selectHero(hero.id)} />
          {selectedHeroId && (
            <button className="reset-button" type="button" onClick={reset}>Reset</button>
          )}
        </div>
      </header>

      <section className="graph-stage" aria-label="DotaGraph counter map">
        {(metadata.freshness.status === "stale" || portraitAsset.status === "failed") && (
          <div className="stage-notices">
            {metadata.freshness.status === "stale" && (
              <div className="data-warning" role="status">
                <strong>Matchup data may be outdated.</strong>
                <span>{metadata.freshness.reason}</span>
              </div>
            )}
            {portraitAsset.status === "failed" && (
              <div className="data-warning portrait-warning" role="status">
                <strong>Hero portraits are unavailable.</strong>
                <span>Showing text fallbacks so the graph stays usable.</span>
              </div>
            )}
          </div>
        )}

        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {matchup && matchupSource && matchupTarget
            ? `${matchupSource.name} counters ${matchupTarget.name}`
            : selectedHero
              ? `${selectedHero.name} selected`
              : "Graph overview"}
        </div>

        <GraphView
          heroes={heroes}
          relationships={visibleRelationships}
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
            heroesById={heroById}
          />
        )}

        {matchup && matchupSource && matchupTarget && (
          <MatchupCard
            source={matchupSource}
            target={matchupTarget}
            relationship={matchup}
            scope={scope}
            metadata={metadata}
            evidenceObservations={matchupEvidence}
            onBack={() => setMatchupHeroId(null)}
          />
        )}
      </section>
    </main>
  );
}

export default function App({ datasetLoader = loadDataset }: AppProps) {
  const [state, setState] = useState<AppDataState>({ status: "loading" });
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });

    datasetLoader()
      .then((result) => {
        if (!active) return;
        if (result.status === "ready") {
          setState({ status: "ready", data: result.data });
        } else {
          setState({ status: "malformed", issues: result.issues });
        }
      })
      .catch(() => {
        if (active) setState({ status: "unavailable" });
      });

    return () => {
      active = false;
    };
  }, [datasetLoader, loadAttempt]);

  const retry = () => setLoadAttempt((attempt) => attempt + 1);

  if (state.status === "ready") {
    return <ReadyApp data={state.data} />;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <Brand />
      </header>
      <BlockingDataState
        status={state.status}
        issues={state.status === "malformed" ? state.issues : undefined}
        onRetry={retry}
      />
    </main>
  );
}
