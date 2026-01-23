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

async function processSearchResults(
  results: Array<{ title: string; url: string; content: string; publishedDate?: string; source?: string }>
): Promise<ThreatEvent[]> {
  const eventsWithLocations = await Promise.all(
    results.map(async (result) => {
      const cleanedTitle = cleanContent(result.title);
      const cleanedContent = cleanContent(result.content);
      const fullText = `${cleanedTitle} ${cleanedContent}`;

      // Use AI classification (falls back to keywords if OpenAI not available)
      const classification = await classifyEvent(cleanedTitle, cleanedContent);

      // Skip events without valid locations
      if (!classification.location) {
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

  const uniqueEvents = validEvents.filter(
    (event, index, self) =>
      index === self.findIndex((e) => e.title === event.title)
  );

  return uniqueEvents.sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime();
    const dateB = new Date(b.timestamp).getTime();
    return dateB - dateA;
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  try {
    const searchQueries = query ? [query] : THREAT_QUERIES.slice(0, 3);

    const searchResultsArrays = await Promise.all(
      searchQueries.map((q) => searchEvents(q, { maxResults: 10 }))
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
      ? queries.slice(0, 5)
      : THREAT_QUERIES.slice(0, 3);

    const searchResultsArrays = await Promise.all(
      searchQueries.map((query: string) =>
        searchEvents(query, { maxResults: 15, accessToken: tokenToUse })
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
