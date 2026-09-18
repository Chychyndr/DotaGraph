import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const indexPath = join(dist, "index.html");
const expectedBuildSha = process.env.EXPECTED_BUILD_SHA;

const fail = (message) => {
  console.error(`Pages artifact verification failed: ${message}`);
  process.exit(1);
};

if (!existsSync(indexPath)) fail("dist/index.html does not exist.");

const html = readFileSync(indexPath, "utf8");

if (html.includes("/src/main.tsx")) {
  fail("the production artifact still references the Vite source entry.");
}

if (html.includes("%BASE_URL%")) {
  fail("an unresolved Vite BASE_URL placeholder remains in the artifact.");
}

if (!html.includes("/DotaGraph/assets/")) {
  fail("the production artifact does not use the /DotaGraph/ GitHub Pages base path.");
}

if (!html.includes("/DotaGraph/favicon.svg")) {
  fail("the favicon path is not GitHub Pages aware.");
}

const assetPaths = [...html.matchAll(/(?:src|href)="\/DotaGraph\/(assets\/[^"]+)"/g)]
  .map((match) => match[1]);

if (assetPaths.length < 2) {
  fail("expected at least one JavaScript and one CSS asset.");
}

for (const assetPath of assetPaths) {
  if (!existsSync(join(dist, assetPath))) {
    fail(`referenced asset is missing: ${assetPath}`);
  }
}

if (!existsSync(join(dist, "favicon.svg"))) {
  fail("dist/favicon.svg is missing.");
}

if (expectedBuildSha) {
  const javascript = assetPaths
    .filter((assetPath) => assetPath.endsWith(".js"))
    .map((assetPath) => readFileSync(join(dist, assetPath), "utf8"))
    .join("\n");

  if (!javascript.includes(expectedBuildSha)) {
    fail(`compiled JavaScript does not contain expected build SHA ${expectedBuildSha}`);
  }

  if (!javascript.includes("dotagraphBuild")) {
    fail("compiled JavaScript does not expose the DotaGraph build marker.");
  }
}

console.log(
  `Pages artifact OK: ${assetPaths.length} hashed assets verified${expectedBuildSha ? `, build ${expectedBuildSha}` : ""}.`
);
