import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FIRMS_API_KEY = process.env.NASA_FIRMS_API_KEY;

// Conflict/crisis regions to monitor
const MONITORED_REGIONS = [
  { name: "Iran", bbox: "44,25,63,40" },
  { name: "Israel-Gaza", bbox: "34,29,36,34" },
  { name: "Ukraine", bbox: "22,44,40,53" },
  { name: "Syria", bbox: "35,32,42,37" },
  { name: "Yemen", bbox: "42,12,54,19" },
  { name: "Sudan", bbox: "22,3,38,23" },
  { name: "Taiwan Strait", bbox: "119,21,123,26" },
];

interface FireDetection {
  latitude: number;
  longitude: number;
  brightness: number;
  frp: number;
  confidence: "high" | "nominal" | "low";
  acqDate: string;
  acqTime: string;
  daynight: string;
  region: string;
}

function parseConfidence(c: string): "high" | "nominal" | "low" {
  if (c === "h") return "high";
  if (c === "n") return "nominal";
  return "low";
}

async function fetchRegionFires(region: { name: string; bbox: string }): Promise<FireDetection[]> {
  if (!FIRMS_API_KEY) return [];

  try {
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${FIRMS_API_KEY}/VIIRS_SNPP_NRT/${region.bbox}/1`;
    const response = await fetch(url, { next: { revalidate: 3600 } });

    if (!response.ok) return [];

    const csv = await response.text();
    const lines = csv.trim().split("\n");
    if (lines.length < 2) return [];

    const header = lines[0].split(",");
    const latIdx = header.indexOf("latitude");
    const lonIdx = header.indexOf("longitude");
    const brightIdx = header.indexOf("bright_ti4");
    const frpIdx = header.indexOf("frp");
    const confIdx = header.indexOf("confidence");
    const dateIdx = header.indexOf("acq_date");
    const timeIdx = header.indexOf("acq_time");
    const dnIdx = header.indexOf("daynight");

    return lines.slice(1).map((line) => {
      const cols = line.split(",");
      return {
        latitude: parseFloat(cols[latIdx]),
        longitude: parseFloat(cols[lonIdx]),
        brightness: parseFloat(cols[brightIdx]),
        frp: parseFloat(cols[frpIdx]),
        confidence: parseConfidence(cols[confIdx]),
        acqDate: cols[dateIdx],
        acqTime: cols[timeIdx],
        daynight: cols[dnIdx],
        region: region.name,
      };
    });
  } catch {
    return [];
  }
}

export async function GET() {
  if (!FIRMS_API_KEY) {
    return NextResponse.json(
      { error: "NASA FIRMS API key not configured" },
      { status: 500 }
    );
  }

  try {
    const results = await Promise.all(MONITORED_REGIONS.map(fetchRegionFires));
    const allFires = results.flat();

    // Only return nominal and high confidence detections
    const filtered = allFires.filter((f) => f.confidence !== "low");

    return NextResponse.json({
      fires: filtered,
      count: filtered.length,
      regions: MONITORED_REGIONS.map((r) => r.name),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching fire detections:", error);
    return NextResponse.json(
      { error: "Failed to fetch fire detections" },
      { status: 500 }
    );
  }
}
