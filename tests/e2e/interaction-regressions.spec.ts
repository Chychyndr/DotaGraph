import { expect, test } from "@playwright/test";

for (const width of [320, 390]) {
  for (const hero of ["viper", "spectre", "dragon-knight", "earthshaker"]) {
    test(`compact ${hero} preserves every displayed percentage at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
      await page.goto(`/?hero=${hero}`);
      await expect(page.locator(".context-card")).toBeVisible();
      const edges = await page.locator(".edge-active").count();
      expect(edges).toBeGreaterThan(0);
      expect(edges).toBeLessThanOrEqual(6);
      await expect(page.locator(".edge-label")).toHaveCount(edges);
      const collisions = await page.evaluate(() => {
        const badges = [...document.querySelectorAll(".edge-label")].map((element) => element.getBoundingClientRect());
        return badges.flatMap((a, index) => badges.slice(index + 1).filter((b) =>
          a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1
        ));
      });
      expect(collisions).toEqual([]);
      expect(await page.locator(".relation-row").count()).toBeGreaterThanOrEqual(edges);
      await page.locator(".relation-row").last().click();
      const neighbor = new URL(page.url()).searchParams.get("matchup");
      await expect(page.locator(`#graph-hero-${neighbor}`)).toHaveClass(/hero-matchup/);
      await expect(page.locator(`.edge-label[data-source-hero="${neighbor}"], .edge-label[data-target-hero="${neighbor}"]`)).toHaveCount(1);
    });
  }
}

test("pinch zoom preserves the selected hero", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?hero=viper");
  await expect(page.locator(".context-card")).toBeVisible();
  const initial = await page.locator(".graph-camera").getAttribute("transform");
  const points = await page.evaluate(() => {
    for (let y = 170; y < 430; y += 20) {
      const left = document.elementFromPoint(100, y);
      const right = document.elementFromPoint(270, y);
      if (left?.closest("svg") && right?.closest("svg") && !left.closest(".hero-node") && !right.closest(".hero-node")) return [{ x: 100, y, id: 1 }, { x: 270, y, id: 2 }];
    }
    throw new Error("No clear graph surface for pinch");
  });
  const session = await page.context().newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: points });
  await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...points[0], x: 70 }, { ...points[1], x: 300 }] });
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.locator(".graph-camera")).not.toHaveAttribute("transform", initial!);
  await expect(page).toHaveURL(/hero=viper/);
  await expect(page.locator(".context-card")).toBeVisible();
});

test("pinch can start on a portrait and a later tap still opens a matchup", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?hero=viper");
  const portrait = page.locator(".hero-selected .hero-portrait-node");
  await expect(portrait).toBeVisible();
  const box = (await portrait.boundingBox())!;
  const initial = await page.locator(".graph-camera").getAttribute("transform");
  const points = [{ x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1 }, { x: 35, y: 170, id: 2 }];
  const session = await page.context().newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: points });
  await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...points[0], x: points[0].x + 25 }, { ...points[1], x: 10 }] });
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.locator(".graph-camera")).not.toHaveAttribute("transform", initial!);
  await expect(page).toHaveURL(/hero=viper/);
  const target = page.locator(".hero-active .hero-portrait-node").first();
  const targetBox = (await target.boundingBox())!;
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: targetBox.x + targetBox.width / 2, y: targetBox.y + targetBox.height / 2, id: 1 }] });
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.locator(".matchup-card")).toBeVisible();
});

test("resizing a selected mobile graph restores the desktop overview camera", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/?hero=viper");
  await expect(page.locator(".context-card")).toBeVisible();
  const overview = await page.locator(".graph-camera").getAttribute("transform");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".graph-camera")).not.toHaveAttribute("transform", overview!);
  await page.setViewportSize({ width: 1366, height: 768 });
  await expect(page.locator(".graph-camera")).toHaveAttribute("transform", overview!);
  await expect(page).toHaveURL(/hero=viper/);
});

