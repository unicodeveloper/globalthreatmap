import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CLIENT_ID = process.env.OPENSKY_CLIENT_ID;
const CLIENT_SECRET = process.env.OPENSKY_CLIENT_SECRET;

const CONFLICT_REGIONS = [
  { name: "Middle East", lamin: 12, lomin: 30, lamax: 42, lomax: 65 },
  { name: "Ukraine-Black Sea", lamin: 44, lomin: 22, lamax: 53, lomax: 41 },
  { name: "Taiwan Strait", lamin: 21, lomin: 116, lamax: 28, lomax: 124 },
];

// Military callsign prefixes
const MILITARY_PREFIXES = [
  // US Air Force
  "RCH", "REACH", "DUKE", "KING", "HOMER", "GOLD", "BLUE", "SPAR", "SAM",
  "SHELL", "TEXACO", "ARCO", "ESSO", "PETRO",
  // US reconnaissance/special
  "FORTE", "JAKE", "COBRA", "RIVET", "OLIVE", "DRAGN",
  // US bombers
  "BONE", "DEATH", "DOOM",
  // US AWACS
  "SENTRY", "MAGIC", "DISCO",
  // US fighters
  "VIPER", "RAPTOR", "BOLT",
  // US transport/medevac
  "MOOSE", "EVAC", "DUSTOFF", "PEDRO",
  // US Navy
  "CNV", "NAVY",
  // NATO
  "NATO", "LAGR",
  // UK RAF
  "RRR", "ASCOT", "TARTAN",
  // Other NATO
  "IAM", "GAF", "FAF", "BAF",
  // Regional
  "THK", "RSAF", "UAF", "EMIRI", "IAF",
  // Drones
  "REAPER", "HAWK",
];

// US military ICAO24 hex ranges (AE xxxx block)
function isUSMilitaryHex(icao24: string): boolean {
  const hex = parseInt(icao24, 16);
  return hex >= 0xAE0000 && hex <= 0xAFFFFF;
}

// Known military origin countries (for filtering in conflict zones)
const MILITARY_ORIGIN_COUNTRIES = [
  "United States", "Russia", "China", "Israel", "Iran",
  "Turkey", "United Kingdom", "France", "Germany",
  "Saudi Arabia", "United Arab Emirates", "India", "Pakistan",
];

// Countries where ALL flights are interesting given current tensions
const HIGH_INTEREST_COUNTRIES = [
  "Iran", "Israel", "Russia", "Ukraine",
];

// Standard airline callsign pattern: 2-3 letter code + digits (e.g. UAE123, PGT4MZ)
const AIRLINE_PATTERN = /^[A-Z]{2,3}\d/;

type AircraftType = "fighter" | "bomber" | "transport" | "tanker" | "awacs" | "reconnaissance" | "drone" | "helicopter" | "unknown";

function classifyAircraftType(callsign: string): AircraftType {
  const cs = callsign.toUpperCase().trim();
  if (/^(SHELL|TEXACO|ARCO|ESSO|PETRO|KING|HOMER|GOLD|BLUE)/.test(cs)) return "tanker";
  if (/^(SENTRY|MAGIC|DISCO|LAGR)/.test(cs)) return "awacs";
  if (/^(RCH|REACH|MOOSE|EVAC|DUSTOFF|PEDRO|SPAR|SAM|RRR|ASCOT)/.test(cs)) return "transport";
  if (/^(FORTE|JAKE|COBRA|RIVET|OLIVE|DRAGN)/.test(cs)) return "reconnaissance";
  if (/^(REAPER|HAWK)/.test(cs)) return "drone";
  if (/^(BONE|DEATH|DOOM)/.test(cs)) return "bomber";
  if (/^(VIPER|RAPTOR|BOLT)/.test(cs)) return "fighter";
  return "unknown";
}

function isMilitaryCallsign(callsign: string): boolean {
  const cs = callsign.toUpperCase().trim();
  return MILITARY_PREFIXES.some((prefix) => cs.startsWith(prefix));
}

export interface MilitaryFlight {
  icao24: string;
  callsign: string;
  originCountry: string;
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  heading: number;
  verticalRate: number;
  onGround: boolean;
  squawk: string;
  aircraftType: AircraftType;
  confidence: "high" | "medium" | "low";
  region: string;
}

// In-memory cache
let cachedFlights: MilitaryFlight[] = [];
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 60 seconds

let accessToken: string | null = null;
let tokenExpiry = 0;

async function getAccessToken(): Promise<string | null> {
  if (!CLIENT_ID || !CLIENT_SECRET) return null;
  if (accessToken && Date.now() < tokenExpiry) return accessToken;

  try {
    const response = await fetch(
      "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
        }),
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    accessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // Refresh 60s early
    return accessToken;
  } catch {
    return null;
  }
}

