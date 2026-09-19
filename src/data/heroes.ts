import type { Hero } from "../domain/types";
import heroCatalog from "./heroCatalog.json";

interface HeroSeed {
  slug: string;
  name: string;
}

export interface GeneratedHeroStat {
  overallWinRate: number;
  pairObservationGames: number;
  matchCount: number;
}

export interface GeneratedHeroInputs {
  positions: Record<string, { x: number; y: number }>;
  heroStats: Record<string, GeneratedHeroStat | null>;
}

const HERO_CATALOG: HeroSeed[] = heroCatalog;

const ALIASES: Record<string, string[]> = {
  antimage: ["am"],
  axe: [],
  bloodseeker: ["bs"],
  crystal_maiden: ["cm"],
  drow_ranger: ["drow"],
  earthshaker: ["es"],
  nevermore: ["sf"],
  phantom_lancer: ["pl"],
  queenofpain: ["qop"],
  skeleton_king: ["wk"],
  furion: ["np", "furion"],
  life_stealer: ["naix", "ls"],
  rattletrap: ["clock"],
  necrolyte: ["necro"],
  windrunner: ["wr"],
  shadow_demon: ["sd"],
  templar_assassin: ["ta"],
  bristleback: ["bb"],
  chaos_knight: ["ck"],
  dragon_knight: ["dk"],
  spectre: ["spec"],
  night_stalker: ["ns"],
  abyssal_underlord: ["pitlord"],
  centaur: ["cent"],
  monkey_king: ["mk"],
  phantom_assassin: ["pa"],
  tidehunter: ["tide"],
  keeper_of_the_light: ["kotl"],
  spirit_breaker: ["sb", "bara"],
  obsidian_destroyer: ["od"],
  legion_commander: ["lc"],
  skywrath_mage: ["sky"],
  terrorblade: ["tb"],
  pangolier: ["pango"],
  dark_willow: ["dw"],
  grimstroke: ["grim"],
  snapfire: ["snap"],
  dawnbreaker: ["db"],
  primal_beast: ["pb"],
  ringmaster: ["rm"]
};

const DISPLAY_ID_OVERRIDES: Record<string, string> = {
  nevermore: "shadow-fiend",
  zuus: "zeus",
  skeleton_king: "wraith-king",
  rattletrap: "clockwerk",
  furion: "natures-prophet",
  life_stealer: "lifestealer",
  necrolyte: "necrophos",
  doom_bringer: "doom",
  wisp: "io",
  shredder: "timbersaw",
  obsidian_destroyer: "outworld-destroyer",
  abyssal_underlord: "underlord",
  windrunner: "windranger",
  ringmaster: "ringmaster"
};

const slugifyName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const heroIdForSlug = (slug: string, name: string) =>
  DISPLAY_ID_OVERRIDES[slug] ?? slugifyName(name);

export function buildHeroes({ positions, heroStats }: GeneratedHeroInputs): Hero[] {
  return HERO_CATALOG.map((seed, spriteIndex) => {
    const point = positions[seed.slug];
    if (!point) {
      throw new Error(`Missing current layout position for ${seed.slug}`);
    }

    const stat = heroStats[seed.slug];
    return {
      id: heroIdForSlug(seed.slug, seed.name),
      slug: seed.slug,
      name: seed.name,
      aliases: ALIASES[seed.slug] ?? [],
      spriteIndex,
      x: point.x,
      y: point.y,
      overallWinRate: stat?.overallWinRate,
      sampleSize: stat?.matchCount
    };
  });
}

export const heroCatalogSize = HERO_CATALOG.length;
