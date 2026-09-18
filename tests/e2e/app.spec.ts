import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("search, focus, matchup and reset flow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "DotaGraph" })).toBeVisible();

  const search = page.getByRole("combobox", { name: "Search for a hero" });
  await search.fill("viper");
  await page.getByRole("option", { name: /Viper/ }).click();

  await expect(page.getByText("Countered by")).toBeVisible();
  await expect(page).toHaveURL(/hero=viper/);

  await page.getByRole("button", { name: /Shadow Demon/ }).last().click();
  await expect(page.getByRole("complementary", { name: "Shadow Demon counters Viper" })).toBeVisible();
  await expect(page).toHaveURL(/matchup=shadow-demon/);

  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page).not.toHaveURL(/hero=/);
});

test("overview renders the complete hero roster and search reaches the newest hero", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".hero-node")).toHaveCount(127);

  mkdirSync("artifacts/screenshots", { recursive: true });
  await page.screenshot({ path: "artifacts/screenshots/full-roster-overview.png", fullPage: true });

  const search = page.getByRole("combobox", { name: "Search for a hero" });
  await search.fill("largo");
  await page.getByRole("option", { name: /Largo/ }).click();

  await expect(page).toHaveURL(/hero=largo/);
  await expect(page.getByLabel("Largo counter summary")).toBeVisible();
});

test("focused win-rate labels stay source-anchored and do not overlap", async ({ page }) => {
  await page.goto("/?hero=viper");

  const labels = page.locator(".edge-label");
  await expect(labels).toHaveCount(10);

  const boxes = [];
  for (let index = 0; index < await labels.count(); index += 1) {
    const label = labels.nth(index);
    const t = Number(await label.getAttribute("data-label-t"));
    expect(t).toBeGreaterThanOrEqual(0.2);
    expect(t).toBeLessThanOrEqual(0.62);

    const box = await label.boundingBox();
    expect(box).not.toBeNull();
    boxes.push(box!);
  }

  for (let a = 0; a < boxes.length; a += 1) {
    for (let b = a + 1; b < boxes.length; b += 1) {
      const overlapWidth = Math.min(boxes[a].x + boxes[a].width, boxes[b].x + boxes[b].width)
        - Math.max(boxes[a].x, boxes[b].x);
      const overlapHeight = Math.min(boxes[a].y + boxes[a].height, boxes[b].y + boxes[b].height)
        - Math.max(boxes[a].y, boxes[b].y);

      expect(overlapWidth > 0 && overlapHeight > 0).toBe(false);
    }
  }

  mkdirSync("artifacts/screenshots", { recursive: true });
  await page.screenshot({
    path: "artifacts/screenshots/focus-viper-label-layout.png",
    fullPage: true
  });
});

test("hero artwork loads from one local atlas without Steamstatic requests", async ({ page }) => {
  let atlasResponses = 0;
  let steamstaticRequests = 0;

  page.on("request", (request) => {
    if (request.url().includes("steamstatic.com")) steamstaticRequests += 1;
  });

  page.on("response", (response) => {
    if (response.url().includes("/assets/heroes-atlas.webp")) atlasResponses += 1;
  });

  await page.goto("/");
  await expect(page.locator(".hero-node")).toHaveCount(127);
  await page.waitForLoadState("networkidle");

  expect(steamstaticRequests).toBe(0);
  expect(atlasResponses).toBe(1);
});

test("graph exposes one keyboard tab stop and supports spatial arrow navigation", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("group", { name: "Dota 2 hero counter relationships" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Select / })).toHaveCount(127);

  const tabbableHeroes = page.locator('.hero-node[tabindex="0"]');
  await expect(tabbableHeroes).toHaveCount(1);

  await tabbableHeroes.first().focus();
  const beforeId = await page.evaluate(() => document.activeElement?.id);
  await page.keyboard.press("ArrowRight");
  const afterId = await page.evaluate(() => document.activeElement?.id);

  expect(beforeId).toMatch(/^graph-hero-/);
  expect(afterId).toMatch(/^graph-hero-/);
  expect(afterId).not.toBe(beforeId);
  await expect(tabbableHeroes).toHaveCount(1);
});

test("compact keyboard navigation keeps the focused hero in view", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const graph = page.getByRole("group", { name: "Dota 2 hero counter relationships" });
  const camera = page.locator(".graph-camera");
  const tabbableHero = page.locator('.hero-node[tabindex="0"]');

  await tabbableHero.focus();
  const before = await camera.getAttribute("transform");
  await page.keyboard.press("ArrowRight");
  const after = await camera.getAttribute("transform");

  expect(after).not.toBe(before);

  const focusedBox = await page.locator(":focus").boundingBox();
  const graphBox = await graph.boundingBox();
  expect(focusedBox).not.toBeNull();
  expect(graphBox).not.toBeNull();
  expect(focusedBox!.x).toBeGreaterThanOrEqual(graphBox!.x);
  expect(focusedBox!.x + focusedBox!.width).toBeLessThanOrEqual(graphBox!.x + graphBox!.width);
  expect(focusedBox!.y).toBeGreaterThanOrEqual(graphBox!.y);
  expect(focusedBox!.y + focusedBox!.height).toBeLessThanOrEqual(graphBox!.y + graphBox!.height);
});

test("keyboard search selection moves focus to the selected graph hero", async ({ page }) => {
  await page.goto("/");

  const search = page.getByRole("combobox", { name: "Search for a hero" });
  await search.fill("viper");
  await page.keyboard.press("Enter");

  const selected = page.locator("#graph-hero-viper");
  await expect(selected).toBeFocused();
  await expect(selected).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("status")).toHaveText("Viper selected");
  await expect(page).toHaveURL(/hero=viper/);
});

