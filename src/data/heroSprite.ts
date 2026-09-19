import type { CSSProperties } from "react";

export const HERO_ATLAS_COLUMNS = 16;
export const HERO_ATLAS_ROWS = 8;
export const HERO_ATLAS_CELL_SIZE = 96;
export const HERO_ATLAS_WIDTH = HERO_ATLAS_COLUMNS * HERO_ATLAS_CELL_SIZE;
export const HERO_ATLAS_HEIGHT = HERO_ATLAS_ROWS * HERO_ATLAS_CELL_SIZE;

const buildRevision = import.meta.env.VITE_BUILD_SHA || "dev";

export const HERO_ATLAS_URL =
  `${import.meta.env.BASE_URL}assets/heroes-atlas.webp?v=${encodeURIComponent(buildRevision)}`;

export const getHeroFallbackLabel = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

export const getHeroSpriteCell = (spriteIndex: number) => {
  const column = spriteIndex % HERO_ATLAS_COLUMNS;
  const row = Math.floor(spriteIndex / HERO_ATLAS_COLUMNS);

  return {
    column,
    row,
    x: column * HERO_ATLAS_CELL_SIZE,
    y: row * HERO_ATLAS_CELL_SIZE
  };
};

export const getHeroSpriteStyle = (spriteIndex: number, atlasUrl = HERO_ATLAS_URL): CSSProperties => {
  const { column, row } = getHeroSpriteCell(spriteIndex);
  const x = (column / (HERO_ATLAS_COLUMNS - 1)) * 100;
  const y = (row / (HERO_ATLAS_ROWS - 1)) * 100;

  return {
    backgroundImage: `url("${atlasUrl}")`,
    backgroundPosition: `${x}% ${y}%`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${HERO_ATLAS_COLUMNS * 100}% ${HERO_ATLAS_ROWS * 100}%`
  };
};
