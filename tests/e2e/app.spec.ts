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
  await expect(
    page.locator(".matchup-meta").getByText("OpenDota", { exact: true })
  ).toBeVisible();

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

test("focus layers keep edges behind badges, portraits, and hero names", async ({ page }) => {
  await page.goto("/?hero=viper");
  await expect(page.locator(".edge-label").first()).toBeVisible();

  const order = await page.evaluate(() => {
    const camera = document.querySelector(".graph-camera");
    if (!camera) return null;

    const children = Array.from(camera.children);
    const edges = children.find((child) => child.classList.contains("edges"));
    const badges = children.find((child) => child.classList.contains("edge-label-layer"));
    const nodes = children.find((child) => child.classList.contains("nodes"));
    const names = children.find((child) => child.classList.contains("hero-label-layer"));
    if (!edges || !badges || !nodes || !names) return null;

    return {
      edges: children.indexOf(edges),
      badges: children.indexOf(badges),
      nodes: children.indexOf(nodes),
      names: children.indexOf(names)
    };
  });

  expect(order).not.toBeNull();
  expect(order!.badges).toBeGreaterThan(order!.edges);
  expect(order!.nodes).toBeGreaterThan(order!.badges);
  expect(order!.names).toBeGreaterThan(order!.nodes);
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
    const localLabelScale = Number(label.dataset.labelScale ?? "1");
    if (!graphCtm || !labelCtm || !cameraScaleMatch || !Number.isFinite(localLabelScale)) {
      return null;
    }

    return {
      graphScale: Math.hypot(graphCtm.a, graphCtm.b),
      labelScale: Math.hypot(labelCtm.a, labelCtm.b),
      localLabelScale,
      cameraScale: Number(cameraScaleMatch[1])
    };
  });

  expect(scales).not.toBeNull();
  expect(scales!.cameraScale).toBeLessThan(1);
  expect(
    Math.abs(scales!.labelScale - scales!.graphScale * scales!.localLabelScale)
  ).toBeLessThan(0.01);
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

test("hover reveals local relationships without moving or replacing the overview graph", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".hero-node")).toHaveCount(127);

  const before = await page.locator(".hero-node").evaluateAll(nodes =>
    nodes
      .map(node => [node.id, node.getAttribute("transform") ?? ""] as const)
      .sort(([a], [b]) => a.localeCompare(b))
  );

  await page.locator("#graph-hero-viper").hover();
  await page.waitForTimeout(180);

  const after = await page.locator(".hero-node").evaluateAll(nodes =>
    nodes
      .map(node => [node.id, node.getAttribute("transform") ?? ""] as const)
      .sort(([a], [b]) => a.localeCompare(b))
  );

  expect(after).toEqual(before);
  expect(await page.locator(".edge-hover").count()).toBeGreaterThan(0);
  expect(await page.locator(".edge-hover").count()).toBeLessThanOrEqual(5);
  await expect(page.locator(".context-card")).toHaveCount(0);
  await expect(page.locator('[data-hero-label="viper"]')).toBeVisible();
});

