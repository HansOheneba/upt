/**
 * Area names stored on a property `locality`.
 * Store the area only (`Chelsea`), not `Chelsea, London`.
 * The same area name can exist in more than one city (`Ridge`).
 */

export type PropertyAreaRow = {
  country: string;
  city: string;
  areas: readonly string[];
};

export const PROPERTY_AREA_CATALOG: readonly PropertyAreaRow[] = [
  {
    country: "Ghana",
    city: "Accra",
    areas: [
      "East Legon",
      "Cantonments",
      "Airport Residential",
      "Labone",
      "Roman Ridge",
      "Dzorwulu",
      "Trasacco",
    ],
  },
  {
    country: "Ghana",
    city: "Kumasi",
    areas: ["Ridge", "Ahodwo", "Nhyiaeso", "Asokwa"],
  },
  {
    country: "Ghana",
    city: "Tema",
    areas: ["Community 25", "Sakumono", "Community 1"],
  },
  {
    country: "Ghana",
    city: "Takoradi",
    areas: ["Beach Road", "Chapel Hill", "Anaji"],
  },
  {
    country: "Ghana",
    city: "Cape Coast",
    areas: ["Ridge", "Pedu"],
  },
  {
    country: "Ghana",
    city: "Tamale",
    areas: ["Kalpohin", "Sagnarigu"],
  },
  {
    country: "Ghana",
    city: "Ho",
    areas: ["Bankoe", "Civic Centre"],
  },
  {
    country: "Ghana",
    city: "Sunyani",
    areas: ["Estate", "Penkwase"],
  },
  {
    country: "Ghana",
    city: "Wa",
    areas: ["Kambali", "Dobile"],
  },
  {
    country: "Ghana",
    city: "Madina",
    areas: ["Madina Estate", "Redco"],
  },
  {
    country: "Ghana",
    city: "Goaso",
    areas: ["Goaso Central"],
  },
  {
    country: "Ghana",
    city: "Bibiani",
    areas: ["Bibiani Town"],
  },
  {
    country: "United Kingdom",
    city: "London",
    areas: [
      "Kensington",
      "Chelsea",
      "Notting Hill",
      "Mayfair",
      "Hampstead",
      "Belgravia",
    ],
  },
  {
    country: "United Kingdom",
    city: "Manchester",
    areas: ["Didsbury", "Chorlton"],
  },
  {
    country: "United States",
    city: "New York",
    areas: ["Upper East Side", "Tribeca", "Brooklyn Heights"],
  },
  {
    country: "United States",
    city: "Los Angeles",
    areas: ["Beverly Hills", "Santa Monica"],
  },
  {
    country: "United States",
    city: "Miami",
    areas: ["Brickell", "Coral Gables"],
  },
  {
    country: "United Arab Emirates",
    city: "Dubai",
    areas: ["Dubai Marina", "Downtown", "Palm Jumeirah"],
  },
  {
    country: "Nigeria",
    city: "Lagos",
    areas: ["Ikoyi", "Victoria Island", "Lekki"],
  },
  {
    country: "South Africa",
    city: "Johannesburg",
    areas: ["Sandton", "Rosebank"],
  },
  {
    country: "South Africa",
    city: "Cape Town",
    areas: ["Camps Bay", "Constantia"],
  },
  {
    country: "Canada",
    city: "Toronto",
    areas: ["Yorkville", "Rosedale"],
  },
  {
    country: "Canada",
    city: "Vancouver",
    areas: ["Kitsilano", "West Vancouver"],
  },
  {
    country: "Australia",
    city: "Sydney",
    areas: ["Mosman", "Paddington"],
  },
  {
    country: "Australia",
    city: "Melbourne",
    areas: ["Toorak", "South Yarra"],
  },
  {
    country: "Singapore",
    city: "Singapore",
    areas: ["Orchard", "Tanglin", "Sentosa Cove"],
  },
  {
    country: "Germany",
    city: "Munich",
    areas: ["Bogenhausen", "Schwabing"],
  },
  {
    country: "Germany",
    city: "Berlin",
    areas: ["Mitte", "Charlottenburg"],
  },
  {
    country: "Germany",
    city: "Frankfurt",
    areas: ["Westend"],
  },
  {
    country: "France",
    city: "Paris",
    areas: ["Passy", "Neuilly-sur-Seine", "Saint-Germain"],
  },
  {
    country: "Netherlands",
    city: "Amsterdam",
    areas: ["Oud-Zuid", "Jordaan"],
  },
  {
    country: "Switzerland",
    city: "Geneva",
    areas: ["Eaux-Vives", "Champel"],
  },
  {
    country: "Switzerland",
    city: "Zurich",
    areas: ["Enge", "Wollishofen"],
  },
  {
    country: "Japan",
    city: "Tokyo",
    areas: ["Minato", "Shibuya", "Meguro"],
  },
  {
    country: "Kenya",
    city: "Nairobi",
    areas: ["Kilimani", "Westlands"],
  },
];

/** Form and stored country strings that share one catalog country. */
const CATALOG_COUNTRY_ALIASES: Record<string, string> = {
  uk: "United Kingdom",
  "united kingdom": "United Kingdom",
  england: "United Kingdom",
  scotland: "United Kingdom",
  wales: "United Kingdom",
  "great britain": "United Kingdom",
  gb: "United Kingdom",
  usa: "United States",
  us: "United States",
  "united states": "United States",
  uae: "United Arab Emirates",
  "united arab emirates": "United Arab Emirates",
};

export type PropertyAreaField =
  | { mode: "hidden" }
  | { mode: "free" }
  | { mode: "list"; areas: string[]; cityMatched: boolean };

export function resolvePropertyCatalogCountry(country: string): string | null {
  const key = country.trim().toLowerCase();
  if (!key || key === "other") return null;
  const alias = CATALOG_COUNTRY_ALIASES[key];
  if (alias) return alias;
  const direct = PROPERTY_AREA_CATALOG.find(
    (row) => row.country.toLowerCase() === key,
  );
  return direct?.country ?? null;
}

function areasForCatalogCountry(
  catalogCountry: string,
  city: string,
): { areas: string[]; cityMatched: boolean } {
  const rows = PROPERTY_AREA_CATALOG.filter(
    (row) => row.country === catalogCountry,
  );
  const cityKey = city.trim().toLowerCase();
  const cityRows = cityKey
    ? rows.filter((row) => row.city.toLowerCase() === cityKey)
    : [];
  const cityMatched = cityRows.length > 0;
  const source = cityMatched ? cityRows : rows;
  const seen = new Set<string>();
  const areas: string[] = [];
  for (const row of source) {
    for (const area of row.areas) {
      if (seen.has(area)) continue;
      seen.add(area);
      areas.push(area);
    }
  }
  return { areas, cityMatched };
}

/**
 * No country: hide the area field.
 * Covered country, empty or unknown city: every area in that country.
 * Covered country, known city: that city's areas only.
 * Other, or a country with no catalog rows: free text.
 */
export function getPropertyAreaField(
  country: string,
  city: string,
): PropertyAreaField {
  if (!country.trim()) return { mode: "hidden" };
  const catalogCountry = resolvePropertyCatalogCountry(country);
  if (!catalogCountry) return { mode: "free" };
  const { areas, cityMatched } = areasForCatalogCountry(catalogCountry, city);
  if (areas.length === 0) return { mode: "free" };
  return { mode: "list", areas, cityMatched };
}
