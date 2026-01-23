import { NextResponse } from "next/server";
import { searchEvents } from "@/lib/valyu";
import { isSelfHostedMode } from "@/lib/app-mode";
import { classifyEvent, isAIClassificationEnabled } from "@/lib/ai-classifier";
import { generateEventId } from "@/lib/utils";
import { extractKeywords, extractEntities } from "@/lib/event-classifier";
import type { ThreatEvent } from "@/types";

export const dynamic = "force-dynamic";

const THREAT_QUERIES = [
  "breaking news conflict military",
  "geopolitical crisis tensions",
  "protest demonstration unrest",
  "natural disaster emergency",
  "terrorism attack security",
  "cyber attack breach",
  "diplomatic summit sanctions",
  "shipping attack piracy maritime",
  "kidnapping cartel violence crime",
  "infrastructure dam power grid failure",
  "food shortage commodity crisis",
  "missile strike airstrike bombing",
];

// Clean boilerplate from content
function cleanContent(text: string): string {
  return text
    .replace(/skip to (?:main |primary )?content/gi, "")
    .replace(/keyboard shortcuts?/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Filter out non-news sources and generic pages
const BLOCKED_DOMAINS = [
  "wikipedia.org",
  "brighteon.com",
  "fortinet.com",
  "cisa.gov",
];

const GENERIC_TITLE_PATTERNS = [
  /\| topic$/i,
  /\| homeland security$/i,
  /\| fortinet$/i,
  /^natural disasters$/i,
  /^countering terrorism$/i,
  /^maritime piracy:/i,
  /^assessment of global/i,
  /^recent cyber attacks in \d{4}/i,
];

// Validate location is real (not garbage text)
function isValidLocation(location: { placeName?: string; country?: string }): boolean {
  const name = location.placeName || location.country || "";
  // Skip if contains non-Latin scripts that aren't common (Arabic, Chinese, etc are ok)
  // But garbage like "گۆپاڵ" or "Routes" should be filtered
  if (name.length < 2) return false;
  if (name.toLowerCase() === "routes") return false;
  if (/^[a-z\s]+$/i.test(name) && name.length < 3) return false;
  // Check for suspiciously short or generic names
  if (["unknown", "global", "worldwide", "n/a"].includes(name.toLowerCase())) return false;
  return true;
}

// Threat level priority for sorting
const THREAT_LEVEL_PRIORITY: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

async function processSearchResults(
  results: Array<{ title: string; url: string; content: string; publishedDate?: string; source?: string }>
): Promise<ThreatEvent[]> {
  // Pre-filter results before processing
  const filteredResults = results.filter((result) => {
    // Skip blocked domains
    const url = result.url.toLowerCase();
    if (BLOCKED_DOMAINS.some((domain) => url.includes(domain))) {
      return false;
    }
    // Skip generic informational pages
    const title = result.title;
    if (GENERIC_TITLE_PATTERNS.some((pattern) => pattern.test(title))) {
      return false;
    }
    return true;
  });

  // Deduplicate by URL before processing (faster than after)
  const seenUrls = new Set<string>();
  const uniqueResults = filteredResults.filter((result) => {
    // Normalize URL (remove query params, trailing slashes)
    const normalizedUrl = result.url.split("?")[0].replace(/\/$/, "").toLowerCase();
    if (seenUrls.has(normalizedUrl)) return false;
    seenUrls.add(normalizedUrl);
    return true;
  });

  const eventsWithLocations = await Promise.all(
    uniqueResults.map(async (result) => {
      const cleanedTitle = cleanContent(result.title);
      const cleanedContent = cleanContent(result.content);
      const fullText = `${cleanedTitle} ${cleanedContent}`;

      // Use AI classification (falls back to keywords if OpenAI not available)
      const classification = await classifyEvent(cleanedTitle, cleanedContent);

      // Skip events without valid locations
      if (!classification.location || !isValidLocation(classification.location)) {
        return null;
      }

      const event: ThreatEvent = {
        id: generateEventId(),
        title: cleanedTitle,
        summary: cleanedContent.slice(0, 500),
        category: classification.category,
        threatLevel: classification.threatLevel,
        location: classification.location,
        timestamp: result.publishedDate || new Date().toISOString(),
        source: result.source || "web",
        sourceUrl: result.url,
        entities: extractEntities(fullText),
        keywords: extractKeywords(fullText),
        rawContent: cleanedContent,
      };

      return event;
    })
  );

  const validEvents = eventsWithLocations.filter(
    (event): event is ThreatEvent => event !== null
  );

  // Further deduplicate by title similarity
  const uniqueEvents = validEvents.filter(
    (event, index, self) =>
      index === self.findIndex((e) => e.title === event.title)
  );

  // Sort by threat level first, then by date
  return uniqueEvents.sort((a, b) => {
    const priorityA = THREAT_LEVEL_PRIORITY[a.threatLevel] ?? 5;
    const priorityB = THREAT_LEVEL_PRIORITY[b.threatLevel] ?? 5;
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    const dateA = new Date(a.timestamp).getTime();
    const dateB = new Date(b.timestamp).getTime();
    return dateB - dateA;
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  try {
    const searchQueries = query ? [query] : THREAT_QUERIES;

    const searchResultsArrays = await Promise.all(
      searchQueries.map((q) => searchEvents(q, { maxResults: 20 }))
    );

    const allResults = searchResultsArrays.flatMap((r) => r.results);
    const sortedEvents = await processSearchResults(allResults);

    return NextResponse.json({
      events: sortedEvents,
      count: sortedEvents.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { queries, accessToken } = body;

    const selfHosted = isSelfHostedMode();
    const tokenToUse = selfHosted ? undefined : accessToken;

    const searchQueries = queries && Array.isArray(queries) && queries.length > 0
      ? queries.slice(0, 12)
      : THREAT_QUERIES;

    const searchResultsArrays = await Promise.all(
      searchQueries.map((query: string) =>
        searchEvents(query, { maxResults: 20, accessToken: tokenToUse })
      )
    );

    const requiresReauth = searchResultsArrays.some((r) => r.requiresReauth);
    if (requiresReauth) {
      return NextResponse.json(
        { error: "auth_error", message: "Session expired. Please sign in again.", requiresReauth: true },
        { status: 401 }
      );
    }

    const allResults = searchResultsArrays.flatMap((r) => r.results);
    const sortedEvents = await processSearchResults(allResults);

    return NextResponse.json({
      events: sortedEvents,
      count: sortedEvents.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
