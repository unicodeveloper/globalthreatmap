import { NextRequest, NextResponse } from "next/server";
import {
  fetchGeopoliticalMarkets,
  fetchCountryMarkets,
  searchMarkets,
} from "@/lib/polymarket";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type") || "geopolitical";
  const country = searchParams.get("country");
  const query = searchParams.get("query");
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  try {
    let markets;

    if (type === "country" && country) {
      markets = await fetchCountryMarkets(country, limit);
    } else if (type === "search" && query) {
      markets = await searchMarkets(query, limit);
    } else {
      markets = await fetchGeopoliticalMarkets(limit);
    }

    return NextResponse.json({
      success: true,
      markets,
      count: markets.length,
    });
  } catch (error) {
    console.error("Polymarket API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch markets",
        markets: [],
      },
      { status: 500 }
    );
  }
}
