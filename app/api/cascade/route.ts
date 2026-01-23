import { NextRequest, NextResponse } from "next/server";
import { Valyu } from "valyu-js";

const valyuClient = new Valyu(process.env.VALYU_API_KEY || "");

// JSON Schema for structured cascade output
const cascadeSchema = {
  type: "object",
  properties: {
    effects: {
      type: "array",
      description: "List of countries that may be affected by the cascade effects of this event",
      items: {
        type: "object",
        properties: {
          country: {
            type: "string",
            description: "Full name of the affected country",
          },
          countryCode: {
            type: "string",
            description: "ISO 3166-1 alpha-2 country code (e.g., US, GB, DE)",
          },
          latitude: {
            type: "number",
            description: "Latitude coordinate of the country's geographic center",
          },
          longitude: {
            type: "number",
            description: "Longitude coordinate of the country's geographic center",
          },
          probability: {
            type: "number",
            description: "Probability of being affected (0-100)",
          },
          timeframeHours: {
            type: "number",
            description: "Expected timeframe for impact in hours",
          },
          impactType: {
            type: "string",
            enum: ["economic", "military", "political", "humanitarian", "social"],
            description: "Primary type of impact expected",
          },
          description: {
            type: "string",
            description: "Brief explanation of why and how this country would be affected",
          },
          factors: {
            type: "array",
            items: { type: "string" },
            description: "Key factors contributing to the cascade effect (e.g., 'Neighboring country', 'Major trade partner', 'Military alliance')",
          },
        },
        required: ["country", "countryCode", "latitude", "longitude", "probability", "timeframeHours", "impactType", "description", "factors"],
      },
    },
    summary: {
      type: "string",
      description: "A 2-3 sentence summary of the overall cascade analysis",
    },
  },
  required: ["effects", "summary"],
};

export async function POST(request: NextRequest) {
  try {
    const { event } = await request.json();

    if (!event) {
      return NextResponse.json({ error: "Event data required" }, { status: 400 });
    }

    const eventCountry = event.location?.country || "Unknown";
    const eventCategory = event.category || "conflict";

    // Use Valyu to analyze potential cascade effects with structured output
    const analysisQuery = `Analyze the potential geopolitical and economic ripple effects of this event:

Event Title: "${event.title}"
Location: ${eventCountry}
Category: ${eventCategory}
Summary: ${event.summary || "No summary available"}

Identify 8-12 countries most likely to be affected by cascade effects from this event. For each country, analyze:

1. The probability of being affected (0-100%) based on:
   - Geographic proximity (neighboring countries)
   - Economic ties (trade partners, supply chains)
   - Political/military alliances
   - Historical relationships and tensions
   - Regional stability implications

2. The expected timeframe for when effects would manifest (in hours)

3. The primary type of impact (economic, military, political, humanitarian, or social)

4. A clear explanation of why this country would be affected

5. The key factors driving the cascade effect

Provide accurate geographic coordinates (latitude/longitude) for each country's center point.
Sort the results by probability of impact (highest first).`;

    const response = await valyuClient.answer(analysisQuery, {
      structuredOutput: cascadeSchema,
      searchType: "news",
      excludedSources: ["wikipedia.org"],
    });

    console.log("Valyu response:", JSON.stringify(response, null, 2));

    // Extract the structured response - contents may be string or object
    let analysisData: {
      effects: Array<{
        country: string;
        countryCode: string;
        latitude: number;
        longitude: number;
        probability: number;
        timeframeHours: number;
        impactType: "economic" | "military" | "political" | "humanitarian" | "social";
        description: string;
        factors: string[];
      }>;
      summary: string;
    };

    if (typeof response.contents === "string") {
      // Try to parse if it's a JSON string
      try {
        analysisData = JSON.parse(response.contents);
      } catch {
        throw new Error("Failed to parse structured response: " + response.contents?.substring(0, 200));
      }
    } else if (response.contents && typeof response.contents === "object") {
      analysisData = response.contents as typeof analysisData;
    } else {
      throw new Error("No contents in response: " + JSON.stringify(response).substring(0, 500));
    }

    // Transform effects to include id and delay for animation
    const effects = analysisData.effects.map((effect, index) => ({
      id: `cascade-${Date.now()}-${index}`,
      targetCountry: effect.country,
      targetCountryCode: effect.countryCode,
      latitude: effect.latitude,
      longitude: effect.longitude,
      probability: effect.probability,
      timeframeHours: effect.timeframeHours,
      impactType: effect.impactType,
      description: effect.description,
      factors: effect.factors,
      delay: index * 150, // Stagger animation
    }));

    const highRiskCount = effects.filter((e) => e.probability >= 60).length;

    return NextResponse.json({
      sourceEvent: event,
      effects,
      summary: analysisData.summary,
      totalAffectedCountries: effects.length,
      highRiskCount,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cascade analysis error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to analyze cascade effects", details: errorMessage },
      { status: 500 }
    );
  }
}