test("focus keeps the same graph and only highlights selected relationships", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".hero-node")).toHaveCount(127);

  const overviewState = await page.evaluate(() => ({
    nodes: [...document.querySelectorAll<SVGGElement>(".hero-node")]
      .map((node) => [node.id, node.getAttribute("transform") ?? ""] as const)
      .sort(([a], [b]) => a.localeCompare(b)),
    edges: [...document.querySelectorAll<SVGElement>(".edges .edge")]
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

test("desktop focus keeps fixed hero names inside the graph viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });

  for (const heroId of [
    "crystal-maiden",
    "dragon-knight",
    "rubick",
    "terrorblade",
    "dark-willow",
    "spectre"
  ]) {
    await page.goto(`/?hero=${heroId}`);
    await page.waitForTimeout(520);

    const geometry = await page.evaluate(() => {
      const card = document.querySelector<HTMLElement>(".context-card");
      const graph = document.querySelector<SVGSVGElement>(".graph");
      if (!card || !graph) {
        return {
          cardOverlaps: ["missing card or graph"],
          outsideViewport: ["missing card or graph"]
        };
      }

      const cardRect = card.getBoundingClientRect();
      const graphRect = graph.getBoundingClientRect();
      const labels = [...document.querySelectorAll<SVGGElement>(".hero-label-group")];

      const cardOverlaps = labels
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

      const outsideViewport = labels
        .filter((label) => {
          const rect = label.getBoundingClientRect();
          return (
            rect.left < graphRect.left - 1 ||
            rect.right > graphRect.right + 1 ||
            rect.top < graphRect.top - 1 ||
            rect.bottom > graphRect.bottom + 1
          );
        })
        .map((label) => label.dataset.heroLabel ?? "unknown");

      return { cardOverlaps, outsideViewport };
    });

    expect(geometry.outsideViewport, heroId).toEqual([]);
  }
});

test("focused hero names stay clear of their unchanged portraits", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/?hero=crystal-maiden");
  await page.waitForTimeout(120);

  const geometry = await page.evaluate(() => {
    const rows = [...document.querySelectorAll<SVGGElement>(".hero-label-group")]
      .map((label) => {
        const heroId = label.dataset.heroLabel ?? "";
        const node = document.querySelector<SVGGElement>(`#graph-hero-${heroId}`);
        const portrait = node?.querySelector<SVGCircleElement>(".hero-portrait-node");
        if (!node || !portrait) return null;

        const labelRect = label.getBoundingClientRect();
        const portraitRect = portrait.getBoundingClientRect();
        const overlapX =
          labelRect.left < portraitRect.right &&
          labelRect.right > portraitRect.left;
        const overlapY =
          labelRect.top < portraitRect.bottom &&
          labelRect.bottom > portraitRect.top;
        const labelCenterX = (labelRect.left + labelRect.right) / 2;
        const labelCenterY = (labelRect.top + labelRect.bottom) / 2;
        const portraitCenterX = (portraitRect.left + portraitRect.right) / 2;
        const portraitCenterY = (portraitRect.top + portraitRect.bottom) / 2;

        return {
          heroId,
          selected: node.classList.contains("hero-selected"),
          active: node.classList.contains("hero-active"),
          overlapsPortrait: overlapX && overlapY,
          centerDistance: Math.hypot(
            labelCenterX - portraitCenterX,
            labelCenterY - portraitCenterY
          )
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    return rows;
  });

  expect(geometry.length).toBeGreaterThan(0);
  for (const row of geometry) {
    expect(row.selected || row.active, row.heroId).toBe(true);
    expect(row.overlapsPortrait, row.heroId).toBe(false);
    expect(row.centerDistance, row.heroId).toBeLessThan(180);
  }
});

test("focused win-rate labels stay source-anchored and do not overlap", async ({ page }) => {
  await page.goto("/?hero=viper");
  await page.waitForTimeout(520);

  const labels = page.locator(".edge-label");
  await expect(labels.first()).toBeVisible();
  const labelCount = await labels.count();
  expect(labelCount).toBeGreaterThan(0);
  expect(labelCount).toBeLessThanOrEqual(10);

  const boxes: Array<{
    source: string;
    target: string;
    text: string;
    t: number;
    scale: number;
    external: boolean;
    box: { x: number; y: number; width: number; height: number };
  }> = [];
  for (let index = 0; index < labelCount; index += 1) {
    const label = labels.nth(index);
    const t = Number(await label.getAttribute("data-label-t"));
    const external = await label.getAttribute("data-label-external");
    const entry = label.locator("xpath=..");
    const leader = entry.locator(".edge-label-leader");

    expect(Number.isFinite(t)).toBe(true);
    expect(external).toBe("false");
    await expect(leader).toHaveCount(0);
    expect(t).toBeGreaterThanOrEqual(0.16);
    expect(t).toBeLessThanOrEqual(0.84);
    expect(Math.abs((t - 0.16) / 0.04 - Math.round((t - 0.16) / 0.04)))
      .toBeLessThan(0.01);

    const box = await label.boundingBox();
    expect(box).not.toBeNull();
    boxes.push({
      source: await label.getAttribute("data-source-hero") ?? "unknown",
      target: await label.getAttribute("data-target-hero") ?? "unknown",
      text: (await label.textContent())?.trim() ?? "",
      t,
      scale: Number(await label.getAttribute("data-label-scale")),
      external: external === "true",
      box: box!
    });
  }

  for (let a = 0; a < boxes.length; a += 1) {
    for (let b = a + 1; b < boxes.length; b += 1) {
      const first = boxes[a];
      const second = boxes[b];
      const overlapWidth = Math.min(
        first.box.x + first.box.width,
        second.box.x + second.box.width
      ) - Math.max(first.box.x, second.box.x);
      const overlapHeight = Math.min(
        first.box.y + first.box.height,
        second.box.y + second.box.height
      ) - Math.max(first.box.y, second.box.y);

      expect(
        overlapWidth > 0 && overlapHeight > 0,
        `${first.source}->${first.target} (${first.text}, t=${first.t.toFixed(3)}, scale=${first.scale.toFixed(2)}, external=${first.external}, box=${JSON.stringify(first.box)}) overlaps ` +
          `${second.source}->${second.target} (${second.text}, t=${second.t.toFixed(3)}, scale=${second.scale.toFixed(2)}, external=${second.external}, box=${JSON.stringify(second.box)})`
      ).toBe(false);
    }
  }

  mkdirSync("artifacts/screenshots", { recursive: true });
  await page.screenshot({
    path: "artifacts/screenshots/focus-viper-label-layout.png",
    fullPage: true
  });
});

test("focus win-rate badges stay attached to rendered relationship paths", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });

  for (const heroId of [
    "dragon-knight",
    "rubick",
    "ancient-apparition",
    "spirit-breaker",
    "chen"
  ]) {
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

      const pointToLineDistance = (
        point: { x: number; y: number },
        start: { x: number; y: number },
        end: { x: number; y: number }
      ) => {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.hypot(dx, dy);
        if (length <= 1e-9) return Math.hypot(point.x - start.x, point.y - start.y);

        return Math.abs(
          dx * (start.y - point.y) -
          (start.x - point.x) * dy
        ) / length;
      };

      const pointToSegmentDistance = (
        point: { x: number; y: number },
        start: { x: number; y: number },
        end: { x: number; y: number }
      ) => {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const lengthSquared = dx * dx + dy * dy;
        if (lengthSquared <= 1e-9) {
          return Math.hypot(point.x - start.x, point.y - start.y);
        }

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
        const edge = document.querySelector<SVGElement>(
          `.edge.edge-active[data-source-hero="${source}"][data-target-hero="${target}"]`
        );
        const labelMatrix = label.getScreenCTM();
        const edgeMatrix = edge?.getScreenCTM();
        if (!edge || !labelMatrix || !edgeMatrix) return null;

        const localPoints: Array<{ x: number; y: number }> = [];
        if (edge instanceof SVGLineElement) {
          localPoints.push(
            { x: edge.x1.baseVal.value, y: edge.y1.baseVal.value },
            { x: edge.x2.baseVal.value, y: edge.y2.baseVal.value }
          );
        } else if (edge instanceof SVGPolylineElement) {
          for (let index = 0; index < edge.points.numberOfItems; index += 1) {
            const point = edge.points.getItem(index);
            localPoints.push({ x: point.x, y: point.y });
          }
        }

        if (localPoints.length < 2) return null;

        const screenPoints = localPoints.map((point) =>
          transformPoint(point.x, point.y, edgeMatrix)
        );
        const center = transformPoint(0, 0, labelMatrix);
        const distanceToRoute = Math.min(
          ...screenPoints
            .slice(1)
            .map((point, index) =>
              pointToSegmentDistance(center, screenPoints[index], point)
            )
        );
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

        const external = label.dataset.labelExternal === "true";
        const labelT = Number(label.dataset.labelT);
        const leader = label
          .closest(".edge-label-entry")
          ?.querySelector<SVGLineElement>(".edge-label-leader");
        const leaderMatrix = leader?.getScreenCTM();
        let leaderLength = 0;
        let leaderLineDistance = 0;

        if (leader && leaderMatrix) {
          const leaderStart = transformPoint(
            leader.x1.baseVal.value,
            leader.y1.baseVal.value,
            leaderMatrix
          );
          const leaderEnd = transformPoint(
            leader.x2.baseVal.value,
            leader.y2.baseVal.value,
            leaderMatrix
          );
          const continuationStart = labelT > 1
            ? screenPoints[screenPoints.length - 2]
            : screenPoints[0];
          const continuationEnd = labelT > 1
            ? screenPoints[screenPoints.length - 1]
            : screenPoints[1];

          leaderLength = Math.hypot(
            leaderEnd.x - leaderStart.x,
            leaderEnd.y - leaderStart.y
          );
          leaderLineDistance = Math.max(
            pointToLineDistance(
              leaderStart,
              continuationStart,
              continuationEnd
            ),
            pointToLineDistance(
              leaderEnd,
              continuationStart,
              continuationEnd
            )
          );
        }

        return {
          source,
          target,
          t: labelT,
          offset: Number(label.dataset.labelOffset),
          external,
          leaderExists: Boolean(leader),
          leaderLength,
          leaderLineDistance,
          distanceToRoute,
          overlapsPortrait
        };
      }).filter((row): row is NonNullable<typeof row> => row !== null);

      return { rows };
    });

    expect(geometry.rows.length).toBeGreaterThan(0);
    for (const row of geometry.rows) {
      expect(row.offset).toBe(0);
      expect(row.external, `${heroId}: ${row.source}->${row.target}`).toBe(false);
      expect(row.leaderExists).toBe(false);
      expect(row.t).toBeGreaterThanOrEqual(0.16);
      expect(row.t).toBeLessThanOrEqual(0.84);
      expect(
        Math.abs(
          (row.t - 0.16) / 0.04 -
            Math.round((row.t - 0.16) / 0.04)
        )
      ).toBeLessThan(0.01);
      expect(
        row.distanceToRoute,
        `${heroId}: ${row.source}->${row.target}`
      ).toBeLessThan(1.25);
    }
  }
});

