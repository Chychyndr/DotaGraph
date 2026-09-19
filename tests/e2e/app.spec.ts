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

  const firstRelationship = page.locator(".relation-row").first();
  await expect(firstRelationship).toBeVisible();
  await firstRelationship.click();
  await expect(page.locator(".matchup-card")).toBeVisible();
  await expect(page).toHaveURL(/matchup=/);
  await expect(page.getByText("OpenDota", { exact: true })).toBeVisible();

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

test("hovered hero label renders above every portrait node", async ({ page }) => {
  await page.goto("/");

  const hero = page.locator("#graph-hero-phantom-lancer");
  await hero.hover();

  const label = page.locator('[data-hero-label="phantom-lancer"]');
  await expect(label).toBeVisible();
  await expect(label).toHaveText("Phantom Lancer");

  const layerOrder = await page.evaluate(() => {
    const camera = document.querySelector(".graph-camera");
    const nodes = camera?.querySelector(".nodes");
    const labels = camera?.querySelector(".hero-label-layer");
    if (!camera || !nodes || !labels) return null;

    return {
      nodes: Array.from(camera.children).indexOf(nodes),
      labels: Array.from(camera.children).indexOf(labels)
    };
  });

  expect(layerOrder).not.toBeNull();
  expect(layerOrder!.labels).toBeGreaterThan(layerOrder!.nodes);
});

test("win-rate badges render above every camera edge", async ({ page }) => {
  await page.goto("/?hero=viper");
  await expect(
    page.getByRole("group", { name: "Dota 2 hero counter relationships" })
  ).toBeVisible();
  await expect(page.locator(".edge-label").first()).toBeVisible();

  const order = await page.evaluate(() => {
    const graph = document.querySelector("svg.graph");
    if (!graph) return null;

    const children = Array.from(graph.children);
    const camera = children.find((child) => child.classList.contains("graph-camera"));
    const labels = children.find((child) => child.classList.contains("edge-label-layer"));
    if (!camera || !labels) return null;

    return {
      camera: children.indexOf(camera),
      labels: children.indexOf(labels)
    };
  });

  expect(order).not.toBeNull();
  expect(order!.labels).toBeGreaterThan(order!.camera);
});

test("win-rate badges keep native screen scale after camera zoom", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/?hero=viper");
  await page.waitForTimeout(520);

  const graph = page.getByRole("group", { name: "Dota 2 hero counter relationships" });
  const camera = page.locator(".graph-camera");
  const box = await graph.boundingBox();
  expect(box).not.toBeNull();

  const beforeTransform = await camera.getAttribute("transform");
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.wheel(0, 420);
  await expect.poll(() => camera.getAttribute("transform")).not.toBe(beforeTransform);

  const scales = await page.evaluate(() => {
    const graph = document.querySelector("svg.graph") as SVGSVGElement | null;
    const camera = document.querySelector(".graph-camera") as SVGGElement | null;
    const label = document.querySelector(".edge-label") as SVGGElement | null;
    if (!graph || !camera || !label) return null;

    const graphCtm = graph.getScreenCTM();
    const labelCtm = label.getScreenCTM();
    const cameraTransform = camera.getAttribute("transform") ?? "";
    const cameraScaleMatch = cameraTransform.match(/scale\(([^)]+)\)/);
    if (!graphCtm || !labelCtm || !cameraScaleMatch) return null;

    return {
      graphScale: Math.hypot(graphCtm.a, graphCtm.b),
      labelScale: Math.hypot(labelCtm.a, labelCtm.b),
      cameraScale: Number(cameraScaleMatch[1])
    };
  });

  expect(scales).not.toBeNull();
  expect(scales!.cameraScale).toBeLessThan(1);
  expect(Math.abs(scales!.labelScale - scales!.graphScale)).toBeLessThan(0.01);
});

