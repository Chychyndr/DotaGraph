import type { Hero } from "../domain/types";
import heroCatalog from "./heroCatalog.json";
import layout741e from "./layout-7.41e.json";

interface HeroSeed {
  slug: string;
  name: string;
}

interface HeroOverride {
  id?: string;
  aliases?: string[];
  overallWinRate?: number;
  sampleSize?: number;
}

const HERO_CATALOG: HeroSeed[] = heroCatalog;
const REAL_LAYOUT_POSITIONS = layout741e.positions as Record<
  string,
  { x: number; y: number }
>;

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

const FIXTURE_OVERRIDES: Record<string, HeroOverride> = {
  viper: { id:"viper", overallWinRate:0.513, sampleSize:124820 },
  shadow_demon: { id:"shadow-demon", overallWinRate:0.502, sampleSize:76811 },
  templar_assassin: { id:"templar-assassin", overallWinRate:0.518, sampleSize:91332 },
  bristleback: { id:"bristleback", overallWinRate:0.507, sampleSize:103332 },
  life_stealer: { id:"lifestealer", overallWinRate:0.521, sampleSize:126224 },
  mars: { id:"mars", overallWinRate:0.498, sampleSize:111091 },
  huskar: { id:"huskar", overallWinRate:0.496, sampleSize:72930 },
  chaos_knight: { id:"chaos-knight", overallWinRate:0.505, sampleSize:107200 },
  spectre: { id:"spectre", overallWinRate:0.501, sampleSize:99840 },
  dragon_knight: { id:"dragon-knight", overallWinRate:0.511, sampleSize:118020 },
  tidehunter: { id:"tidehunter", overallWinRate:0.493, sampleSize:84210 },
  phantom_assassin: { id:"phantom-assassin", overallWinRate:0.509, sampleSize:144100 },
  monkey_king: { id:"monkey-king", overallWinRate:0.497, sampleSize:137441 },
  night_stalker: { id:"night-stalker", overallWinRate:0.506, sampleSize:80910 },
  abyssal_underlord: { id:"underlord", overallWinRate:0.512, sampleSize:73122 },
  centaur: { id:"centaur", overallWinRate:0.515, sampleSize:120901 },
  windrunner: { id:"windranger", overallWinRate:0.504, sampleSize:132882 },
  axe: { id:"axe", overallWinRate:0.508, sampleSize:151031 }
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

export const heroes: Hero[] = HERO_CATALOG.map((seed, spriteIndex) => {
  const fixture = FIXTURE_OVERRIDES[seed.slug];
  const point = REAL_LAYOUT_POSITIONS[seed.slug];

  if (!point) {
    throw new Error(`Missing patch 7.41e layout position for ${seed.slug}`);
  }

  return {
    id: fixture?.id ?? DISPLAY_ID_OVERRIDES[seed.slug] ?? slugifyName(seed.name),
    slug: seed.slug,
    name: seed.name,
    aliases: fixture?.aliases ?? ALIASES[seed.slug] ?? [],
    spriteIndex,
    x: point.x,
    y: point.y,
    overallWinRate: fixture?.overallWinRate,
    sampleSize: fixture?.sampleSize
  };
});

export const heroById = new Map(heroes.map((hero) => [hero.id, hero]));
