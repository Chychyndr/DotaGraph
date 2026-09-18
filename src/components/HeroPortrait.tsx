import type { Hero } from "../domain/types";
import { getHeroSpriteStyle } from "../data/heroSprite";
import { usePortraitAsset } from "./PortraitProvider";

interface HeroPortraitProps {
  hero: Hero;
  className?: string;
}

const fallbackLabel = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

export function HeroPortrait({ hero, className = "" }: HeroPortraitProps) {
  const asset = usePortraitAsset();
  const classes = ["hero-portrait", className, asset.status === "failed" ? "hero-portrait-failed" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={classes}
      style={asset.status === "ready" ? getHeroSpriteStyle(hero.spriteIndex, asset.url) : undefined}
      data-portrait-status={asset.status}
      aria-hidden="true"
    >
      {asset.status === "failed" && (
        <span className="hero-portrait-fallback-text">{fallbackLabel(hero.name)}</span>
      )}
    </span>
  );
}