test("initial overview centers the actual hero bounds", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/");
  const graph = page.getByRole("group", { name: "Dota 2 hero counter relationships" });
  await expect(graph).toBeVisible();

  const graphBox = await graph.boundingBox();
  expect(graphBox).not.toBeNull();

  const heroBounds = await page.locator(".hero-node").evaluateAll(nodes => {
    const boxes = nodes.map(node => (node as SVGGraphicsElement).getBoundingClientRect());
    return {
      left: Math.min(...boxes.map(box => box.left)),
      right: Math.max(...boxes.map(box => box.right)),
      top: Math.min(...boxes.map(box => box.top)),
      bottom: Math.max(...boxes.map(box => box.bottom))
    };
  });

  const graphCenterX = graphBox!.x + graphBox!.width / 2;
  const graphCenterY = graphBox!.y + graphBox!.height / 2;
  const heroesCenterX = (heroBounds.left + heroBounds.right) / 2;
  const heroesCenterY = (heroBounds.top + heroBounds.bottom) / 2;

  expect(Math.abs(heroesCenterX - graphCenterX)).toBeLessThan(8);
  expect(Math.abs(heroesCenterY - graphCenterY)).toBeLessThan(8);
});

test("overview renders a sparse relationship backbone", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("group", { name: "Dota 2 hero counter relationships" })
  ).toBeVisible();

  const edgeCount = await page.locator(".edges .edge").count();
  expect(edgeCount).toBeGreaterThan(0);
  expect(edgeCount).toBeLessThanOrEqual(127);
});

test("focus keeps the same graph and only highlights selected relationships", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".hero-node")).toHaveCount(127);

  const overviewState = await page.evaluate(() => ({
    nodes: [...document.querySelectorAll<SVGGElement>(".hero-node")]
      .map((node) => [node.id, node.getAttribute("transform") ?? ""] as const)
      .sort(([a], [b]) => a.localeCompare(b)),
    edges: [...document.querySelectorAll<SVGLineElement>(".edges .edge")]
      .map((edge) => `${edge.dataset.sourceHero}->${edge.dataset.targetHero}`)
      .sort()
  }));

  const search = page.getByRole("combobox", { name: "Search for a hero" });
  await search.fill("terrorblade");
  await page.getByRole("option", { name: /Terrorblade/ }).click();
  await expect(page.getByLabel("Terrorblade counter summary")).toBeVisible();
  await page.waitForTimeout(520);

  const focusState = await page.evaluate(() => ({
    nodes: [...document.querySelectorAll<SVGGElement>(".hero-node")]
      .map((node) => [node.id, node.getAttribute("transform") ?? ""] as const)
      .sort(([a], [b]) => a.localeCompare(b)),
    edges: [...document.querySelectorAll<SVGLineElement>(".edges .edge")]
      .map((edge) => `${edge.dataset.sourceHero}->${edge.dataset.targetHero}`)
      .sort(),
    activeEdges: document.querySelectorAll(".edge-active").length,
    activeHeroes: document.querySelectorAll(".hero-active").length,
    dimmedHeroes: document.querySelectorAll(".hero-dimmed").length
  }));

  expect(focusState.nodes).toEqual(overviewState.nodes);
  expect(focusState.nodes).toHaveLength(127);
  for (const edge of overviewState.edges) expect(focusState.edges).toContain(edge);
  expect(focusState.activeEdges).toBeGreaterThan(0);
  expect(focusState.activeEdges).toBeLessThanOrEqual(10);
  expect(focusState.activeHeroes).toBeGreaterThan(0);
  expect(focusState.activeHeroes).toBeLessThanOrEqual(10);
  expect(focusState.dimmedHeroes).toBeGreaterThan(0);

  await expect(page.getByLabel("Terrorblade counter summary")).not.toContainText(/\/5/);
});

test("desktop focus keeps hero names clear of the context card", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/?hero=crystal-maiden");
  await page.waitForTimeout(520);

  const overlaps = await page.evaluate(() => {
    const card = document.querySelector<HTMLElement>(".context-card");
    if (!card) return ["missing context card"];
    const cardRect = card.getBoundingClientRect();

    return [...document.querySelectorAll<SVGGElement>(".hero-label-group")]
      .filter((label) => {
        const rect = label.getBoundingClientRect();
        return (
          rect.left < cardRect.right &&
          rect.right > cardRect.left &&
          rect.top < cardRect.bottom &&
          rect.bottom > cardRect.top
        );
      })
      .map((label) => label.dataset.heroLabel ?? "unknown");
  });

  expect(overlaps).toEqual([]);
});

