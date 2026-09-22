import { expect, test } from "@playwright/test";

interface VisualCollisionAudit {
  badgeHeroLabel: string[];
  activeEdgeForeignPortrait: string[];
  badgeDimmedPortrait: string[];
}

const scanVisualCollisions = async (page: import("@playwright/test").Page) =>
  page.evaluate<VisualCollisionAudit>(() => {
    const overlap = (a: DOMRect, b: DOMRect, tolerance = 1) =>
      a.left < b.right - tolerance &&
      a.right > b.left + tolerance &&
      a.top < b.bottom - tolerance &&
      a.bottom > b.top + tolerance;

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
      const x = x1 + dx * t;
      const y = y1 + dy * t;
      return Math.hypot(px - x, py - y);
    };

    const badgeHeroLabel: string[] = [];
    const badges = Array.from(
      document.querySelectorAll<SVGGElement>(".edge-label")
    );
    const heroLabels = Array.from(
      document.querySelectorAll<SVGGElement>(".hero-label-group")
    );

    for (const badge of badges) {
      const badgeRect = badge.getBoundingClientRect();
      const source = badge.dataset.sourceHero ?? "unknown";
      const target = badge.dataset.targetHero ?? "unknown";

      for (const label of heroLabels) {
        const hero = label.dataset.heroLabel ?? "unknown";
        if (!overlap(badgeRect, label.getBoundingClientRect())) continue;
        badgeHeroLabel.push(`${source}->${target} overlaps label:${hero}`);
      }
    }

    const activeEdgeForeignPortrait: string[] = [];
    const activeNodes = Array.from(
      document.querySelectorAll<SVGGElement>(
        ".hero-node.hero-active, .hero-node.hero-selected"
      )
    ).flatMap((node) => {
      const portrait = node.querySelector<SVGCircleElement>(".hero-portrait-node");
      if (!portrait) return [];

      const rect = portrait.getBoundingClientRect();
      return [{
        hero: node.id.replace("graph-hero-", ""),
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        radius: Math.min(rect.width, rect.height) / 2
      }];
    });

    const activeEdges = Array.from(
      document.querySelectorAll<SVGLineElement>(".edge.edge-active")
    );

    for (const edge of activeEdges) {
      const ctm = edge.getScreenCTM();
      if (!ctm) continue;

      const start = new DOMPoint(
        Number(edge.getAttribute("x1") ?? 0),
        Number(edge.getAttribute("y1") ?? 0)
      ).matrixTransform(ctm);
      const end = new DOMPoint(
        Number(edge.getAttribute("x2") ?? 0),
        Number(edge.getAttribute("y2") ?? 0)
      ).matrixTransform(ctm);
      const source = edge.dataset.sourceHero ?? "unknown";
      const target = edge.dataset.targetHero ?? "unknown";

      for (const node of activeNodes) {
        if (node.hero === source || node.hero === target) continue;

        const distance = distanceToSegment(
          node.x,
          node.y,
          start.x,
          start.y,
          end.x,
          end.y
        );
        if (distance >= node.radius - 1) continue;

        activeEdgeForeignPortrait.push(
          `${source}->${target} crosses portrait:${node.hero}`
        );
      }
    }

    const badgeDimmedPortrait: string[] = [];
    const dimmedNodes = Array.from(
      document.querySelectorAll<SVGGElement>(".hero-node.hero-dimmed")
    );

    for (const badge of badges) {
      const badgeRect = badge.getBoundingClientRect();
      const source = badge.dataset.sourceHero ?? "unknown";
      const target = badge.dataset.targetHero ?? "unknown";

      for (const node of dimmedNodes) {
        const portrait = node.querySelector<SVGCircleElement>(".hero-portrait-node");
        if (!portrait || !overlap(badgeRect, portrait.getBoundingClientRect())) {
          continue;
        }

        badgeDimmedPortrait.push(
          `${source}->${target} overlaps dimmed:${node.id.replace(
            "graph-hero-",
            ""
          )}`
        );
      }
    }

    const uniqueSorted = (values: string[]) => [...new Set(values)].sort();

    return {
      badgeHeroLabel: uniqueSorted(badgeHeroLabel),
      activeEdgeForeignPortrait: uniqueSorted(activeEdgeForeignPortrait),
      badgeDimmedPortrait: uniqueSorted(badgeDimmedPortrait)
    };
  });

const focusHeroes = ["viper", "spectre", "rubick", "dark-willow"] as const;

for (const hero of focusHeroes) {
  test(`visual collision baseline stays stable for ${hero}`, async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto(`/?hero=${hero}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(520);

    const audit = await scanVisualCollisions(page);

    // Initial strict baseline. If this fails, inspect the received geometry,
    // tie every existing exception to a focused bug issue, and keep the
    // allowlist exact so any new collision still fails CI.
    expect(audit).toEqual({
      badgeHeroLabel: [],
      activeEdgeForeignPortrait: [],
      badgeDimmedPortrait: []
    });
  });
}
