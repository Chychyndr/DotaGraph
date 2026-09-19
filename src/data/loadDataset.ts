import type { DatasetBundle } from "./dataset";
import { validateDataset } from "./dataset";
import { buildDatasetFromProductionSnapshot } from "./productionSnapshot";

export type DatasetLoadResult =
  | { status: "ready"; data: DatasetBundle }
  | { status: "malformed"; issues: string[] };

async function fetchProductionSnapshot(): Promise<unknown> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/current-matchups.json`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to load current matchup data: HTTP ${response.status}`);
  }

  return response.json();
}

export async function loadDataset(
  source: () => Promise<unknown> = fetchProductionSnapshot
): Promise<DatasetLoadResult> {
  const raw = await source();
  const conversion = buildDatasetFromProductionSnapshot(raw);

  if (!conversion.ok) {
    return {
      status: "malformed",
      issues: conversion.issues
    };
  }

  const validation = validateDataset(conversion.data);
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
