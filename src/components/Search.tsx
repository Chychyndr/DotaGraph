import { useEffect, useMemo, useRef, useState } from "react";
import type { Hero } from "../domain/types";
import { searchHeroes } from "../domain/relationships";
import { HeroPortrait } from "./HeroPortrait";

interface SearchProps {
  heroes: Hero[];
  onSelect: (hero: Hero) => void;
}

export function Search({ heroes, onSelect }: SearchProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => searchHeroes(heroes, query), [heroes, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/" && document.activeElement !== inputRef.current) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const choose = (hero: Hero) => {
    onSelect(hero);
    setQuery("");
    inputRef.current?.blur();
  };

  return (
    <div className="search-shell">
      <label className="sr-only" htmlFor="hero-search">Search for a hero</label>
      <div className="search-input-wrap">
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
        </svg>
        <input
          ref={inputRef}
          id="hero-search"
          value={query}
          placeholder="Search hero…"
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && results.length) {
              event.preventDefault();
              setActiveIndex((index) => (index + 1) % results.length);
            }
            if (event.key === "ArrowUp" && results.length) {
              event.preventDefault();
              setActiveIndex((index) => (index - 1 + results.length) % results.length);
            }
            if (event.key === "Enter" && results[activeIndex]) {
              event.preventDefault();
              choose(results[activeIndex]);
            }
            if (event.key === "Escape") {
              setQuery("");
              inputRef.current?.blur();
            }
          }}
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-keyshortcuts="/"
          aria-expanded={Boolean(query)}
          aria-controls={query ? "hero-search-results" : undefined}
          aria-activedescendant={query && results[activeIndex] ? `hero-result-${results[activeIndex].id}` : undefined}
        />
        <kbd aria-hidden="true">/</kbd>
      </div>

      {query && (
        <div
          className="search-results"
          id="hero-search-results"
          role="listbox"
          aria-label="Hero search results"
        >
          {results.length ? results.map((hero, index) => {
            const shortcutAlias = hero.aliases.find(
              (alias) => /^[a-z0-9]{1,4}$/i.test(alias)
            );

            return (
            <button
              id={`hero-result-${hero.id}`}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={index === activeIndex ? "search-result active" : "search-result"}
              key={hero.id}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(hero)}
            >
              <HeroPortrait hero={hero} />
              <span className="search-result-name">{hero.name}</span>
              {shortcutAlias && (
                <small className="search-result-shortcut">{shortcutAlias.toUpperCase()}</small>
              )}
            </button>
            );
          }) : <div className="search-empty">No hero found</div>}
        </div>
      )}
    </div>
  );
}
