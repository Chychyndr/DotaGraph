import { expect, test } from "@playwright/test";

test("every hero Focus state keeps straight spacious relationship geometry", async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/", { waitUntil: "networkidle" });

  const heroIds = await page.locator(".hero-node").evaluateAll(nodes =>
    nodes
      .map(node => node.id.replace("graph-hero-", ""))
      .sort((left, right) => left.localeCompare(right))
  );
  expect(heroIds).toHaveLength(127);

  for (const heroId of heroIds) {
    await page.locator(`#graph-hero-${heroId}`).click();
    await expect(page.locator(`#graph-hero-${heroId}`)).toHaveClass(/hero-selected/);

    const audit = await page.evaluate(() => {
      const issues: string[] = [];
      const graph = document.querySelector<SVGSVGElement>(".graph");
      const card = document.querySelector<HTMLElement>(".context-card");
      if (!graph || !card) return ["missing graph or context card"];

      const graphRect = graph.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();

      const overlap = (left: DOMRect, right: DOMRect, tolerance = 1) =>
        left.left < right.right - tolerance &&
        left.right > right.left + tolerance &&
        left.top < right.bottom - tolerance &&
        left.bottom > right.top + tolerance;

      const distanceToSegment = (
        px: number,
        py: number,
        x1: number,
        y1: number,
        x2: number,
        y2: number
      ) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSquared = dx * dx + dy * dy;
        if (!lengthSquared) return Math.hypot(px - x1, py - y1);

        const t = Math.max(
          0,
          Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared)
        );
        return Math.hypot(
          px - (x1 + dx * t),
          py - (y1 + dy * t)
        );
      };

      const activeNodes = Array.from(
        document.querySelectorAll<SVGGElement>(
          ".hero-node.hero-selected, .hero-node.hero-active"
        )
      ).map(node => {
        const portrait = node.querySelector<SVGCircleElement>(".hero-portrait-node");
        const rect = portrait?.getBoundingClientRect();
        return {
          id: node.id.replace("graph-hero-", ""),
          node,
          rect
        };
      }).filter(
        (entry): entry is {
          id: string;
          node: SVGGElement;
          rect: DOMRect;
        } => Boolean(entry.rect)
      );

      const activeEdges = Array.from(
        document.querySelectorAll<SVGElement>(".edge.edge-active")
      );
      if (activeEdges.length < 1 || activeEdges.length > 10) {
        issues.push(`active edge count=${activeEdges.length}`);
      }

      for (const edge of activeEdges) {
        const source = edge.dataset.sourceHero ?? "unknown";
        const target = edge.dataset.targetHero ?? "unknown";

        if (!(edge instanceof SVGLineElement)) {
          issues.push(`${source}->${target} is not a straight SVG line`);
          continue;
        }

        const matrix = edge.getScreenCTM();
        if (!matrix) {
          issues.push(`${source}->${target} has no screen matrix`);
          continue;
        }

        const start = new DOMPoint(
          edge.x1.baseVal.value,
          edge.y1.baseVal.value
        ).matrixTransform(matrix);
        const end = new DOMPoint(
          edge.x2.baseVal.value,
          edge.y2.baseVal.value
        ).matrixTransform(matrix);

        for (const node of activeNodes) {
          if (node.id === source || node.id === target) continue;
          const centerX = node.rect.left + node.rect.width / 2;
          const centerY = node.rect.top + node.rect.height / 2;
          const radius = Math.min(node.rect.width, node.rect.height) / 2;
          if (
            distanceToSegment(
              centerX,
              centerY,
              start.x,
              start.y,
              end.x,
              end.y
            ) < radius - 1
          ) {
            issues.push(`${source}->${target} crosses active portrait ${node.id}`);
          }
        }

        const badge = document.querySelector<SVGGElement>(
          `.edge-label[data-source-hero="${source}"][data-target-hero="${target}"]`
        );
        if (!badge) {
          issues.push(`${source}->${target} has no win-rate badge`);
          continue;
        }

        if (badge.dataset.labelExternal !== "false") {
          issues.push(`${source}->${target} badge detached from edge`);
        }
        if (Math.abs(Number(badge.dataset.labelT) - 0.52) > 0.001) {
          issues.push(`${source}->${target} badge t=${badge.dataset.labelT}`);
        }

        const badgeRect = badge.getBoundingClientRect();
        const badgeX = badgeRect.left + badgeRect.width / 2;
        const badgeY = badgeRect.top + badgeRect.height / 2;
        if (
          distanceToSegment(
            badgeX,
            badgeY,
            start.x,
            start.y,
            end.x,
            end.y
          ) > 1.5
        ) {
          issues.push(`${source}->${target} badge left its line`);
        }
      }

      const selected = document.querySelector<SVGGElement>(".hero-selected");
      const selectedId = selected?.id.replace("graph-hero-", "") ?? "";

      for (const entry of activeNodes) {
        const label = document.querySelector<SVGGElement>(
          `.hero-label-group[data-hero-label="${entry.id}"]`
        );
        if (!label) {
          issues.push(`${entry.id} has no fixed hero label`);
          continue;
        }

        const labelRect = label.getBoundingClientRect();
        if (overlap(labelRect, cardRect)) {
          issues.push(`${entry.id} label overlaps card`);
        }
        if (
          labelRect.left < graphRect.left - 1 ||
          labelRect.right > graphRect.right + 1 ||
          labelRect.top < graphRect.top - 1 ||
          labelRect.bottom > graphRect.bottom + 1
        ) {
          issues.push(`${entry.id} label leaves graph viewport`);
        }

        if (entry.id === selectedId) {
          if (labelRect.bottom > entry.rect.top - 4) {
            issues.push(`${entry.id} selected label is not fixed above portrait`);
          }
          continue;
        }

        const incoming = activeEdges.some(
          edge =>
            edge.dataset.sourceHero === entry.id &&
            edge.dataset.targetHero === selectedId
        );

        if (incoming) {
          if (labelRect.right > entry.rect.left - 4) {
            issues.push(`${entry.id} incoming label is not fixed left of portrait`);
          }
        } else if (labelRect.left < entry.rect.right + 4) {
          issues.push(`${entry.id} outgoing label is not fixed right of portrait`);
        }
      }

      return [...new Set(issues)].sort();
    });

    expect(audit, heroId).toEqual([]);

    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page.locator(`#graph-hero-${heroId}`)).not.toHaveClass(/hero-selected/);
  }
});
