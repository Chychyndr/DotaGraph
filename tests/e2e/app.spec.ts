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

test("direct URL state loads focus", async ({ page }) => {
  await page.goto("/?hero=viper");
  await expect(page.getByLabel("Viper counter summary")).toBeVisible();
});

test("a direction with no reliable fixture relationships shows an explicit empty state", async ({ page }) => {
  await page.goto("/");
  const search = page.getByRole("textbox", { name: "Search for a hero" });
  await search.fill("night stalker");
  await page.getByRole("option", { name: /Night Stalker/ }).click();
  await expect(page.getByText("No reliable fixture relationships.")).toBeVisible();
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
