import { NextResponse } from "next/server";
import { getEntityResearch, deepResearch, searchEntityLocations, streamEntityResearch } from "@/lib/valyu";

export const dynamic = "force-dynamic";
import { geocodeLocationsFromText } from "@/lib/geocoding";
import type { EntityProfile, GeoLocation } from "@/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const stream = searchParams.get("stream") === "true";

  if (!name) {
    return NextResponse.json(
      { error: "Entity name is required" },
      { status: 400 }
    );
  }

  // Streaming mode - use Server-Sent Events
  if (stream) {
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamEntityResearch(name)) {
            const data = `data: ${JSON.stringify(chunk)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
          controller.close();
        } catch (error) {
          const errorData = `data: ${JSON.stringify({
            type: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Non-streaming mode (original logic)
  const deep = searchParams.get("deep") === "true";

  try {
    const entityData = await getEntityResearch(name);

    if (!entityData) {
      return NextResponse.json(
        { error: "Entity not found" },
        { status: 404 }
      );
    }

    const profile: EntityProfile = {
      id: `entity_${Date.now()}`,
      name: entityData.name,
      type: entityData.type as EntityProfile["type"],
      description: entityData.description,
      locations: [],
      relatedEntities: [],
      economicData: {},
    };

    if (deep) {
      const research = await deepResearch(name);
      profile.researchSummary = research.summary;
    }

    return NextResponse.json({ entity: profile });
  } catch (error) {
    console.error("Error researching entity:", error);
    return NextResponse.json(
      { error: "Failed to research entity" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, includeDeepResearch } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Entity name is required" },
        { status: 400 }
      );
    }

    const [entityData, locationContent] = await Promise.all([
      getEntityResearch(name),
      searchEntityLocations(name),
    ]);

    if (!entityData) {
      return NextResponse.json(
        { error: "Entity not found" },
        { status: 404 }
      );
    }

    // Extract and geocode locations from the search results
    const combinedText = `${entityData.description} ${locationContent}`;
    const locations = await geocodeLocationsFromText(combinedText, entityData.name);

    // Remove duplicates by placeName
    const uniqueLocations = locations.reduce((acc: GeoLocation[], loc) => {
      if (!acc.some(l => l.placeName === loc.placeName)) {
        acc.push(loc);
      }
      return acc;
    }, []);

    const profile: EntityProfile = {
      id: `entity_${Date.now()}`,
      name: entityData.name,
      type: entityData.type as EntityProfile["type"],
      description: entityData.description,
      locations: uniqueLocations,
      relatedEntities: [],
      economicData: entityData.data,
    };

    let deliverables = undefined;
    let pdfUrl = undefined;

    if (includeDeepResearch) {
      const research = await deepResearch(name);
      profile.researchSummary = research.summary;
      deliverables = research.deliverables;
      pdfUrl = research.pdfUrl;

      // Also extract locations from deep research
      const deepLocations = await geocodeLocationsFromText(research.summary);
      for (const loc of deepLocations) {
        if (!profile.locations?.some(l => l.placeName === loc.placeName)) {
          profile.locations?.push(loc);
        }
      }
    }

    return NextResponse.json({ entity: profile, deliverables, pdfUrl });
  } catch (error) {
    console.error("Error researching entity:", error);
    return NextResponse.json(
      { error: "Failed to research entity" },
      { status: 500 }
    );
  }
}
