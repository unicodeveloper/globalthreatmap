import { z } from "zod";

const GAMMA_API_BASE = "https://gamma-api.polymarket.com";

/**
 * Helper to parse JSON string arrays from API
 */
function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Raw market data from API (before transformation)
 */
const RawPolymarketMarket = z.object({
  id: z.string(),
  question: z.string(),
  slug: z.string(),
  description: z.string().optional().nullable(),
  outcomes: z.unknown(), // Can be string or array
  outcomePrices: z.unknown(), // Can be string or array
  volume: z.union([z.string(), z.number()]).optional().nullable(),
  volumeNum: z.number().optional().nullable(),
  liquidity: z.union([z.string(), z.number()]).optional().nullable(),
  liquidityNum: z.number().optional().nullable(),
  endDate: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  active: z.boolean().optional().nullable(),
  closed: z.boolean().optional().nullable(),
});

type RawPolymarketMarket = z.infer<typeof RawPolymarketMarket>;

/**
 * Polymarket event schema
 */
const RawPolymarketEvent = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  description: z.string().optional().nullable(),
  volume: z.number().optional().nullable(),
  liquidity: z.number().optional().nullable(),
  endDate: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  markets: z.array(RawPolymarketMarket).optional().nullable(),
  tags: z.array(z.object({
    id: z.string().optional().nullable(),
    slug: z.string().optional().nullable(),
    label: z.string().optional().nullable(),
  })).optional().nullable(),
});

type RawPolymarketEvent = z.infer<typeof RawPolymarketEvent>;

/**
 * Parsed market with computed fields
 * Note: endDate is Date on server but becomes string after JSON serialization
 */
export interface ParsedMarket {
  id: string;
  question: string;
  slug: string;
  eventSlug: string; // The parent event slug for URL construction
  description?: string;
  outcomes: Array<{ label: string; probability: number }>;
  volume: number;
  liquidity: number;
  endDate?: Date | string;
  image?: string;
  url: string;
  isActive: boolean;
}

/**
 * Geopolitical tags to search for
 */
export const GEOPOLITICAL_TAGS = [
  "geopolitics",
  "world",
  "war",
  "military",
  "nato",
  "ukraine",
  "russia",
  "china",
  "iran",
  "israel",
  "middle-east",
  "taiwan",
  "north-korea",
  "syria",
  "yemen",
  "conflict",
] as const;

/**
 * Country name to SPECIFIC Polymarket tag mappings
 * IMPORTANT: Only include tags that are specific to this country
 * Do NOT include broad tags like "geopolitics", "world", "war", etc.
 */
const COUNTRY_TAG_MAP: Record<string, string[]> = {
  // Major conflict zones - only country-specific tags
  "Ukraine": ["ukraine", "zelensky", "zelenskyy"],
  "Russia": ["russia", "putin"],
  "Israel": ["israel", "netanyahu"],
  "Palestine": ["gaza", "palestine", "hamas"],
  "Iran": ["iran", "khamenei"],
  "China": ["china", "xi-jinping"],
  "Taiwan": ["taiwan"],
  "North Korea": ["north-korea", "kim-jong-un", "dprk"],
  "Syria": ["syria", "assad"],
  "Yemen": ["yemen", "houthi"],
  // NATO/EU
  "United States": ["trump", "biden", "us-politics"],
  "France": ["france", "macron"],
  "Germany": ["germany", "scholz"],
  "United Kingdom": ["uk", "starmer", "england"],
  "Poland": ["poland"],
  // Asia
  "India": ["india", "modi"],
  "Pakistan": ["pakistan"],
  "South Korea": ["south-korea"],
  "Japan": ["japan"],
  // Africa
  "Sudan": ["sudan"],
  "Ethiopia": ["ethiopia"],
  "Somalia": ["somalia"],
  // South America
  "Venezuela": ["venezuela", "maduro"],
  "Brazil": ["brazil", "lula"],
};

