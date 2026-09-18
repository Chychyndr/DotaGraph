import type { Hero } from "../../domain/types";
import {
  HERO_ATLAS_CELL_SIZE,
  HERO_ATLAS_URL,
  getHeroSpriteCell
} from "../../data/heroSprite";

let portraitCache: Promise<Map<number, string>> | null = null;

function loadAtlasImage() {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Sigma spike could not decode the local hero atlas."));
    image.src = HERO_ATLAS_URL;
  });
}

async function buildPortraitMap(heroes: Hero[]) {
  const atlas = await loadAtlasImage();
  const output = new Map<number, string>();

  const canvas = document.createElement("canvas");
  canvas.width = HERO_ATLAS_CELL_SIZE;
  canvas.height = HERO_ATLAS_CELL_SIZE;

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) {
    throw new Error("Sigma spike could not create a 2D canvas context.");
  }

  for (const hero of heroes) {
    const sprite = getHeroSpriteCell(hero.spriteIndex);

    context.clearRect(0, 0, HERO_ATLAS_CELL_SIZE, HERO_ATLAS_CELL_SIZE);
    context.drawImage(
      atlas,
      sprite.x,
      sprite.y,
      HERO_ATLAS_CELL_SIZE,
      HERO_ATLAS_CELL_SIZE,
      0,
      0,
      HERO_ATLAS_CELL_SIZE,
      HERO_ATLAS_CELL_SIZE
    );

    output.set(hero.spriteIndex, canvas.toDataURL("image/webp", 0.82));
  }

  return output;
}

export function getSigmaHeroPortraits(heroes: Hero[]) {
  portraitCache ??= buildPortraitMap(heroes);
  return portraitCache;
}