test("focused hero names stay clear of active relationship lines", async ({ page }) => {
  await page.goto("/?hero=crystal-maiden");
  await page.waitForTimeout(520);

  const intersections = await page.evaluate(() => {
    const lines = [...document.querySelectorAll<SVGLineElement>(".edge-active")];

    const transformPoint = (x: number, y: number, matrix: DOMMatrix) => ({
      x: matrix.a * x + matrix.c * y + matrix.e,
      y: matrix.b * x + matrix.d * y + matrix.f
    });

    const segmentIntersectsRect = (
      start: { x: number; y: number },
      end: { x: number; y: number },
      rect: DOMRect
    ) => {
      const left = rect.left + 1;
      const right = rect.right - 1;
      const top = rect.top + 1;
      const bottom = rect.bottom - 1;

      const inside = (point: { x: number; y: number }) =>
        point.x >= left && point.x <= right && point.y >= top && point.y <= bottom;
      if (inside(start) || inside(end)) return true;

      const edges = [
        [{ x: left, y: top }, { x: right, y: top }],
        [{ x: right, y: top }, { x: right, y: bottom }],
        [{ x: right, y: bottom }, { x: left, y: bottom }],
        [{ x: left, y: bottom }, { x: left, y: top }]
      ] as const;

      const cross = (
        a: { x: number; y: number },
        b: { x: number; y: number },
        c: { x: number; y: number }
      ) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

      return edges.some(([a, b]) => {
        const c1 = cross(start, end, a);
        const c2 = cross(start, end, b);
        const c3 = cross(a, b, start);
        const c4 = cross(a, b, end);
        return c1 * c2 <= 0 && c3 * c4 <= 0;
      });
    };

    const result: string[] = [];
    const labels = [...document.querySelectorAll<SVGGElement>(".hero-label-group")];

    for (const line of lines) {
      const matrix = line.getScreenCTM();
      if (!matrix) continue;
      const start = transformPoint(line.x1.baseVal.value, line.y1.baseVal.value, matrix);
      const end = transformPoint(line.x2.baseVal.value, line.y2.baseVal.value, matrix);

      for (const label of labels) {
        const rect = label.getBoundingClientRect();
        if (segmentIntersectsRect(start, end, rect)) {
          result.push(`${line.dataset.sourceHero}->${line.dataset.targetHero} crosses ${label.dataset.heroLabel}`);
        }
      }
    }

    return result;
  });

  expect(intersections).toEqual([]);
});

