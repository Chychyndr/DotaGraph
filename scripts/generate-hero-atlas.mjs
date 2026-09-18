import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = join(root, "src", "data", "heroCatalog.json");
const outputDir = join(root, "public", "assets");
const atlasPath = join(outputDir, "heroes-atlas.webp");
const manifestPath = join(outputDir, "heroes-atlas.manifest.json");

const COLUMNS = 16;
const CELL_SIZE = 96;
const QUALITY = 76;
const MAX_BYTES = 1_500_000;
const SOURCE_ROOT =
  "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes";

const catalogBytes = await readFile(catalogPath);
const heroes = JSON.parse(catalogBytes.toString("utf8"));
const rows = Math.ceil(heroes.length / COLUMNS);
const signature = createHash("sha256")
  .update(catalogBytes)
  .update(JSON.stringify({ columns: COLUMNS, cellSize: CELL_SIZE, quality: QUALITY, source: SOURCE_ROOT }))
  .digest("hex");

async function canReuseAtlas() {
  try {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const atlas = await stat(atlasPath);
    return (
      manifest.signature === signature &&
      manifest.heroCount === heroes.length &&
      atlas.size === manifest.bytes &&
      atlas.size > 0
    );
  } catch {
    return false;
  }
}

if (await canReuseAtlas()) {
  const atlas = await stat(atlasPath);
  console.log(
    `Hero atlas is current: ${heroes.length} heroes, ${Math.round(atlas.size / 1024)} KiB.`
  );
  process.exit(0);
}

await mkdir(outputDir, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchPortrait(slug) {
  const url = `${SOURCE_ROOT}/${slug}.png`;
  let lastError;

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "user-agent": "DotaGraph asset builder (https://github.com/Chychyndr/DotaGraph)"
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      if (attempt < 4) await sleep(350 * attempt);
    }
  }

  throw new Error(
    `Unable to download ${slug}: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

async function mapWithConcurrency(items, limit, worker) {
  const output = new Array(items.length);
  let cursor = 0;

  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      output[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return output;
}

console.log(`Building one local hero atlas from ${heroes.length} source portraits…`);

const layers = await mapWithConcurrency(heroes, 12, async (hero, index) => {
  const input = await fetchPortrait(hero.slug);
  const square = await sharp(input)
    .resize(CELL_SIZE, CELL_SIZE, {
      fit: "cover",
      position: "centre",
      kernel: sharp.kernel.lanczos3
    })
    .png()
    .toBuffer();

  return {
    input: square,
    left: (index % COLUMNS) * CELL_SIZE,
    top: Math.floor(index / COLUMNS) * CELL_SIZE
  };
});

await sharp({
  create: {
    width: COLUMNS * CELL_SIZE,
    height: rows * CELL_SIZE,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  }
})
  .composite(layers)
  .webp({
    quality: QUALITY,
    alphaQuality: 100,
    smartSubsample: true,
    effort: 6
  })
  .toFile(atlasPath);

const atlas = await stat(atlasPath);

if (atlas.size > MAX_BYTES) {
  throw new Error(
    `Hero atlas is unexpectedly large: ${Math.round(atlas.size / 1024)} KiB (limit ${Math.round(MAX_BYTES / 1024)} KiB).`
  );
}

const manifest = {
  signature,
  heroCount: heroes.length,
  columns: COLUMNS,
  rows,
  cellSize: CELL_SIZE,
  quality: QUALITY,
  bytes: atlas.size,
  source: SOURCE_ROOT
};

await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

console.log(
  `Hero atlas built: ${COLUMNS * CELL_SIZE}x${rows * CELL_SIZE}, ${Math.round(atlas.size / 1024)} KiB, one browser request.`
);
