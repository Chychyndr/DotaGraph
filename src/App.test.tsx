import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "./App";
import { fixtureMetadata, fixtureRelationships, scope } from "./data/fixtures";
import heroCatalog from "./data/heroCatalog.json";
import { buildHeroes } from "./data/heroes";

const heroes = buildHeroes({
  positions: Object.fromEntries(
    heroCatalog.map((hero, index) => [
      hero.slug,
      {
        x: 60 + (index % 16) * 65,
        y: 60 + Math.floor(index / 16) * 75
      }
    ])
  ),
  heroStats: Object.fromEntries(heroCatalog.map((hero) => [hero.slug, null]))
});
import type { DatasetLoadResult } from "./data/loadDataset";

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  window.history.replaceState({}, "", "/");
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false
    })
  });
});

describe("App data states", () => {
  it("shows an explicit loading state while the dataset is pending", () => {
    const datasetLoader = () => new Promise<DatasetLoadResult>(() => undefined);

    render(<App datasetLoader={datasetLoader} />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading matchup data");
  });

  it("blocks the graph when published data is malformed", async () => {
    const datasetLoader = async (): Promise<DatasetLoadResult> => ({
      status: "malformed",
      issues: ["Relationship at index 0 references an unknown target hero."]
    });

    render(<App datasetLoader={datasetLoader} />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Matchup data failed validation");
    expect(alert).toHaveTextContent("will not show partial");
    expect(screen.queryByRole("group", { name: "Dota 2 hero counter relationships" })).not.toBeInTheDocument();
  });

  it("shows explicit empty states when a selected hero has no reliable relationships", async () => {
    window.history.replaceState({}, "", "/?hero=viper");

    const datasetLoader = async (): Promise<DatasetLoadResult> => ({
      status: "ready",
      data: {
        heroes,
        relationships: [],
        scope,
        metadata: fixtureMetadata
      }
    });

    render(<App datasetLoader={datasetLoader} />);

    await screen.findByLabelText("Viper counter summary");
    expect(screen.getAllByText("No reliable relationships.")).toHaveLength(2);
  });

  it("keeps stale data usable while showing the upstream reason", async () => {
    const datasetLoader = async (): Promise<DatasetLoadResult> => ({
      status: "ready",
      data: {
        heroes,
        relationships: fixtureRelationships,
        scope,
        metadata: {
          ...fixtureMetadata,
          freshness: {
            status: "stale",
            reason: "Published observations are from an older patch."
          }
        }
      }
    });

    render(<App datasetLoader={datasetLoader} />);

    const warning = await screen.findByText("Matchup data may be outdated.");
    expect(warning.parentElement).toHaveTextContent("older patch");
    expect(screen.getByRole("group", { name: "Dota 2 hero counter relationships" })).toBeInTheDocument();
  });
});
