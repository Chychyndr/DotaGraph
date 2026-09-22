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
      document.querySelectorAll<SVGElement>(".edge.edge-active")
    );

    for (const edge of activeEdges) {
      const ctm = edge.getScreenCTM();
      if (!ctm) continue;

      const localPoints: DOMPoint[] = [];
      if (edge instanceof SVGLineElement) {
        localPoints.push(
          new DOMPoint(
            Number(edge.getAttribute("x1") ?? 0),
            Number(edge.getAttribute("y1") ?? 0)
          ),
          new DOMPoint(
            Number(edge.getAttribute("x2") ?? 0),
            Number(edge.getAttribute("y2") ?? 0)
          )
        );
      } else if (edge instanceof SVGPolylineElement) {
        for (let index = 0; index < edge.points.numberOfItems; index += 1) {
          const point = edge.points.getItem(index);
          localPoints.push(new DOMPoint(point.x, point.y));
        }
      }

      if (localPoints.length < 2) continue;

      const screenPoints = localPoints.map((point) =>
        point.matrixTransform(ctm)
      );
      const source = edge.dataset.sourceHero ?? "unknown";
      const target = edge.dataset.targetHero ?? "unknown";

      for (const node of activeNodes) {
        if (node.hero === source || node.hero === target) continue;

        const crosses = screenPoints
          .slice(1)
          .some(
            (point, index) =>
              distanceToSegment(
                node.x,
                node.y,
                screenPoints[index].x,
                screenPoints[index].y,
                point.x,
                point.y
              ) < node.radius - 1
          );
        if (!crosses) continue;

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

const knownCollisionBaseline: Record<string, VisualCollisionAudit> = {
  // #54 badge ↔ hero-name, #55 edge ↔ unrelated active portrait,
  // #56 badge ↔ dimmed portrait. Keep every exception exact: generated-data
  // changes must fail CI when they add, remove, or move a collision so the
  // geometry change receives an explicit visual review.
  viper: {
    badgeHeroLabel: [],
    activeEdgeForeignPortrait: [],
    badgeDimmedPortrait: [
      "arc-warden->viper overlaps dimmed:natures-prophet",
      "chaos-knight->viper overlaps dimmed:invoker",
      "chaos-knight->viper overlaps dimmed:medusa",
      "enigma->viper overlaps dimmed:terrorblade",
      "viper->gyrocopter overlaps dimmed:dragon-knight",
      "viper->gyrocopter overlaps dimmed:treant-protector",
      "viper->huskar overlaps dimmed:treant-protector",
      "viper->shadow-fiend overlaps dimmed:bounty-hunter",
      "viper->silencer overlaps dimmed:leshrac"
    ]
  },
  spectre: {
    badgeHeroLabel: [],
    activeEdgeForeignPortrait: [],
    badgeDimmedPortrait: [
      "io->spectre overlaps dimmed:razor",
      "meepo->spectre overlaps dimmed:elder-titan",
      "phantom-lancer->spectre overlaps dimmed:chaos-knight",
      "undying->spectre overlaps dimmed:storm-spirit"
    ]
  },
  rubick: {
    badgeHeroLabel: [],
    activeEdgeForeignPortrait: [],
    badgeDimmedPortrait: [
      "night-stalker->rubick overlaps dimmed:kunkka",
      "phoenix->rubick overlaps dimmed:enigma",
      "rubick->jakiro overlaps dimmed:doom",
      "rubick->shadow-fiend overlaps dimmed:juggernaut",
      "spectre->rubick overlaps dimmed:anti-mage"
    ]
  },
  "dark-willow": {
    badgeHeroLabel: [],
    activeEdgeForeignPortrait: [],
    badgeDimmedPortrait: [
      "bounty-hunter->dark-willow overlaps dimmed:mirana",
      "dark-willow->shadow-fiend overlaps dimmed:mirana",
      "dark-willow->treant-protector overlaps dimmed:ogre-magi",
      "dark-willow->underlord overlaps dimmed:alchemist",
      "dragon-knight->dark-willow overlaps dimmed:bane",
      "enigma->dark-willow overlaps dimmed:ogre-magi",
      "juggernaut->dark-willow overlaps dimmed:vengeful-spirit",
      "leshrac->dark-willow overlaps dimmed:tidehunter"
    ]
  }
};

for (const [hero, baseline] of Object.entries(knownCollisionBaseline)) {
  test(`visual collision baseline stays stable for ${hero}`, async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto(`/?hero=${hero}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(520);

    expect(await scanVisualCollisions(page)).toEqual(baseline);
  });
}
