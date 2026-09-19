import { describe, expect, it } from "vitest";
import { loadDataset } from "./loadDataset";

describe("loadDataset", () => {
  it("returns malformed instead of exposing invalid input", async () => {
    const result = await loadDataset(async () => ({
      heroes: [],
      relationships: [],
      scope: {},
      metadata: {}
    }));

    expect(result.status).toBe("malformed");
    if (result.status === "malformed") {
      expect(result.issues.length).toBeGreaterThan(0);
    }
  });
});