/**
 * Check if a market is relevant to a specific country
 */
function isMarketRelevantToCountry(market: RawPolymarketMarket, country: string, event: RawPolymarketEvent): boolean {
  const countryVariants = getCountryVariants(country);

  // Check market question
  const questionLower = market.question.toLowerCase();
  if (countryVariants.some(v => questionLower.includes(v))) {
    return true;
  }

  // Check market description
  if (market.description) {
    const descLower = market.description.toLowerCase();
    if (countryVariants.some(v => descLower.includes(v))) {
      return true;
    }
  }

  // Check event title
  const titleLower = event.title.toLowerCase();
  if (countryVariants.some(v => titleLower.includes(v))) {
    return true;
  }

  return false;
}

/**
 * Get variants of a country name for matching
 */
function getCountryVariants(country: string): string[] {
  const variants = [country.toLowerCase()];

  // Add common variants
  const variantMap: Record<string, string[]> = {
    "United States": ["usa", "u.s.", "america", "american"],
    "United Kingdom": ["uk", "britain", "british", "england"],
    "North Korea": ["dprk", "pyongyang", "kim jong"],
    "South Korea": ["rok", "seoul"],
    "Russia": ["russian", "moscow", "kremlin", "putin"],
    "Ukraine": ["ukrainian", "kyiv", "kiev", "zelensky", "zelenskyy"],
    "China": ["chinese", "beijing", "prc", "xi jinping"],
    "Iran": ["iranian", "tehran", "khamenei"],
    "Israel": ["israeli", "tel aviv", "netanyahu"],
    "Palestine": ["palestinian", "gaza", "west bank", "hamas"],
  };

  if (variantMap[country]) {
    variants.push(...variantMap[country]);
  }

  return variants;
}

/**
 * Parse raw market data into a cleaner format
 * @param market - The raw market data from API
 * @param eventSlug - The parent event's slug (used for URL construction)
 */
function parseMarket(market: RawPolymarketMarket, eventSlug: string): ParsedMarket | null {
  try {
    const outcomesArray = parseJsonArray(market.outcomes);
    const pricesArray = parseJsonArray(market.outcomePrices);

    if (outcomesArray.length === 0) {
      return null;
    }

    const outcomes = outcomesArray.map((label, i) => ({
      label: String(label),
      probability: parseFloat(String(pricesArray[i] || "0")) * 100,
    }));

    const volumeNum = market.volumeNum ??
      (typeof market.volume === "number" ? market.volume : parseFloat(String(market.volume || "0")));

    const liquidityNum = market.liquidityNum ??
      (typeof market.liquidity === "number" ? market.liquidity : parseFloat(String(market.liquidity || "0")));

    return {
      id: market.id,
      question: market.question,
      slug: market.slug,
      eventSlug,
      description: market.description ?? undefined,
      outcomes,
      volume: isNaN(volumeNum) ? 0 : volumeNum,
      liquidity: isNaN(liquidityNum) ? 0 : liquidityNum,
      endDate: market.endDate ? new Date(market.endDate) : undefined,
      image: market.image || market.icon || undefined,
      url: `https://polymarket.com/event/${eventSlug}`,
      isActive: market.active === true && market.closed !== true,
    };
  } catch (error) {
    console.error("Error parsing market:", error);
    return null;
  }
}

/**
 * Fetch events from Polymarket Gamma API with error handling
 */
