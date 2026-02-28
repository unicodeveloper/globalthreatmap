import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const USGS_ENDPOINT = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson";
const CACHE_TTL = 60_000;

interface Earthquake {
  id: string;
  magnitude: number;
  place: string;
  latitude: number;
  longitude: number;
  depth: number;
  time: string;
  url: string;
  tsunami: boolean;
  felt: number | null;
  significance: number;
}

let cache: { data: Earthquake[]; timestamp: number } | null = null;

function parseFeatures(features: Array<Record<string, unknown>>): Earthquake[] {
  return features
    .map((feature) => {
      const props = feature.properties as Record<string, unknown>;
      const geometry = feature.geometry as { coordinates: number[] };

      return {
        id: feature.id as string,
        magnitude: props.mag as number,
        place: (props.place as string) || "Unknown",
        latitude: geometry.coordinates[1],
        longitude: geometry.coordinates[0],
        depth: geometry.coordinates[2],
        time: new Date(props.time as number).toISOString(),
        url: (props.url as string) || "",
        tsunami: (props.tsunami as number) === 1,
        felt: (props.felt as number) ?? null,
        significance: (props.sig as number) || 0,
      };
    })
    .sort((a, b) => b.magnitude - a.magnitude);
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({
        earthquakes: cache.data,
        count: cache.data.length,
        timestamp: new Date(cache.timestamp).toISOString(),
      });
    }

    const response = await fetch(USGS_ENDPOINT);

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch earthquake data from USGS" },
        { status: 502 }
      );
    }

    const geojson = await response.json();
    const earthquakes = parseFeatures(geojson.features || []);

    cache = { data: earthquakes, timestamp: Date.now() };

    return NextResponse.json({
      earthquakes,
      count: earthquakes.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching earthquake data:", error);
    return NextResponse.json(
      { error: "Failed to fetch earthquake data" },
      { status: 500 }
    );
  }
}