test("focused win-rate labels stay source-anchored and do not overlap", async ({ page }) => {
  await page.goto("/?hero=viper");

  const labels = page.locator(".edge-label");
  await expect(labels.first()).toBeVisible();
  const labelCount = await labels.count();
  expect(labelCount).toBeGreaterThan(0);
  expect(labelCount).toBeLessThanOrEqual(10);

  const boxes = [];
  for (let index = 0; index < labelCount; index += 1) {
    const label = labels.nth(index);
    const t = Number(await label.getAttribute("data-label-t"));
    expect(t).toBeGreaterThanOrEqual(0.12);
    expect(t).toBeLessThanOrEqual(0.88);

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

test("dense focus keeps win-rate badges on their own lines and clear of portraits", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });

  for (const heroId of ["dragon-knight", "rubick"]) {
    await page.goto(`/?hero=${heroId}`);
    await page.waitForTimeout(520);

    const geometry = await page.evaluate(() => {
      const labels = [...document.querySelectorAll<SVGGElement>(".edge-label")];
      const activePortraits = [
        ...document.querySelectorAll<SVGGraphicsElement>(
          ".hero-selected .hero-portrait-node, .hero-active .hero-portrait-node"
        )
      ];

      const transformPoint = (
        x: number,
        y: number,
        matrix: DOMMatrix
      ) => ({
        x: matrix.a * x + matrix.c * y + matrix.e,
        y: matrix.b * x + matrix.d * y + matrix.f
      });

      const pointToSegmentDistance = (
        point: { x: number; y: number },
        start: { x: number; y: number },
        end: { x: number; y: number }
      ) => {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const lengthSquared = dx * dx + dy * dy;
        if (lengthSquared <= 1e-9) return Math.hypot(point.x - start.x, point.y - start.y);

        const t = Math.max(
          0,
          Math.min(
            1,
            ((point.x - start.x) * dx + (point.y - start.y) * dy) /
              lengthSquared
          )
        );
        return Math.hypot(
          point.x - (start.x + dx * t),
          point.y - (start.y + dy * t)
        );
      };

      const rows = labels.map(label => {
        const source = label.dataset.sourceHero ?? "";
        const target = label.dataset.targetHero ?? "";
        const line = document.querySelector<SVGLineElement>(
          `.edge[data-source-hero="${source}"][data-target-hero="${target}"]`
        );
        const labelMatrix = label.getScreenCTM();
        const lineMatrix = line?.getScreenCTM();
        if (!line || !labelMatrix || !lineMatrix) return null;

        const start = transformPoint(line.x1.baseVal.value, line.y1.baseVal.value, lineMatrix);
        const end = transformPoint(line.x2.baseVal.value, line.y2.baseVal.value, lineMatrix);
        const center = transformPoint(0, 0, labelMatrix);
        const badge = label.getBoundingClientRect();

        const overlapsPortrait = activePortraits.some(portrait => {
          const box = portrait.getBoundingClientRect();
          return (
            badge.left < box.right &&
            badge.right > box.left &&
            badge.top < box.bottom &&
            badge.bottom > box.top
          );
        });

        return {
          source,
          target,
          offset: Number(label.dataset.labelOffset),
          distanceToLine: pointToSegmentDistance(center, start, end),
          overlapsPortrait
        };
      }).filter((row): row is NonNullable<typeof row> => row !== null);

      return { rows };
    });

    expect(geometry.rows.length).toBeGreaterThan(0);
    for (const row of geometry.rows) {
      expect(row.offset).toBe(0);
      expect(row.distanceToLine).toBeLessThan(1.25);
      expect(row.overlapsPortrait).toBe(false);
    }
  }
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

test("portrait atlas failure keeps the graph usable with text fallbacks", async ({ page }) => {
  await page.route("**/assets/heroes-atlas.webp*", (route) => route.abort());

  await page.goto("/");

  await expect(page.getByText("Hero portraits are unavailable.")).toBeVisible();
  await expect(page.locator(".hero-node")).toHaveCount(127);
  await expect(page.locator(".hero-node-fallback-text")).toHaveCount(127);

  const search = page.getByRole("combobox", { name: "Search for a hero" });
  await search.fill("viper");
  await page.getByRole("option", { name: /Viper/ }).click();

  await expect(page.getByLabel("Viper counter summary")).toBeVisible();
  await expect(page.locator('.hero-portrait[data-portrait-status="failed"]')).not.toHaveCount(0);
});

test("graph exposes one keyboard tab stop and supports spatial arrow navigation", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("group", { name: "Dota 2 hero counter relationships" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Select / })).toHaveCount(127);

  const tabbableHeroes = page.locator('.hero-node[tabindex="0"]');
  await expect(tabbableHeroes).toHaveCount(1);

  await tabbableHeroes.first().focus();
  const beforeId = await page.evaluate(() => document.activeElement?.id);
  expect(beforeId).toMatch(/^graph-hero-/);

  const direction = await page.evaluate((currentId) => {
    const current = document.getElementById(currentId ?? "");
    if (!current) return null;

    const currentBox = current.getBoundingClientRect();
    const currentX = currentBox.left + currentBox.width / 2;
    const currentY = currentBox.top + currentBox.height / 2;
    const candidates = [...document.querySelectorAll<SVGGElement>(".hero-node")]
      .filter(node => node.id !== currentId)
      .map(node => {
        const box = node.getBoundingClientRect();
        const dx = box.left + box.width / 2 - currentX;
        const dy = box.top + box.height / 2 - currentY;
        return { dx, dy, distance: Math.hypot(dx, dy) };
      })
      .sort((a, b) => a.distance - b.distance);

    const nearest = candidates[0];
    if (!nearest) return null;
    if (Math.abs(nearest.dx) >= Math.abs(nearest.dy)) {
      return nearest.dx >= 0 ? "ArrowRight" : "ArrowLeft";
    }
    return nearest.dy >= 0 ? "ArrowDown" : "ArrowUp";
  }, beforeId);

  expect(direction).not.toBeNull();
  await page.keyboard.press(direction!);

  await expect
    .poll(() => page.evaluate(() => document.activeElement?.id))
    .not.toBe(beforeId);

  const afterId = await page.evaluate(() => document.activeElement?.id);
  expect(afterId).toMatch(/^graph-hero-/);
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

test("matchup details expose real production source and sample size", async ({ page }) => {
  await page.goto("/?hero=viper");

  const firstRelationship = page.locator(".relation-row").first();
  await expect(firstRelationship).toBeVisible();
  await firstRelationship.click();

  const card = page.locator(".matchup-card");
  await expect(card).toBeVisible();
  await expect(card).toContainText("OpenDota");
  await expect(card).toContainText("Matches");
  await expect(card).toContainText("Matchup advantage");
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
  await page.waitForTimeout(520);

  const box = await graph.boundingBox();
  expect(box).not.toBeNull();

  const start = await page.evaluate(({ left, top, width, height }) => {
    const candidates = [
      [0.08, 0.08],
      [0.92, 0.08],
      [0.92, 0.92],
      [0.08, 0.92]
    ];

    for (const [xRatio, yRatio] of candidates) {
      const x = left + width * xRatio;
      const y = top + height * yRatio;
      const element = document.elementFromPoint(x, y);
      if (!element?.closest(".hero-node")) return { x, y };
    }

    return { x: left + 24, y: top + 24 };
  }, {
    left: box!.x,
    top: box!.y,
    width: box!.width,
    height: box!.height
  });

  const before = await camera.getAttribute("transform");
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x - 90, start.y + 70, { steps: 6 });
  await page.mouse.up();

  await expect
    .poll(() => camera.getAttribute("transform"))
    .not.toBe(before);
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

  await expect
    .poll(() => camera.getAttribute("transform"))
    .not.toBe(before);
});

test("desktop hero selection keeps the overview camera stable", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/");

  const camera = page.locator(".graph-camera");
  const search = page.getByRole("combobox", { name: "Search for a hero" });
  const before = await camera.getAttribute("transform");

  await search.fill("underlord");
  await page.getByRole("option", { name: /Underlord/ }).click();
  await page.waitForTimeout(520);

  expect(await camera.getAttribute("transform")).toBe(before);
  await expect(page).toHaveURL(/hero=underlord/);

  const activeHeroes = page.locator(".hero-active");
  const activeCount = await activeHeroes.count();
  expect(activeCount).toBeGreaterThan(0);
  expect(activeCount).toBeLessThanOrEqual(10);
});

test("reduced-motion desktop selection also keeps the same camera", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/");

  const camera = page.locator(".graph-camera");
  const before = await camera.getAttribute("transform");

  const search = page.getByRole("combobox", { name: "Search for a hero" });
  await search.fill("underlord");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(30);

  expect(await camera.getAttribute("transform")).toBe(before);
});

test("site exposes the DotaGraph logo as favicon and header brand", async ({ page }) => {
  await page.goto("/");
  const iconHref = await page.locator('link[rel="icon"]').getAttribute("href");
  expect(iconHref).toMatch(/favicon\.svg$/);

  const logo = page.locator(".brand-logo");
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute("src", /favicon\.svg$/);
});

test("hero search results stay contained at the minimum supported width", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");

  const search = page.getByRole("combobox", { name: "Search for a hero" });
  await search.fill("a");

  const results = page.getByRole("listbox", { name: "Hero search results" });
  await expect(results).toBeVisible();

  const box = await results.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  expect(box!.y + box!.height).toBeLessThanOrEqual(568);

  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth);
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