test("hero alias search resolves from metadata", async ({ page }) => {
  await page.goto("/");
  const search = page.getByRole("combobox", { name: "Search for a hero" });
  await search.fill("pa");
  await page.getByRole("option", { name: /Phantom Assassin/ }).click();
  await expect(page).toHaveURL(/hero=phantom-assassin/);
});

test("direct URL state loads focus without status copy inside the hero card", async ({ page }) => {
  await page.goto("/?hero=viper");
  const card = page.getByLabel("Viper counter summary");
  await expect(card).toBeVisible();
  await expect(card).not.toContainText("Ancient+");
  await expect(card).not.toContainText("Patch");
  await expect(page.getByText("Fixture data", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Hero counters", { exact: true })).toHaveCount(0);
});

test("a direction with no reliable relationships shows an explicit empty state", async ({ page }) => {
  await page.goto("/");
  const search = page.getByRole("combobox", { name: "Search for a hero" });
  await search.fill("night stalker");
  await page.getByRole("option", { name: /Night Stalker/ }).click();
  await expect(page.getByText("No reliable relationships.")).toBeVisible();
});

test("clicking empty graph space exits the selected hero", async ({ page }) => {
  await page.goto("/?hero=viper");
  await expect(page.getByLabel("Viper counter summary")).toBeVisible();

  const graph = page.getByRole("group", { name: "Dota 2 hero counter relationships" });
  await graph.click({ position: { x: 24, y: 24 } });

  await expect(page).not.toHaveURL(/hero=/);
  await expect(page.getByLabel("Viper counter summary")).toHaveCount(0);
});

test("dragging pans the graph without clearing the selected hero", async ({ page }) => {
  await page.goto("/?hero=viper");
  const graph = page.getByRole("group", { name: "Dota 2 hero counter relationships" });
  const camera = page.locator(".graph-camera");
  const box = await graph.boundingBox();
  expect(box).not.toBeNull();

  const before = await camera.getAttribute("transform");
  await page.mouse.move(box!.x + box!.width * 0.82, box!.y + box!.height * 0.25);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * 0.72, box!.y + box!.height * 0.34, { steps: 6 });
  await page.mouse.up();

  const after = await camera.getAttribute("transform");
  expect(after).not.toBe(before);
  await expect(page).toHaveURL(/hero=viper/);
});

test("mouse wheel zooms the graph", async ({ page }) => {
  await page.goto("/");
  const graph = page.getByRole("group", { name: "Dota 2 hero counter relationships" });
  const camera = page.locator(".graph-camera");
  const box = await graph.boundingBox();
  expect(box).not.toBeNull();

  const before = await camera.getAttribute("transform");
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.wheel(0, -320);
  await page.waitForTimeout(40);

  const after = await camera.getAttribute("transform");
  expect(after).not.toBe(before);
});

test("selecting a distant hero moves the camera progressively", async ({ page }) => {
  await page.goto("/");
  const camera = page.locator(".graph-camera");
  const search = page.getByRole("combobox", { name: "Search for a hero" });
  const before = await camera.getAttribute("transform");

  await search.fill("underlord");
  await page.getByRole("option", { name: /Underlord/ }).click();
  await page.waitForTimeout(90);
  const during = await camera.getAttribute("transform");

  await page.waitForTimeout(500);
  const after = await camera.getAttribute("transform");

  expect(during).not.toBe(before);
  expect(after).not.toBe(during);
  await expect(page).toHaveURL(/hero=underlord/);
});

test("site exposes the DotaGraph logo as favicon and header brand", async ({ page }) => {
  await page.goto("/");
  const iconHref = await page.locator('link[rel="icon"]').getAttribute("href");
  expect(iconHref).toMatch(/favicon\.svg$/);

  const logo = page.locator(".brand-logo");
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute("src", /favicon\.svg$/);
});

for (const viewport of [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 }
]) {
  test(`mobile/tablet focus stays inside the viewport at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/?hero=viper");

    const graph = page.getByRole("group", { name: "Dota 2 hero counter relationships" });
    const card = page.getByLabel("Viper counter summary");

    await expect(page.getByRole("combobox", { name: "Search for a hero" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset" })).toBeVisible();
    await expect(graph).toBeVisible();
    await expect(card).toBeVisible();

    const viewportMetrics = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight
    }));

    expect(viewportMetrics.scrollWidth).toBeLessThanOrEqual(viewportMetrics.innerWidth);
    expect(viewportMetrics.scrollHeight).toBeLessThanOrEqual(viewportMetrics.innerHeight);

    const graphBox = await graph.boundingBox();
    const cardBox = await card.boundingBox();
    expect(graphBox).not.toBeNull();
    expect(cardBox).not.toBeNull();
    expect(graphBox!.width).toBeGreaterThan(0);
    expect(graphBox!.height).toBeGreaterThan(0);
    expect(cardBox!.x).toBeGreaterThanOrEqual(0);
    expect(cardBox!.x + cardBox!.width).toBeLessThanOrEqual(viewport.width);
    expect(cardBox!.y + cardBox!.height).toBeLessThanOrEqual(viewport.height + 1);

    if (viewport.width <= 640) {
      await expect(graph).toHaveAttribute("preserveAspectRatio", "xMidYMid slice");

      const selectedNode = page.locator("#graph-hero-viper");
      const selectedBox = await selectedNode.boundingBox();
      expect(selectedBox).not.toBeNull();
      expect(selectedBox!.y + selectedBox!.height).toBeLessThan(cardBox!.y + 4);
    }
  });
}

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 }
]) {
  test(`focus state stays usable at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/?hero=viper");
    await expect(page.getByRole("combobox", { name: "Search for a hero" })).toBeVisible();
    await expect(page.getByLabel("Viper counter summary")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset" })).toBeVisible();
  });
}
