import { chromium } from "@playwright/test";

const siteUrl = process.env.SITE_URL ?? "https://chychyndr.github.io/DotaGraph/";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const consoleMessages = [];
const pageErrors = [];
const failedRequests = [];
const responses = [];

page.on("console", (message) => {
  consoleMessages.push({ type: message.type(), text: message.text() });
});

page.on("pageerror", (error) => {
  pageErrors.push(error.stack ?? error.message);
});

page.on("requestfailed", (request) => {
  failedRequests.push({
    url: request.url(),
    error: request.failure()?.errorText ?? "unknown"
  });
});

page.on("response", (response) => {
  const url = response.url();
  if (
    url === siteUrl ||
    url.includes("/DotaGraph/assets/") ||
    url.includes("steamstatic")
  ) {
    responses.push({
      status: response.status(),
      url,
      contentType: response.headers()["content-type"] ?? ""
    });
  }
});

let navigationError;
try {
  await page.goto(siteUrl, { waitUntil: "networkidle", timeout: 30_000 });
} catch (error) {
  navigationError = error instanceof Error ? error.stack ?? error.message : String(error);
}

await page.screenshot({
  path: "artifacts/live-site-audit.png",
  fullPage: true
});

const title = await page.title();
const rootHtml = await page.locator("#root").innerHTML().catch(() => "");
const rootText = await page.locator("#root").innerText().catch(() => "");
const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor).catch(() => "");
const headingVisible = await page.getByRole("heading", { name: "DotaGraph" }).isVisible().catch(() => false);

console.log(JSON.stringify({
  siteUrl,
  finalUrl: page.url(),
  title,
  headingVisible,
  rootHtmlLength: rootHtml.length,
  rootText: rootText.slice(0, 500),
  bodyBackground: bodyBg,
  navigationError,
  pageErrors,
  failedRequests,
  consoleMessages,
  responses
}, null, 2));

await browser.close();

if (navigationError || pageErrors.length || !headingVisible || rootHtml.length === 0) {
  process.exit(1);
}
