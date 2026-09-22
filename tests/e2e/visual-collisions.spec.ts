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

const knownCollisionBaseline: Record<string, VisualCollisionAudit> = {
  // #54 badge ↔ hero-name, #55 edge ↔ unrelated active portrait,
  // #56 badge ↔ dimmed portrait. Keep every exception exact: generated-data
  // changes must fail CI when they add, remove, or move a collision so the
  // geometry change receives an explicit visual review.
  viper: {
    badgeHeroLabel: [],
    activeEdgeForeignPortrait: [
      "arc-warden->viper crosses portrait:dark-seer",
      "arc-warden->viper crosses portrait:huskar",
      "viper->gyrocopter crosses portrait:bristleback",
      "viper->silencer crosses portrait:dark-seer"
    ],
    badgeDimmedPortrait: [
      "arc-warden->viper overlaps dimmed:natures-prophet",
      "chaos-knight->viper overlaps dimmed:invoker",
      "chaos-knight->viper overlaps dimmed:medusa",
      "dark-seer->viper overlaps dimmed:wraith-king",
      "enigma->viper overlaps dimmed:terrorblade",
      "viper->gyrocopter overlaps dimmed:lycan",
      "viper->huskar overlaps dimmed:bounty-hunter",
      "viper->silencer overlaps dimmed:troll-warlord"
    ]
  },
  spectre: {
    badgeHeroLabel: [],
    activeEdgeForeignPortrait: [
      "undying->spectre crosses portrait:drow-ranger"
    ],
    badgeDimmedPortrait: [
      "io->spectre overlaps dimmed:razor",
      "meepo->spectre overlaps dimmed:elder-titan",
      "phantom-lancer->spectre overlaps dimmed:chaos-knight",
      "spectre->axe overlaps dimmed:oracle",
      "spectre->natures-prophet overlaps dimmed:clockwerk",
      "spectre->templar-assassin overlaps dimmed:clinkz",
      "undying->spectre overlaps dimmed:sven"
    ]
  },
  rubick: {
    badgeHeroLabel: [],
    activeEdgeForeignPortrait: [
      "night-stalker->rubick crosses portrait:legion-commander",
      "spectre->rubick crosses portrait:legion-commander"
    ],
    badgeDimmedPortrait: [
      "night-stalker->rubick overlaps dimmed:kunkka",
      "phoenix->rubick overlaps dimmed:phantom-lancer",
      "rubick->jakiro overlaps dimmed:doom",
      "rubick->shadow-fiend overlaps dimmed:juggernaut",
      "rubick->weaver overlaps dimmed:spirit-breaker",
      "spectre->rubick overlaps dimmed:arc-warden"
    ]
  },
  "dark-willow": {
    badgeHeroLabel: [],
    activeEdgeForeignPortrait: [
      "dark-willow->bristleback crosses portrait:bounty-hunter",
      "dark-willow->treant-protector crosses portrait:enigma",
      "dark-willow->underlord crosses portrait:leshrac",
      "juggernaut->dark-willow crosses portrait:bounty-hunter",
      "juggernaut->dark-willow crosses portrait:bristleback"
    ],
    badgeDimmedPortrait: [
      "bounty-hunter->dark-willow overlaps dimmed:mirana",
      "dark-willow->shadow-fiend overlaps dimmed:mirana",
      "dark-willow->treant-protector overlaps dimmed:terrorblade",
      "dark-willow->underlord overlaps dimmed:lifestealer",
      "dragon-knight->dark-willow overlaps dimmed:bane",
      "enigma->dark-willow overlaps dimmed:ogre-magi",
      "juggernaut->dark-willow overlaps dimmed:outworld-destroyer",
      "leshrac->dark-willow overlaps dimmed:alchemist",
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
