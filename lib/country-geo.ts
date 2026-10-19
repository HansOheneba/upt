// lib/country-geo.ts
//
// Country resolution + world map geometry for the property Geographic Spread
// card. The map paths ship with @mostafawaheed00/react-jvectormap-world as a
// plain JSON file (Miller projection, keyed by ISO 3166-1 alpha-2), so the map
// renders as inline SVG with no external script and no API key.

import worldMillRaw from "@mostafawaheed00/react-jvectormap-world/worldMill.json";
import {
  countries as COUNTRY_DB,
  getCountryCode,
  getEmojiFlag,
} from "countries-list";

type WorldMillContent = {
  width: number;
  height: number;
  paths: Record<string, { path: string; name: string }>;
};

const world = (worldMillRaw as unknown as { content: WorldMillContent })
  .content;

export const WORLD_MAP_WIDTH = world.width;
export const WORLD_MAP_HEIGHT = world.height;

export type WorldCountryPath = { code: string; name: string; d: string };

export const WORLD_COUNTRY_PATHS: WorldCountryPath[] = Object.entries(
  world.paths,
).map(([code, p]) => ({ code, name: p.name, d: p.path }));

/**
 * Map-space coordinates for countries too small to have a rendered path.
 * Derived from the Miller projection used by worldMill.json.
 */
const MICRO_STATE_POSITIONS: Record<string, { x: number; y: number }> = {
  SG: { x: 681, y: 152 },
};

export function microStatePosition(
  code: string,
): { x: number; y: number } | null {
  return MICRO_STATE_POSITIONS[code] ?? null;
}

export function hasCountryPath(code: string): boolean {
  return code in world.paths;
}

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Marker anchor for a country path. Multi-region countries (US, CA, AU, etc.)
 * span disconnected shapes; a whole-path bounding box center can land in the
 * ocean. We measure each subpath and pick the largest landmass instead.
 */
export function getCountryPathMarkerPosition(
  pathEl: SVGPathElement,
  viewWidth = WORLD_MAP_WIDTH,
  viewHeight = WORLD_MAP_HEIGHT,
): { x: number; y: number } | null {
  const d = pathEl.getAttribute("d");
  if (!d) return null;

  const measureBox = (target: SVGGraphicsElement) => {
    try {
      const box = target.getBBox();
      if (box.width <= 0 && box.height <= 0) return null;
      return {
        x: box.x + box.width / 2,
        y: box.y + box.height / 2,
        area: box.width * box.height,
      };
    } catch {
      return null;
    }
  };

  const subpaths = d.split(/(?=M)/).filter(Boolean);
  if (subpaths.length <= 1) {
    const box = measureBox(pathEl);
    return box ? { x: box.x, y: box.y } : null;
  }

  const measureSvg = document.createElementNS(SVG_NS, "svg");
  measureSvg.setAttribute("viewBox", `0 0 ${viewWidth} ${viewHeight}`);
  measureSvg.setAttribute("width", "0");
  measureSvg.setAttribute("height", "0");
  measureSvg.style.position = "absolute";
  measureSvg.style.visibility = "hidden";
  measureSvg.style.pointerEvents = "none";
  document.body.appendChild(measureSvg);

  let best: { x: number; y: number; area: number } | null = null;

  for (const subpath of subpaths) {
    const segment = document.createElementNS(SVG_NS, "path");
    segment.setAttribute("d", subpath);
    measureSvg.appendChild(segment);
    const box = measureBox(segment);
    measureSvg.removeChild(segment);
    if (box && (!best || box.area > best.area)) {
      best = box;
    }
  }

  document.body.removeChild(measureSvg);
  return best ? { x: best.x, y: best.y } : null;
}

/**
 * Informal country labels used by the property form (COUNTRY_OPTIONS) and other
 * spellings users type. `countries-list` only resolves official names, so these
 * need an explicit alias.
 */
const ISO2_ALIASES: Record<string, string> = {
  usa: "US",
  "u.s.": "US",
  "u.s.a.": "US",
  america: "US",
  "united states of america": "US",
  uk: "GB",
  "u.k.": "GB",
  britain: "GB",
  "great britain": "GB",
  england: "GB",
  scotland: "GB",
  wales: "GB",
  "northern ireland": "GB",
  uae: "AE",
  dubai: "AE",
  "abu dhabi": "AE",
  "ivory coast": "CI",
  "south korea": "KR",
  "north korea": "KP",
  russia: "RU",
  "czech republic": "CZ",
  holland: "NL",
  "hong kong": "HK",
  drc: "CD",
  "cape verde": "CV",
  swaziland: "SZ",
  burma: "MM",
};

/**
 * Resolve a stored property country (ISO-2 code, official name, or informal
 * label) to an ISO-2 code. Returns null for unmappable values like "Other".
 */
export function toIso2(country: string | null | undefined): string | null {
  if (!country) return null;
  const raw = country.trim();
  if (!raw) return null;

  const alias = ISO2_ALIASES[raw.toLowerCase()];
  if (alias) return alias;

  const upper = raw.toUpperCase();
  if (raw.length === 2 && upper in COUNTRY_DB) return upper;

  const byName = getCountryCode(raw);
  return byName === false ? null : byName;
}

/** Official country name for display, falling back to the stored value. */
export function countryDisplayName(country: string): string {
  const code = toIso2(country);
  if (!code) return country;
  return COUNTRY_DB[code as keyof typeof COUNTRY_DB]?.name ?? country;
}

/** Emoji flag for a stored country value, or empty string when unresolvable. */
export function countryFlag(country: string): string {
  const code = toIso2(country);
  if (!code) return "";
  try {
    return getEmojiFlag(code as Parameters<typeof getEmojiFlag>[0]) ?? "";
  } catch {
    return "";
  }
}
