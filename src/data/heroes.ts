import type { Hero } from "../domain/types";

const portrait = (slug: string) =>
  `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${slug}.png`;

export const heroes: Hero[] = [
  { id:"viper", slug:"viper", name:"Viper", aliases:[], portrait:portrait("viper"), x:600, y:380, overallWinRate:0.513, sampleSize:124820 },
  { id:"shadow-demon", slug:"shadow_demon", name:"Shadow Demon", aliases:["sd"], portrait:portrait("shadow_demon"), x:360, y:255, overallWinRate:0.502, sampleSize:76811 },
  { id:"templar-assassin", slug:"templar_assassin", name:"Templar Assassin", aliases:["ta"], portrait:portrait("templar_assassin"), x:405, y:465, overallWinRate:0.518, sampleSize:91332 },
  { id:"bristleback", slug:"bristleback", name:"Bristleback", aliases:["bb"], portrait:portrait("bristleback"), x:515, y:160, overallWinRate:0.507, sampleSize:103332 },
  { id:"lifestealer", slug:"life_stealer", name:"Lifestealer", aliases:["naix","ls"], portrait:portrait("life_stealer"), x:725, y:165, overallWinRate:0.521, sampleSize:126224 },
  { id:"mars", slug:"mars", name:"Mars", aliases:[], portrait:portrait("mars"), x:830, y:245, overallWinRate:0.498, sampleSize:111091 },
  { id:"huskar", slug:"huskar", name:"Huskar", aliases:[], portrait:portrait("huskar"), x:840, y:455, overallWinRate:0.496, sampleSize:72930 },
  { id:"chaos-knight", slug:"chaos_knight", name:"Chaos Knight", aliases:["ck"], portrait:portrait("chaos_knight"), x:720, y:590, overallWinRate:0.505, sampleSize:107200 },
  { id:"spectre", slug:"spectre", name:"Spectre", aliases:["spec"], portrait:portrait("spectre"), x:520, y:620, overallWinRate:0.501, sampleSize:99840 },
  { id:"dragon-knight", slug:"dragon_knight", name:"Dragon Knight", aliases:["dk"], portrait:portrait("dragon_knight"), x:960, y:355, overallWinRate:0.511, sampleSize:118020 },
  { id:"tidehunter", slug:"tidehunter", name:"Tidehunter", aliases:["tide"], portrait:portrait("tidehunter"), x:980, y:520, overallWinRate:0.493, sampleSize:84210 },
  { id:"phantom-assassin", slug:"phantom_assassin", name:"Phantom Assassin", aliases:["pa"], portrait:portrait("phantom_assassin"), x:250, y:540, overallWinRate:0.509, sampleSize:144100 },
  { id:"monkey-king", slug:"monkey_king", name:"Monkey King", aliases:["mk"], portrait:portrait("monkey_king"), x:220, y:355, overallWinRate:0.497, sampleSize:137441 },
  { id:"night-stalker", slug:"night_stalker", name:"Night Stalker", aliases:["ns"], portrait:portrait("night_stalker"), x:1030, y:185, overallWinRate:0.506, sampleSize:80910 },
  { id:"underlord", slug:"abyssal_underlord", name:"Underlord", aliases:["pitlord"], portrait:portrait("abyssal_underlord"), x:170, y:175, overallWinRate:0.512, sampleSize:73122 },
  { id:"centaur", slug:"centaur", name:"Centaur Warrunner", aliases:["cent"], portrait:portrait("centaur"), x:355, y:95, overallWinRate:0.515, sampleSize:120901 },
  { id:"windranger", slug:"windrunner", name:"Windranger", aliases:["wr"], portrait:portrait("windrunner"), x:110, y:470, overallWinRate:0.504, sampleSize:132882 },
  { id:"axe", slug:"axe", name:"Axe", aliases:[], portrait:portrait("axe"), x:610, y:705, overallWinRate:0.508, sampleSize:151031 }
];

export const heroById = new Map(heroes.map((hero) => [hero.id, hero]));
