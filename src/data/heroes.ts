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
  antimage: ["am", "magina"],
  axe: ["mogul khan"],
  bane: ["atropos"],
  bloodseeker: ["bs", "strygwyr"],
  crystal_maiden: ["cm", "rylai"],
  drow_ranger: ["drow", "traxex"],
  earthshaker: ["es", "raigor", "raigor stonehoof"],
  juggernaut: ["jugg", "yurnero"],
  mirana: ["potm", "princess of the moon"],
  morphling: ["morph"],
  nevermore: ["sf", "nevermore"],
  phantom_lancer: ["pl", "azwraith"],
  puck: [],
  pudge: ["butcher"],
  razor: ["lightning revenant"],
  sand_king: ["crixalis"],
  storm_spirit: ["raijin", "raijin thunderkeg"],
  sven: ["rogue knight"],
  tiny: ["stone giant"],
  vengefulspirit: ["venge", "shendelzare"],
  windrunner: ["wr", "lyralei", "windrunner"],
  zuus: ["lord of heaven"],
  kunkka: ["admiral", "admiral kunkka"],
  lina: ["slayer"],
  lion: ["demon witch"],
  shadow_shaman: ["rhasta", "shaman"],
  slardar: ["slithereen guard"],
  tidehunter: ["tide", "leviathan"],
  witch_doctor: ["wd", "zharvakko"],
  lich: [],
  riki: ["rikimaru"],
  enigma: [],
  tinker: ["boush"],
  sniper: ["kardel", "kardel sharpeye"],
  necrolyte: ["necro", "rotundjere"],
  warlock: ["demnok", "demnok lannik"],
  beastmaster: ["karroch"],
  queenofpain: ["qop", "akasha"],
  venomancer: ["veno", "lesale", "lesale deathbringer"],
  faceless_void: ["fv", "darkterror"],
  skeleton_king: ["wk", "ostarion", "skeleton king"],
  death_prophet: ["dp", "krobelus"],
  phantom_assassin: ["pa", "mortred"],
  pugna: [],
  templar_assassin: ["ta", "lanaya"],
  viper: ["netherdrake"],
  luna: ["luna moonfang"],
  dragon_knight: ["dk", "davion"],
  dazzle: ["shadow priest"],
  rattletrap: ["clock", "rattletrap"],
  leshrac: ["lesh", "tormented soul"],
  furion: ["np", "furion"],
  life_stealer: ["naix", "ls"],
  dark_seer: ["ds", "ish'kafel"],
  clinkz: ["bone fletcher"],
  omniknight: ["omni", "purist", "purist thunderwrath"],
  enchantress: ["ench", "aiushtha"],
  huskar: ["sacred warrior"],
  night_stalker: ["ns", "balanar"],
  broodmother: ["brood", "black arachnia"],
  bounty_hunter: ["bh", "gondar"],
  weaver: ["skitskurr"],
  jakiro: ["twin head dragon"],
  batrider: ["bat", "jin'zakk"],
  chen: ["holy knight"],
  spectre: ["spec", "mercurial"],
  ancient_apparition: ["aa", "kaldr"],
  doom_bringer: ["doom", "lucifer", "doom bringer"],
  ursa: ["ulfsaar"],
  spirit_breaker: ["sb", "bara", "barathrum"],
  gyrocopter: ["gyro"],
  alchemist: ["alch", "razzil", "razzil darkbrew"],
  invoker: ["voker", "carl"],
  silencer: ["nortrom"],
  obsidian_destroyer: ["od", "obsidian destroyer", "outworld destroyer", "harbinger"],
  lycan: ["banehallow"],
  brewmaster: ["brew", "mangix"],
  shadow_demon: ["sd", "eradar"],
  lone_druid: ["ld", "sylla"],
  chaos_knight: ["ck", "nessaj"],
  meepo: [],
  treant: ["treant", "rooftrellen"],
  ogre_magi: ["ogre", "aggron", "aggron stonebreak"],
  undying: ["dirge"],
  rubick: ["grand magus"],
  disruptor: [],
  nyx_assassin: ["nyx"],
  naga_siren: ["naga", "slithice"],
  keeper_of_the_light: ["kotl", "ezalor"],
  wisp: ["io", "wisp"],
  visage: ["necro'lic"],
  slark: ["nightcrawler"],
  medusa: ["dusa"],
  troll_warlord: ["troll", "jah'rakal"],
  centaur: ["cent", "bradwarden"],
  magnataur: ["magnus", "magnataur"],
  shredder: ["timber", "rizzrack", "shredder"],
  bristleback: ["bb", "rigwarl"],
  tusk: ["ymir"],
  skywrath_mage: ["sky", "dragonus"],
  abaddon: ["abba", "lord of avernus"],
  elder_titan: ["et"],
  legion_commander: ["lc", "tresdin"],
  techies: ["squee", "spleen", "spoon"],
  ember_spirit: ["ember", "xin"],
  earth_spirit: ["kaolin"],
  abyssal_underlord: ["pitlord", "vrogros"],
  terrorblade: ["tb"],
  phoenix: ["icarus"],
  oracle: ["nerif"],
  winter_wyvern: ["ww", "auroth"],
  arc_warden: ["arc", "zet"],
  monkey_king: ["mk", "sun wukong", "wukong"],
  dark_willow: ["dw", "mireska", "mireska sunbreeze"],
  pangolier: ["pango", "donte", "donté panlin"],
  grimstroke: ["grim"],
  hoodwink: ["hood"],
  void_spirit: ["inai"],
  snapfire: ["snap", "beatrix", "beatrix snapfire"],
  mars: [],
  ringmaster: ["rm"],
  dawnbreaker: ["db", "valora"],
  marci: [],
  primal_beast: ["pb"],
  muerta: [],
  kez: [],
  largo: []
}

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
