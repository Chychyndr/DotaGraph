import type { Hero } from "../domain/types";

const portrait = (slug: string) =>
  `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${slug}.png`;

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

const HERO_CATALOG: HeroSeed[] = [
  { slug: "antimage", name: "Anti-Mage" },
  { slug: "axe", name: "Axe" },
  { slug: "bane", name: "Bane" },
  { slug: "bloodseeker", name: "Bloodseeker" },
  { slug: "crystal_maiden", name: "Crystal Maiden" },
  { slug: "drow_ranger", name: "Drow Ranger" },
  { slug: "earthshaker", name: "Earthshaker" },
  { slug: "juggernaut", name: "Juggernaut" },
  { slug: "mirana", name: "Mirana" },
  { slug: "morphling", name: "Morphling" },
  { slug: "nevermore", name: "Shadow Fiend" },
  { slug: "phantom_lancer", name: "Phantom Lancer" },
  { slug: "puck", name: "Puck" },
  { slug: "pudge", name: "Pudge" },
  { slug: "razor", name: "Razor" },
  { slug: "sand_king", name: "Sand King" },
  { slug: "storm_spirit", name: "Storm Spirit" },
  { slug: "sven", name: "Sven" },
  { slug: "tiny", name: "Tiny" },
  { slug: "vengefulspirit", name: "Vengeful Spirit" },
  { slug: "windrunner", name: "Windranger" },
  { slug: "zuus", name: "Zeus" },
  { slug: "kunkka", name: "Kunkka" },
  { slug: "lina", name: "Lina" },
  { slug: "lion", name: "Lion" },
  { slug: "shadow_shaman", name: "Shadow Shaman" },
  { slug: "slardar", name: "Slardar" },
  { slug: "tidehunter", name: "Tidehunter" },
  { slug: "witch_doctor", name: "Witch Doctor" },
  { slug: "lich", name: "Lich" },
  { slug: "riki", name: "Riki" },
  { slug: "enigma", name: "Enigma" },
  { slug: "tinker", name: "Tinker" },
  { slug: "sniper", name: "Sniper" },
  { slug: "necrolyte", name: "Necrophos" },
  { slug: "warlock", name: "Warlock" },
  { slug: "beastmaster", name: "Beastmaster" },
  { slug: "queenofpain", name: "Queen of Pain" },
  { slug: "venomancer", name: "Venomancer" },
  { slug: "faceless_void", name: "Faceless Void" },
  { slug: "skeleton_king", name: "Wraith King" },
  { slug: "death_prophet", name: "Death Prophet" },
  { slug: "phantom_assassin", name: "Phantom Assassin" },
  { slug: "pugna", name: "Pugna" },
  { slug: "templar_assassin", name: "Templar Assassin" },
  { slug: "viper", name: "Viper" },
  { slug: "luna", name: "Luna" },
  { slug: "dragon_knight", name: "Dragon Knight" },
  { slug: "dazzle", name: "Dazzle" },
  { slug: "rattletrap", name: "Clockwerk" },
  { slug: "leshrac", name: "Leshrac" },
  { slug: "furion", name: "Nature's Prophet" },
  { slug: "life_stealer", name: "Lifestealer" },
  { slug: "dark_seer", name: "Dark Seer" },
  { slug: "clinkz", name: "Clinkz" },
  { slug: "omniknight", name: "Omniknight" },
  { slug: "enchantress", name: "Enchantress" },
  { slug: "huskar", name: "Huskar" },
  { slug: "night_stalker", name: "Night Stalker" },
  { slug: "broodmother", name: "Broodmother" },
  { slug: "bounty_hunter", name: "Bounty Hunter" },
  { slug: "weaver", name: "Weaver" },
  { slug: "jakiro", name: "Jakiro" },
  { slug: "batrider", name: "Batrider" },
  { slug: "chen", name: "Chen" },
  { slug: "spectre", name: "Spectre" },
  { slug: "ancient_apparition", name: "Ancient Apparition" },
  { slug: "doom_bringer", name: "Doom" },
  { slug: "ursa", name: "Ursa" },
  { slug: "spirit_breaker", name: "Spirit Breaker" },
  { slug: "gyrocopter", name: "Gyrocopter" },
  { slug: "alchemist", name: "Alchemist" },
  { slug: "invoker", name: "Invoker" },
  { slug: "silencer", name: "Silencer" },
  { slug: "obsidian_destroyer", name: "Outworld Devourer" },
  { slug: "lycan", name: "Lycan" },
  { slug: "brewmaster", name: "Brewmaster" },
  { slug: "shadow_demon", name: "Shadow Demon" },
  { slug: "lone_druid", name: "Lone Druid" },
  { slug: "chaos_knight", name: "Chaos Knight" },
  { slug: "meepo", name: "Meepo" },
  { slug: "treant", name: "Treant Protector" },
  { slug: "ogre_magi", name: "Ogre Magi" },
  { slug: "undying", name: "Undying" },
  { slug: "rubick", name: "Rubick" },
  { slug: "disruptor", name: "Disruptor" },
  { slug: "nyx_assassin", name: "Nyx Assassin" },
  { slug: "naga_siren", name: "Naga Siren" },
  { slug: "keeper_of_the_light", name: "Keeper of the Light" },
  { slug: "wisp", name: "Io" },
  { slug: "visage", name: "Visage" },
  { slug: "slark", name: "Slark" },
  { slug: "medusa", name: "Medusa" },
  { slug: "troll_warlord", name: "Troll Warlord" },
  { slug: "centaur", name: "Centaur Warrunner" },
  { slug: "magnataur", name: "Magnus" },
  { slug: "shredder", name: "Timbersaw" },
  { slug: "bristleback", name: "Bristleback" },
  { slug: "tusk", name: "Tusk" },
  { slug: "skywrath_mage", name: "Skywrath Mage" },
  { slug: "abaddon", name: "Abaddon" },
  { slug: "elder_titan", name: "Elder Titan" },
  { slug: "legion_commander", name: "Legion Commander" },
  { slug: "techies", name: "Techies" },
  { slug: "ember_spirit", name: "Ember Spirit" },
  { slug: "earth_spirit", name: "Earth Spirit" },
  { slug: "abyssal_underlord", name: "Underlord" },
  { slug: "terrorblade", name: "Terrorblade" },
  { slug: "phoenix", name: "Phoenix" },
  { slug: "oracle", name: "Oracle" },
  { slug: "winter_wyvern", name: "Winter Wyvern" },
  { slug: "arc_warden", name: "Arc Warden" },
  { slug: "monkey_king", name: "Monkey King" },
  { slug: "dark_willow", name: "Dark Willow" },
  { slug: "pangolier", name: "Pangolier" },
  { slug: "grimstroke", name: "Grimstroke" },
  { slug: "hoodwink", name: "Hoodwink" },
  { slug: "void_spirit", name: "Void Spirit" },
  { slug: "snapfire", name: "Snapfire" },
  { slug: "mars", name: "Mars" },
  { slug: "ringmaster", name: "Ringmaster" },
  { slug: "dawnbreaker", name: "Dawnbreaker" },
  { slug: "marci", name: "Marci" },
  { slug: "primal_beast", name: "Primal Beast" },
  { slug: "muerta", name: "Muerta" },
  { slug: "kez", name: "Kez" },
  { slug: "largo", name: "Largo" },
];

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

export const heroes: Hero[] = HERO_CATALOG.map((seed) => {
  const fixture = FIXTURE_OVERRIDES[seed.slug];
  const point = typeof fixture?.x === "number" && typeof fixture?.y === "number"
    ? { x: fixture.x, y: fixture.y }
    : generatedPosition(generatedIndex++);

  return {
    id: fixture?.id ?? DISPLAY_ID_OVERRIDES[seed.slug] ?? slugifyName(seed.name),
    slug: seed.slug,
    name: seed.name,
    aliases: fixture?.aliases ?? ALIASES[seed.slug] ?? [],
    portrait: portrait(seed.slug),
    x: point.x,
    y: point.y,
    overallWinRate: fixture?.overallWinRate,
    sampleSize: fixture?.sampleSize
  };
});

export const heroById = new Map(heroes.map((hero) => [hero.id, hero]));
