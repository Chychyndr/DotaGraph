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
  x?: number;
  y?: number;
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
  viper: { id:"viper", x:600, y:380, overallWinRate:0.513, sampleSize:124820 },
  shadow_demon: { id:"shadow-demon", x:360, y:255, overallWinRate:0.502, sampleSize:76811 },
  templar_assassin: { id:"templar-assassin", x:405, y:465, overallWinRate:0.518, sampleSize:91332 },
  bristleback: { id:"bristleback", x:515, y:160, overallWinRate:0.507, sampleSize:103332 },
  life_stealer: { id:"lifestealer", x:725, y:165, overallWinRate:0.521, sampleSize:126224 },
  mars: { id:"mars", x:830, y:245, overallWinRate:0.498, sampleSize:111091 },
  huskar: { id:"huskar", x:840, y:455, overallWinRate:0.496, sampleSize:72930 },
  chaos_knight: { id:"chaos-knight", x:720, y:590, overallWinRate:0.505, sampleSize:107200 },
  spectre: { id:"spectre", x:520, y:620, overallWinRate:0.501, sampleSize:99840 },
  dragon_knight: { id:"dragon-knight", x:960, y:355, overallWinRate:0.511, sampleSize:118020 },
  tidehunter: { id:"tidehunter", x:980, y:520, overallWinRate:0.493, sampleSize:84210 },
  phantom_assassin: { id:"phantom-assassin", x:250, y:540, overallWinRate:0.509, sampleSize:144100 },
  monkey_king: { id:"monkey-king", x:220, y:355, overallWinRate:0.497, sampleSize:137441 },
  night_stalker: { id:"night-stalker", x:1030, y:185, overallWinRate:0.506, sampleSize:80910 },
  abyssal_underlord: { id:"underlord", x:170, y:175, overallWinRate:0.512, sampleSize:73122 },
  centaur: { id:"centaur", x:355, y:95, overallWinRate:0.515, sampleSize:120901 },
  windrunner: { id:"windranger", x:110, y:470, overallWinRate:0.504, sampleSize:132882 },
  axe: { id:"axe", x:610, y:705, overallWinRate:0.508, sampleSize:151031 }
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

const WIDTH = 1200;
const HEIGHT = 760;
const MIN_DISTANCE = 43;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

const slugifyName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const reservedPositions = Object.values(FIXTURE_OVERRIDES)
  .filter((hero): hero is HeroOverride & { x: number; y: number } =>
    typeof hero.x === "number" && typeof hero.y === "number"
  )
  .map(({ x, y }) => ({ x, y }));

const generatedPositions: Array<{ x: number; y: number }> = [];

const isFree = (x: number, y: number) =>
  [...reservedPositions, ...generatedPositions].every((point) =>
    Math.hypot(point.x - x, point.y - y) >= MIN_DISTANCE
  );

const generatedPosition = (index: number) => {
  for (let attempt = 0; attempt < 720; attempt += 1) {
    const sequence = index + attempt * 0.41;
    const fraction = ((index + 1 + attempt * 0.17) % HERO_CATALOG.length + 1) / HERO_CATALOG.length;
    const radius = Math.sqrt(fraction);
    const angle = sequence * GOLDEN_ANGLE;
    const x = WIDTH / 2 + Math.cos(angle) * radius * 525;
    const y = HEIGHT / 2 + Math.sin(angle) * radius * 315;

    if (x < 48 || x > WIDTH - 48 || y < 48 || y > HEIGHT - 48) continue;
    if (!isFree(x, y)) continue;

    const point = { x: Math.round(x), y: Math.round(y) };
    generatedPositions.push(point);
    return point;
  }

  throw new Error(`Unable to place hero index ${index} without overlap`);
};

let generatedIndex = 0;

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
