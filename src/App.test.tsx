import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";
import { fixtureMetadata, fixtureRelationships, scope } from "./data/fixtures";
import { heroes } from "./data/heroes";
import type { DatasetLoadResult } from "./data/loadDataset";

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
