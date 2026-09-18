import type { Hero } from "../domain/types";
import { getHeroSpriteStyle } from "../data/heroSprite";

interface HeroPortraitProps {
  hero: Hero;
  className?: string;
}

export function HeroPortrait({ hero, className = "" }: HeroPortraitProps) {
  const classes = ["hero-portrait", className].filter(Boolean).join(" ");

  return (
    <span
      className={classes}
      style={getHeroSpriteStyle(hero.spriteIndex)}
      aria-hidden="true"
    />
  );
}