test("mobile Focus uses compact win-rate badges", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?hero=viper", { waitUntil: "networkidle" });
  await page.waitForTimeout(520);

  const geometry = await page.locator(".edge-label").evaluateAll((labels) =>
    labels.map((label) => {
      const box = label.getBoundingClientRect();
      return {
        width: box.width,
        height: box.height,
        scale: Number((label as SVGGElement).dataset.labelScale)
      };
    })
  );

  expect(geometry.length).toBeGreaterThan(0);
  for (const badge of geometry) {
    expect(badge.width).toBeLessThanOrEqual(38.5);
    expect(badge.height).toBeLessThanOrEqual(15.5);
    expect(badge.scale).toBeLessThanOrEqual(0.8);
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
  await expect(page.locator('.sr-only[role="status"]')).toHaveText("Viper selected");
  await expect(page).toHaveURL(/hero=viper/);
});

test("hero alias search resolves from metadata", async ({ page }) => {
  await page.goto("/");
  const search = page.getByRole("combobox", { name: "Search for a hero" });
  await search.fill("pa");
  await page.getByRole("option", { name: /Phantom Assassin/ }).click();
  await expect(page).toHaveURL(/hero=phantom-assassin/);
});

test("lore alias search resolves to the correct hero", async ({ page }) => {
  await page.goto("/");
  const search = page.getByRole("combobox", { name: "Search for a hero" });
  await search.fill("rylai");
  await page.getByRole("option", { name: /Crystal Maiden/ }).click();
  await expect(page).toHaveURL(/hero=crystal-maiden/);
});