async function fetchRegionFlights(
  region: { name: string; lamin: number; lomin: number; lamax: number; lomax: number },
  token: string | null
): Promise<MilitaryFlight[]> {
  try {
    const params = new URLSearchParams({
      lamin: String(region.lamin),
      lomin: String(region.lomin),
      lamax: String(region.lamax),
      lomax: String(region.lomax),
      extended: "1",
    });

    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(
      `https://opensky-network.org/api/states/all?${params}`,
      { headers, next: { revalidate: 30 } }
    );

    if (!response.ok) return [];

    const data = await response.json();
    if (!data.states) return [];

    const flights: MilitaryFlight[] = [];

    for (const state of data.states) {
      const icao24: string = state[0] || "";
      const callsign: string = (state[1] || "").trim();
      const originCountry: string = state[2] || "";
      const longitude: number | null = state[5];
      const latitude: number | null = state[6];
      const baroAltitude: number | null = state[7];
      const onGround: boolean = state[8] || false;
      const velocity: number | null = state[9];
      const heading: number | null = state[10];
      const verticalRate: number | null = state[11];
      const squawk: string = state[14] || "";
      const category: number = state[17] || 0;

      // Skip aircraft without position
      if (latitude === null || longitude === null) continue;

      // Classify as military/interesting
      let confidence: "high" | "medium" | "low" = "low";
      let isMilitary = false;

      // Layer 1: Callsign match (highest confidence)
      if (callsign && isMilitaryCallsign(callsign)) {
        isMilitary = true;
        confidence = "high";
      }

      // Layer 2: ICAO hex range
      if (!isMilitary && isUSMilitaryHex(icao24)) {
        isMilitary = true;
        confidence = "high";
      }

      // Layer 3: High-interest countries - all flights are noteworthy
      if (!isMilitary && HIGH_INTEREST_COUNTRIES.includes(originCountry)) {
        isMilitary = true;
        confidence = callsign && !AIRLINE_PATTERN.test(callsign) ? "medium" : "low";
      }

      // Layer 4: Military country + special aircraft category
      if (!isMilitary && MILITARY_ORIGIN_COUNTRIES.includes(originCountry)) {
        if (category === 7) {
          isMilitary = true;
          confidence = "medium";
        } else if (category === 6 && callsign && !AIRLINE_PATTERN.test(callsign)) {
          isMilitary = true;
          confidence = "low";
        }
      }

      // Layer 5: UAVs, rotorcraft, and aircraft with no callsign from military countries
      if (!isMilitary) {
        if (category === 14) {
          // UAV/drone
          isMilitary = true;
          confidence = "high";
        } else if (category === 8 && MILITARY_ORIGIN_COUNTRIES.includes(originCountry)) {
          // Rotorcraft from military country
          isMilitary = true;
          confidence = "medium";
        } else if (!callsign && MILITARY_ORIGIN_COUNTRIES.includes(originCountry)) {
          // No callsign from military country = suspicious
          isMilitary = true;
          confidence = "low";
        }
      }

      // Layer 6: Special squawk codes
      if (squawk === "7700" || squawk === "7600" || squawk === "7500" || squawk === "7777" || squawk === "0000") {
        isMilitary = true;
        if (squawk === "7777") confidence = "high";
        else if (squawk === "7700" || squawk === "7500") confidence = "medium";
      }

      // Layer 7: Non-airline callsign from any country (catch military-style callsigns)
      if (!isMilitary && callsign && !AIRLINE_PATTERN.test(callsign) && callsign.length >= 3) {
        // Skip on-ground aircraft to reduce noise
        if (!onGround) {
          isMilitary = true;
          confidence = "low";
        }
      }

      if (!isMilitary) continue;

      flights.push({
        icao24,
        callsign: callsign || icao24.toUpperCase(),
        originCountry,
        latitude,
        longitude,
        altitude: Math.round((baroAltitude || 0) * 3.28084), // meters to feet
        velocity: Math.round((velocity || 0) * 1.94384), // m/s to knots
        heading: heading || 0,
        verticalRate: Math.round((verticalRate || 0) * 196.85), // m/s to ft/min
        onGround,
        squawk,
        aircraftType: callsign ? classifyAircraftType(callsign) : "unknown",
        confidence,
        region: region.name,
      });
    }

    return flights;
  } catch {
    return [];
  }
}

export async function GET() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return NextResponse.json(
      { error: "OpenSky credentials not configured" },
      { status: 500 }
    );
  }

  // Return cached data if fresh
  if (Date.now() - cacheTimestamp < CACHE_TTL && cachedFlights.length > 0) {
    return NextResponse.json({
      flights: cachedFlights,
      count: cachedFlights.length,
      regions: CONFLICT_REGIONS.map((r) => r.name),
      cached: true,
      timestamp: new Date(cacheTimestamp).toISOString(),
    });
  }

  try {
    const token = await getAccessToken();

    const results = await Promise.all(
      CONFLICT_REGIONS.map((region) => fetchRegionFlights(region, token))
    );

    const allFlights = results.flat();

    // Deduplicate by icao24
    const seen = new Set<string>();
    const unique = allFlights.filter((f) => {
      if (seen.has(f.icao24)) return false;
      seen.add(f.icao24);
      return true;
    });

    // Cache results
    cachedFlights = unique;
    cacheTimestamp = Date.now();

    return NextResponse.json({
      flights: unique,
      count: unique.length,
      regions: CONFLICT_REGIONS.map((r) => r.name),
      cached: false,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching military flights:", error);
    return NextResponse.json(
      { error: "Failed to fetch military flights" },
      { status: 500 }
    );
  }
}
