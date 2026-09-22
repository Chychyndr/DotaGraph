import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "src/styles/global.css"), "utf8");

describe("global CSS tokens", () => {
  it("defines every custom property referenced through var()", () => {
    const defined = new Set(
      [...css.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map((match) => match[1])
    );
    const used = new Set(
      [...css.matchAll(/var\((--[a-z0-9-]+)/gi)].map((match) => match[1])
    );

    const undefinedTokens = [...used]
      .filter((token) => !defined.has(token))
      .sort();

    expect(undefinedTokens).toEqual([]);
  });
});