async function fetchEventsRaw(options?: {
  limit?: number;
  offset?: number;
  closed?: boolean;
  tagSlug?: string;
}): Promise<RawPolymarketEvent[]> {
  const params = new URLSearchParams();

  if (options?.limit) params.set("limit", options.limit.toString());
  if (options?.offset) params.set("offset", options.offset.toString());
  if (options?.closed !== undefined) params.set("closed", options.closed.toString());
  if (options?.tagSlug) params.set("tag_slug", options.tagSlug);

  const response = await fetch(`${GAMMA_API_BASE}/events?${params.toString()}`, {
    headers: {
      "Accept": "application/json",
    },
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!response.ok) {
    throw new Error(`Polymarket API error: ${response.status}`);
  }

  const data = await response.json();

  // Validate with lenient parsing
  const result = z.array(RawPolymarketEvent).safeParse(data);
  if (!result.success) {
    console.error("Polymarket API response validation failed:", result.error);
    // Return empty array on validation failure instead of throwing
    return [];
  }

  return result.data;
}

/**
 * Extract and parse markets from events
 */
function extractMarketsFromEvents(events: RawPolymarketEvent[], activeOnly = true): ParsedMarket[] {
  const markets: ParsedMarket[] = [];

  for (const event of events) {
    if (!event.markets) continue;

    for (const rawMarket of event.markets) {
      // Skip inactive/closed markets if activeOnly is true
      if (activeOnly && (rawMarket.closed === true || rawMarket.active === false)) {
        continue;
      }

      // Pass the event slug for proper URL construction
      const parsed = parseMarket(rawMarket, event.slug);
      if (parsed) {
        markets.push(parsed);
      }
    }
  }

  return markets;
}

/**
 * Search for markets by text query (searches question and description)
 */
export async function searchMarkets(query: string, limit = 20): Promise<ParsedMarket[]> {
  try {
    // Fetch a batch of recent events and filter client-side
    const events = await fetchEventsRaw({ limit: 100, closed: false });

    const queryLower = query.toLowerCase();
    const matchingMarkets: ParsedMarket[] = [];
    const seenIds = new Set<string>();

    for (const event of events) {
      // Check event title/description
      const eventMatches =
        event.title?.toLowerCase().includes(queryLower) ||
        event.description?.toLowerCase().includes(queryLower) ||
        event.tags?.some(tag =>
          tag.label?.toLowerCase().includes(queryLower) ||
          tag.slug?.toLowerCase().includes(queryLower)
        );

      if (event.markets) {
        for (const rawMarket of event.markets) {
          if (rawMarket.closed === true || rawMarket.active === false) continue;

          const marketMatches = eventMatches ||
            rawMarket.question.toLowerCase().includes(queryLower) ||
            rawMarket.description?.toLowerCase().includes(queryLower);

          if (marketMatches && !seenIds.has(rawMarket.id)) {
            const parsed = parseMarket(rawMarket, event.slug);
            if (parsed) {
              seenIds.add(rawMarket.id);
              matchingMarkets.push(parsed);
            }
          }
        }
      }
    }

    // Sort by volume and limit
    return matchingMarkets
      .sort((a, b) => b.volume - a.volume)
      .slice(0, limit);
  } catch (error) {
    console.error("Error searching markets:", error);
    return [];
  }
}

/**
 * Search for markets specifically relevant to a country
 * Uses country name variants and filters for relevance
 */
async function searchMarketsForCountry(country: string, limit = 10): Promise<ParsedMarket[]> {
  try {
    const events = await fetchEventsRaw({ limit: 100, closed: false });
    const matchingMarkets: ParsedMarket[] = [];
    const seenIds = new Set<string>();

    for (const event of events) {
      if (!event.markets) continue;

      for (const rawMarket of event.markets) {
        if (rawMarket.closed === true || rawMarket.active === false) continue;

        // Check if market is relevant to this country
        if (!isMarketRelevantToCountry(rawMarket, country, event)) continue;

        if (!seenIds.has(rawMarket.id)) {
          const parsed = parseMarket(rawMarket, event.slug);
          if (parsed) {
            seenIds.add(rawMarket.id);
            matchingMarkets.push(parsed);
          }
        }
      }
    }

    return matchingMarkets
      .sort((a, b) => b.volume - a.volume)
      .slice(0, limit);
  } catch (error) {
    console.error("Error searching markets for country:", error);
    return [];
  }
}

/**
 * Fetch geopolitical/conflict markets
 */
export async function fetchGeopoliticalMarkets(limit = 50): Promise<ParsedMarket[]> {
  const allMarkets: ParsedMarket[] = [];
  const seenIds = new Set<string>();

  // Fetch events for a subset of the most relevant geopolitical tags
  // to avoid making too many requests
  const priorityTags = ["geopolitics", "world", "ukraine", "russia", "iran", "china", "middle-east"];

  const tagPromises = priorityTags.map(async (tag) => {
    try {
      return await fetchEventsRaw({ limit: 30, closed: false, tagSlug: tag });
    } catch (error) {
      console.error(`Error fetching tag ${tag}:`, error);
      return [];
    }
  });

  const results = await Promise.all(tagPromises);

  for (const events of results) {
    const markets = extractMarketsFromEvents(events, true);
    for (const market of markets) {
      if (!seenIds.has(market.id)) {
        seenIds.add(market.id);
        allMarkets.push(market);
      }
    }
  }

  // Sort by volume (highest first)
  return allMarkets
    .sort((a, b) => b.volume - a.volume)
    .slice(0, limit);
}

/**
 * Fetch markets related to a specific country
 * Only returns markets that are actually relevant to the specified country
 */
export async function fetchCountryMarkets(country: string, limit = 10): Promise<ParsedMarket[]> {
  const tags = COUNTRY_TAG_MAP[country] || [country.toLowerCase().replace(/\s+/g, "-")];
  const allMarkets: ParsedMarket[] = [];
  const seenIds = new Set<string>();

  // Limit to first 3 tags to avoid too many requests
  const tagsToFetch = tags.slice(0, 3);

  const tagPromises = tagsToFetch.map(async (tag) => {
    try {
      return await fetchEventsRaw({ limit: 20, closed: false, tagSlug: tag });
    } catch (error) {
      console.error(`Error fetching tag ${tag}:`, error);
      return [];
    }
  });

  const results = await Promise.all(tagPromises);

  // Extract markets but FILTER for relevance to the specific country
  for (const events of results) {
    for (const event of events) {
      if (!event.markets) continue;

      for (const rawMarket of event.markets) {
        // Skip inactive/closed markets
        if (rawMarket.closed === true || rawMarket.active === false) continue;

        // CRITICAL: Only include if actually relevant to this country
        if (!isMarketRelevantToCountry(rawMarket, country, event)) continue;

        const parsed = parseMarket(rawMarket, event.slug);
        if (parsed && !seenIds.has(parsed.id)) {
          seenIds.add(parsed.id);
          allMarkets.push(parsed);
        }
      }
    }
  }

  // Also do a text search for the country name (already filtered by searchMarkets)
  try {
    const searchResults = await searchMarketsForCountry(country, 10);
    for (const market of searchResults) {
      if (!seenIds.has(market.id)) {
        seenIds.add(market.id);
        allMarkets.push(market);
      }
    }
  } catch (error) {
    console.error(`Error searching for ${country}:`, error);
  }

  // Sort by volume and limit
  return allMarkets
    .sort((a, b) => b.volume - a.volume)
    .slice(0, limit);
}

/**
 * Format volume for display (e.g., $1.2M, $500K)
 */
export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) {
    return `$${(volume / 1_000_000).toFixed(1)}M`;
  }
  if (volume >= 1_000) {
    return `$${(volume / 1_000).toFixed(0)}K`;
  }
  return `$${volume.toFixed(0)}`;
}

/**
 * Format probability for display
 */
export function formatProbability(probability: number): string {
  return `${probability.toFixed(0)}%`;
}

/**
 * Get the leading outcome (highest probability)
 */
export function getLeadingOutcome(market: ParsedMarket): { label: string; probability: number } {
  if (!market.outcomes || market.outcomes.length === 0) {
    return { label: "N/A", probability: 0 };
  }
  return market.outcomes.reduce((max, outcome) =>
    outcome.probability > max.probability ? outcome : max
  , market.outcomes[0]);
}