test("a mobile direct link restores overview framing when widened", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?hero=viper");
  await expect(page.locator(".context-card")).toBeVisible();
  const reference = await page.context().newPage();
  await reference.setViewportSize({ width: 1366, height: 768 });
  await reference.goto("/");
  await expect(reference.locator(".hero-node")).toHaveCount(127);
  const overview = await reference.locator(".graph-camera").getAttribute("transform");
  await reference.close();
  await page.setViewportSize({ width: 1366, height: 768 });
  await expect(page.locator(".graph-camera")).toHaveAttribute("transform", overview!);
  await expect(page).toHaveURL(/hero=viper/);
});

test("Escape closes search without leaving hero or matchup", async ({ page }) => {
  await page.goto("/?hero=viper");
  await expect(page.locator(".relation-row").first()).toBeVisible();
  const search = page.getByRole("combobox");
  await search.fill("a");
  await search.press("Escape");
  await expect(page).toHaveURL(/hero=viper/);
  await expect(page.locator(".context-card")).toBeVisible();
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await page.locator(".relation-row").first().click();
  const matchupUrl = page.url();
  await search.fill("a");
  await search.press("Escape");
  await expect(page).toHaveURL(matchupUrl);
  await expect(page.locator(".matchup-card")).toBeVisible();
});

test("keyboard search keeps its active option inside the dropdown", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto("/");
  const search = page.getByRole("combobox");
  await search.fill("a");
  const count = await page.getByRole("option").count();
  expect(count).toBeGreaterThan(5);
  for (let i = 0; i < count + 2; i += 1) {
    await search.press("ArrowDown");
    const contained = await page.locator('[role="option"][aria-selected="true"]').evaluate((option) => {
      const item = option.getBoundingClientRect();
      const list = option.parentElement!.getBoundingClientRect();
      return item.top >= list.top - 1 && item.bottom <= list.bottom + 1;
    });
    expect(contained).toBe(true);
  }
  await expect(search).toBeFocused();
});

test("keyboard matchup navigation restores the relationship that opened it", async ({ page }) => {
  await page.goto("/?hero=viper");
  const row = page.locator(".relation-row").first();
  await expect(row).toBeVisible();
  const neighbor = await row.getAttribute("data-neighbor-hero");
  const opener = page.locator(`.relation-row[data-neighbor-hero="${neighbor}"]`);
  await row.focus();
  await row.press("Enter");
  const back = page.getByRole("button", { name: "Hero overview" });
  await expect(back).toBeFocused();
  await back.press("Enter");
  await expect(opener).toBeFocused();
  await opener.press("Enter");
  await expect(back).toBeFocused();
  await back.press("Escape");
  await expect(opener).toBeFocused();
});

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`cards remain usable at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/?hero=viper");
    await expect(page.locator(".context-card")).toBeVisible();
    await page.locator(".relation-row").first().click();
    for (const control of [page.locator(".card-back"), page.locator(".provenance-details summary")]) {
      await control.scrollIntoViewIfNeeded();
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(viewport.width <= 640 ? 44 : 24);
    }
    await page.locator(".provenance-details summary").click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const card = await page.locator(".context-card").boundingBox();
    expect(card!.x).toBeGreaterThanOrEqual(0);
    expect(card!.x + card!.width).toBeLessThanOrEqual(viewport.width);
    expect(card!.y + card!.height).toBeLessThanOrEqual(viewport.height + 1);
  });
}

test("search placeholder has readable normal-text contrast", async ({ page }) => {
  await page.goto("/");
  const colors = await page.getByRole("combobox").evaluate((input) => ({
    text: getComputedStyle(input, "::placeholder").color,
    background: getComputedStyle(input.parentElement!).backgroundColor
  }));
  const luminance = (color: string) => {
    const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((x) => {
      const c = x / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const values = [luminance(colors.text), luminance(colors.background)].sort((a, b) => a - b);
  expect((values[1] + 0.05) / (values[0] + 0.05)).toBeGreaterThanOrEqual(4.5);
});
