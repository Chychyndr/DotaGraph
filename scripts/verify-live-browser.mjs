import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const siteUrl = process.env.SITE_URL;
const expectedBuildSha = process.env.EXPECTED_BUILD_SHA;

if (!siteUrl) {
  console.error("Live browser verification failed: SITE_URL is missing.");
  process.exit(1);
}

if (!expectedBuildSha) {
  console.error("Live browser verification failed: EXPECTED_BUILD_SHA is missing.");
  process.exit(1);
}

const attempts = 12;
const retryDelayMs = 5_000;
const outputDir = "artifacts/live-site";
mkdirSync(outputDir, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const browser = await chromium.launch({ headless: true });

let lastFailure;

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    serviceWorkers: "block"
  });
  const page = await context.newPage();

  const pageErrors = [];
  const failedRequests = [];
  const consoleErrors = [];

  page.on("pageerror", (error) => {
    pageErrors.push(error.stack ?? error.message);
  });

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  page.on("requestfailed", (request) => {
    failedRequests.push({
      url: request.url(),
      error: request.failure()?.errorText ?? "unknown"
    });
  });

  try {
    const response = await page.goto(siteUrl, {
      waitUntil: "networkidle",
      timeout: 30_000
    });

    if (!response?.ok()) {
      throw new Error(`document returned HTTP ${response?.status() ?? "unknown"}`);
    }

    const heading = page.getByRole("heading", { name: "DotaGraph" });
    await heading.waitFor({ state: "visible", timeout: 8_000 });

    const result = await page.evaluate(() => ({
      buildSha: document.documentElement.dataset.dotagraphBuild ?? "",
      rootLength: document.querySelector("#root")?.innerHTML.length ?? 0,
      bodyBackground: getComputedStyle(document.body).backgroundColor,
      title: document.title
    }));

    const ownOriginFailures = failedRequests.filter((request) => {
      try {
        return new URL(request.url).origin === new URL(siteUrl).origin;
      } catch {
        return false;
      }
    });

    if (result.buildSha !== expectedBuildSha) {
      throw new Error(
        `stale deployment: expected build ${expectedBuildSha}, received ${result.buildSha || "no build marker"}`
      );
    }

    if (result.rootLength === 0) {
      throw new Error("#root rendered no content");
    }

    if (pageErrors.length) {
      throw new Error(`uncaught page errors: ${pageErrors.join(" | ")}`);
    }

    if (consoleErrors.length) {
      throw new Error(`browser console errors: ${consoleErrors.join(" | ")}`);
    }

    if (ownOriginFailures.length) {
      throw new Error(
        `same-origin requests failed: ${ownOriginFailures.map((request) => `${request.url} (${request.error})`).join(" | ")}`
      );
    }

    await page.screenshot({
      path: `${outputDir}/live-site.png`,
      fullPage: true
    });

    console.log(JSON.stringify({
      siteUrl,
      expectedBuildSha,
      attempt,
      title: result.title,
      buildSha: result.buildSha,
      rootLength: result.rootLength,
      bodyBackground: result.bodyBackground,
      externalRequestFailures: failedRequests.filter(
        (request) => !ownOriginFailures.includes(request)
      )
    }, null, 2));

    console.log(`Live browser verification passed for build ${expectedBuildSha}.`);
    await context.close();
    await browser.close();
    process.exit(0);
  } catch (error) {
    lastFailure = error instanceof Error ? error.message : String(error);

    console.warn(
      `Live browser verification attempt ${attempt}/${attempts} failed: ${lastFailure}`
    );

    if (attempt === attempts) {
      await page.screenshot({
        path: `${outputDir}/live-site-failure.png`,
        fullPage: true
      }).catch(() => {});
    }

    await context.close();

    if (attempt < attempts) {
      await sleep(retryDelayMs);
    }
  }
}

await browser.close();
console.error(
  `Live browser verification failed after ${attempts} attempts: ${lastFailure}`
);
process.exit(1);