test("search result portraits stay square instead of stretching with the row", async ({ page }) => {
  await page.setViewportSize({ width: 432, height: 490 });
  await page.goto("/");

  const search = page.getByRole("combobox", { name: "Search for a hero" });
  await search.fill("sh");

  const results = page.getByRole("listbox", { name: "Hero search results" });
  await expect(results).toBeVisible();
  await expect(results.getByRole("option").first()).toBeVisible();

  const geometry = await page.evaluate(() => {
    const list = document.querySelector<HTMLElement>(".search-results");
    const portraits = [...document.querySelectorAll<HTMLElement>(".search-result .hero-portrait")];
    const rows = [...document.querySelectorAll<HTMLElement>(".search-result")];

    return {
      list: list?.getBoundingClientRect().toJSON() ?? null,
      portraits: portraits.map((portrait) => portrait.getBoundingClientRect().toJSON()),
      rows: rows.map((row) => row.getBoundingClientRect().toJSON())
    };
  });

  expect(geometry.list).not.toBeNull();
  expect(geometry.portraits.length).toBeGreaterThan(0);
  for (const portrait of geometry.portraits) {
    expect(portrait.width).toBeCloseTo(28, 1);
    expect(portrait.height).toBeCloseTo(28, 1);
    expect(Math.abs(portrait.width - portrait.height)).toBeLessThan(0.5);
  }

  for (const row of geometry.rows) {
    expect(row.left).toBeGreaterThanOrEqual(geometry.list!.left);
    expect(row.right).toBeLessThanOrEqual(geometry.list!.right);
  }
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

test("matchup source details expose production provenance on demand", async ({ page }) => {
  await page.goto("/?hero=viper");

  const firstRelationship = page.locator(".relation-row").first();
  await expect(firstRelationship).toBeVisible();
  await firstRelationship.click();

  const details = page.locator(".provenance-details");
  const summary = details.getByText("Source details", { exact: true });

  await expect(details).toBeVisible();
  await expect(details).not.toHaveAttribute("open", "");
  await summary.click();
  await expect(details).toHaveAttribute("open", "");

  const sourceLink = details.getByRole("link", { name: "OpenDota" });
  await expect(sourceLink).toHaveAttribute("href", "https://www.opendota.com/");
  await expect(details).toContainText("public matches");
  await expect(details).toContainText("/api/explorer");
  await expect(details).toContainText("Observed");
  await expect(details).toContainText("Generated");
});

test("matchup details keep Immortal evidence separate from the headline", async ({ page }) => {
  await page.route("**/data/current-matchups.json", async (route) => {
    const response = await route.fetch();
    const payload = (await response.json()) as {
      patch: string;
      generatedAt: string;
      scope: {
        observationWindowStart: string;
        observationWindowEndExclusive: string;
      };
      relationships: Array<{
        sourceSlug: string;
        targetSlug: string;
        sourceWinRate: number;
        sampleSize: number;
      }>;
      evidenceObservations?: unknown[];
    };

    payload.evidenceObservations = payload.relationships.map(
      (relationship, index) => ({
        id: `test-immortal-${index}`,
        provider: "OpenDota",
        sourceSlug: relationship.sourceSlug,
        targetSlug: relationship.targetSlug,
        sourceWinRate: Math.min(1, relationship.sourceWinRate + 0.01),
        sampleSize: Math.max(1, Math.floor(relationship.sampleSize / 4)),
        scope: {
          patch: payload.patch,
          rankScope: "immortal",
          matchPopulation: "ranked_all_draft_5v5",
          observationWindowStart: payload.scope.observationWindowStart,
          observationWindowEndExclusive:
            payload.scope.observationWindowEndExclusive
        },
        provenance: {
          sourceUrl: "https://www.opendota.com/",
          queryScope: "public_matches:avg_rank_tier>=80:game_mode=22:lobby_type=7",
          collectedAt: payload.generatedAt
        }
      })
    );

    payload.evidenceObservations = [
      ...(payload.evidenceObservations ?? []),
      ...payload.relationships.map((relationship, index) => ({
        id: `test-ancient-secondary-${index}`,
        provider: "STRATZ",
        sourceSlug: relationship.sourceSlug,
        targetSlug: relationship.targetSlug,
        sourceWinRate: relationship.sourceWinRate,
        sampleSize: relationship.sampleSize,
        scope: {
          patch: payload.patch,
          rankScope: "ancient_plus",
          matchPopulation: "ranked_all_draft_5v5",
          observationWindowStart: payload.scope.observationWindowStart,
          observationWindowEndExclusive:
            payload.scope.observationWindowEndExclusive
        },
        provenance: {
          sourceUrl: "https://stratz.com/",
          queryScope: "test-compatible-ancient-plus",
          collectedAt: payload.generatedAt
        }
      }))
    ];

    await route.fulfill({ response, json: payload });
  });

  await page.goto("/?hero=viper");

  const firstRelationship = page.locator(".relation-row").first();
  await expect(firstRelationship).toBeVisible();
  await firstRelationship.click();

  const details = page.locator(".population-evidence-details");
  await expect(details).toBeVisible();
  await expect(details).not.toHaveAttribute("open", "");
  await details.getByText("Immortal / pro evidence", { exact: true }).click();

  await expect(details).toHaveAttribute("open", "");
  await expect(details).toContainText("Immortal");
  await expect(details.getByRole("link", { name: "OpenDota" })).toHaveAttribute(
    "href",
    "https://www.opendota.com/"
  );
  await expect(details).toContainText(
    "Separate population; excluded from the Ancient+ headline and cross-source consensus."
  );
  await expect(details.getByText("STRATZ", { exact: true })).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await details.scrollIntoViewIfNeeded();

  const mobileTypography = await details.evaluate((element) => {
    const metadataTerm = element.querySelector(".population-evidence-meta dt");
    const metadataValue = element.querySelector(".population-evidence-meta dd");
    const note = element.querySelector(".population-evidence-note");
    if (!metadataTerm || !metadataValue || !note) return null;

    return {
      term: Number.parseFloat(getComputedStyle(metadataTerm).fontSize),
      value: Number.parseFloat(getComputedStyle(metadataValue).fontSize),
      note: Number.parseFloat(getComputedStyle(note).fontSize)
    };
  });

  expect(mobileTypography).not.toBeNull();
  expect(mobileTypography!.term).toBeGreaterThanOrEqual(10);
  expect(mobileTypography!.value).toBeGreaterThanOrEqual(10);
  expect(mobileTypography!.note).toBeGreaterThanOrEqual(11);
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

test("desktop hero selection keeps the global camera and node positions unchanged", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/");

  const camera = page.locator(".graph-camera");
  const selectedNode = page.locator("#graph-hero-underlord");
  const beforeCamera = await camera.getAttribute("transform");
  const beforeNode = await selectedNode.getAttribute("transform");

  const search = page.getByRole("combobox", { name: "Search for a hero" });
  await search.fill("underlord");
  await page.getByRole("option", { name: /Underlord/ }).click();
  await page.waitForTimeout(120);

  expect(await camera.getAttribute("transform")).toBe(beforeCamera);
  expect(await selectedNode.getAttribute("transform")).toBe(beforeNode);
  await expect(selectedNode).toHaveClass(/hero-selected/);
  await expect(page).toHaveURL(/hero=underlord/);
});

test("reduced-motion desktop selection also preserves the global camera", async ({ page }) => {
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

      await expect.poll(() =>
        graph.evaluate((element) => {
          const graphRect = element.getBoundingClientRect();
          const tolerance = 1;

          return Array.from(element.querySelectorAll<SVGGElement>(".edge-label"))
            .flatMap((label) => {
              const rect = label.getBoundingClientRect();
              const clipped =
                rect.left < graphRect.left - tolerance ||
                rect.right > graphRect.right + tolerance ||
                rect.top < graphRect.top - tolerance ||
                rect.bottom > graphRect.bottom + tolerance;

              return clipped
                ? [`${label.dataset.sourceHero}->${label.dataset.targetHero}`]
                : [];
            });
        })
      ).toEqual([]);
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
