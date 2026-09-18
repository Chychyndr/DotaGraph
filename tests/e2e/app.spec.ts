import { expect, test } from "@playwright/test";

test("search, focus, matchup and reset flow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "DotaGraph" })).toBeVisible();

  const search = page.getByRole("textbox", { name: "Search for a hero" });
  await search.fill("viper");
  await page.getByRole("option", { name: /Viper/ }).click();

  await expect(page.getByText("Countered by")).toBeVisible();
  await expect(page).toHaveURL(/hero=viper/);

  await page.getByRole("button", { name: /Shadow Demon/ }).last().click();
  await expect(page.getByLabel("Shadow Demon counters Viper")).toBeVisible();
  await expect(page).toHaveURL(/matchup=shadow-demon/);

  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page).not.toHaveURL(/hero=/);
});

test("hero alias search resolves from metadata", async ({ page }) => {
  await page.goto("/");
  const search = page.getByRole("textbox", { name: "Search for a hero" });
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
  const search = page.getByRole("textbox", { name: "Search for a hero" });
  await search.fill("night stalker");
  await page.getByRole("option", { name: /Night Stalker/ }).click();
  await expect(page.getByText("No reliable relationships.")).toBeVisible();
});

test("clicking empty graph space exits the selected hero", async ({ page }) => {
  await page.goto("/?hero=viper");
  await expect(page.getByLabel("Viper counter summary")).toBeVisible();

  const graph = page.getByRole("img", { name: "Interactive graph of Dota 2 hero counter relationships" });
  await graph.click({ position: { x: 24, y: 24 } });

  await expect(page).not.toHaveURL(/hero=/);
  await expect(page.getByLabel("Viper counter summary")).toHaveCount(0);
});

test("dragging pans the graph without clearing the selected hero", async ({ page }) => {
  await page.goto("/?hero=viper");
  const graph = page.getByRole("img", { name: "Interactive graph of Dota 2 hero counter relationships" });
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
  const graph = page.getByRole("img", { name: "Interactive graph of Dota 2 hero counter relationships" });
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

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 }
]) {
  test(`focus state stays usable at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/?hero=viper");
    await expect(page.getByRole("textbox", { name: "Search for a hero" })).toBeVisible();
    await expect(page.getByLabel("Viper counter summary")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset" })).toBeVisible();
  });
}
