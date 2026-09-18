import type { DatasetBundle } from "./dataset";
import { validateDataset } from "./dataset";

export type DatasetLoadResult =
  | { status: "ready"; data: DatasetBundle }
  | { status: "malformed"; issues: string[] };

async function loadFixtureBundle(): Promise<unknown> {
  const [{ heroes }, { fixtureMetadata, fixtureRelationships, scope }] =
    await Promise.all([import("./heroes"), import("./fixtures")]);

  return {
    heroes,
    relationships: fixtureRelationships,
    scope,
    metadata: fixtureMetadata
  };
}

export async function loadDataset(
  source: () => Promise<unknown> = loadFixtureBundle
): Promise<DatasetLoadResult> {
  const candidate = await source();
  const validation = validateDataset(candidate);

  if (!validation.ok) {
    return {
      status: "malformed",
      issues: validation.issues
    };
  }

  return {
    status: "ready",
    data: validation.data
  };
}
