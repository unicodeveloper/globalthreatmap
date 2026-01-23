import { NextRequest, NextResponse } from "next/server";
import { Valyu } from "valyu-js";

const valyuClient = new Valyu(process.env.VALYU_API_KEY || "");

// Country data with coordinates and relationships
const COUNTRY_DATA: Record<
  string,
  {
    code: string;
    lat: number;
    lng: number;
    neighbors: string[];
    economicPartners: string[];
    alliances: string[];
    region: string;
  }
> = {
  Ukraine: {
    code: "UA",
    lat: 48.3794,
    lng: 31.1656,
    neighbors: ["Russia", "Belarus", "Poland", "Slovakia", "Hungary", "Romania", "Moldova"],
    economicPartners: ["Germany", "Poland", "Turkey", "China", "Italy"],
    alliances: ["EU-candidate"],
    region: "Eastern Europe",
  },
  Russia: {
    code: "RU",
    lat: 61.524,
    lng: 105.3188,
    neighbors: ["Ukraine", "Belarus", "Finland", "Estonia", "Latvia", "Lithuania", "Poland", "Georgia", "Azerbaijan", "Kazakhstan", "China", "Mongolia", "North Korea"],
    economicPartners: ["China", "India", "Turkey", "Belarus", "Kazakhstan"],
    alliances: ["CSTO", "BRICS"],
    region: "Eurasia",
  },
  China: {
    code: "CN",
    lat: 35.8617,
    lng: 104.1954,
    neighbors: ["Russia", "Mongolia", "North Korea", "Vietnam", "Laos", "Myanmar", "India", "Bhutan", "Nepal", "Pakistan", "Afghanistan", "Tajikistan", "Kyrgyzstan", "Kazakhstan"],
    economicPartners: ["United States", "Japan", "South Korea", "Germany", "Australia", "Vietnam"],
    alliances: ["SCO", "BRICS"],
    region: "East Asia",
  },
  "United States": {
    code: "US",
    lat: 37.0902,
    lng: -95.7129,
    neighbors: ["Canada", "Mexico"],
    economicPartners: ["China", "Canada", "Mexico", "Japan", "Germany", "United Kingdom", "South Korea"],
    alliances: ["NATO", "AUKUS", "Five Eyes"],
    region: "North America",
  },
  Israel: {
    code: "IL",
    lat: 31.0461,
    lng: 34.8516,
    neighbors: ["Lebanon", "Syria", "Jordan", "Egypt", "Palestine"],
    economicPartners: ["United States", "China", "United Kingdom", "Germany", "India"],
    alliances: ["US-ally"],
    region: "Middle East",
  },
  Iran: {
    code: "IR",
    lat: 32.4279,
    lng: 53.688,
    neighbors: ["Iraq", "Turkey", "Armenia", "Azerbaijan", "Turkmenistan", "Afghanistan", "Pakistan"],
    economicPartners: ["China", "UAE", "Turkey", "Iraq", "India"],
    alliances: ["SCO-observer"],
    region: "Middle East",
  },
  Germany: {
    code: "DE",
    lat: 51.1657,
    lng: 10.4515,
    neighbors: ["France", "Belgium", "Netherlands", "Luxembourg", "Switzerland", "Austria", "Czech Republic", "Poland", "Denmark"],
    economicPartners: ["United States", "China", "France", "Netherlands", "United Kingdom", "Italy", "Poland"],
    alliances: ["NATO", "EU"],
    region: "Western Europe",
  },
  Poland: {
    code: "PL",
    lat: 51.9194,
    lng: 19.1451,
    neighbors: ["Germany", "Czech Republic", "Slovakia", "Ukraine", "Belarus", "Lithuania", "Russia"],
    economicPartners: ["Germany", "Czech Republic", "United Kingdom", "France", "Italy"],
    alliances: ["NATO", "EU"],
    region: "Eastern Europe",
  },
  Taiwan: {
    code: "TW",
    lat: 23.6978,
    lng: 120.9605,
    neighbors: [],
    economicPartners: ["China", "United States", "Japan", "South Korea", "Singapore"],
    alliances: ["US-partner"],
    region: "East Asia",
  },
  Japan: {
    code: "JP",
    lat: 36.2048,
    lng: 138.2529,
    neighbors: [],
    economicPartners: ["China", "United States", "South Korea", "Taiwan", "Thailand"],
    alliances: ["US-ally", "Quad"],
    region: "East Asia",
  },
  "South Korea": {
    code: "KR",
    lat: 35.9078,
    lng: 127.7669,
    neighbors: ["North Korea"],
    economicPartners: ["China", "United States", "Japan", "Vietnam", "Taiwan"],
    alliances: ["US-ally"],
    region: "East Asia",
  },
  "North Korea": {
    code: "KP",
    lat: 40.3399,
    lng: 127.5101,
    neighbors: ["South Korea", "China", "Russia"],
    economicPartners: ["China", "Russia"],
    alliances: [],
    region: "East Asia",
  },
  India: {
    code: "IN",
    lat: 20.5937,
    lng: 78.9629,
    neighbors: ["Pakistan", "China", "Nepal", "Bhutan", "Bangladesh", "Myanmar"],
    economicPartners: ["United States", "China", "UAE", "Saudi Arabia", "Iraq"],
    alliances: ["Quad", "BRICS"],
    region: "South Asia",
  },
  Pakistan: {
    code: "PK",
    lat: 30.3753,
    lng: 69.3451,
    neighbors: ["India", "Afghanistan", "Iran", "China"],
    economicPartners: ["China", "UAE", "Saudi Arabia", "United States"],
    alliances: ["China-ally"],
    region: "South Asia",
  },
  "Saudi Arabia": {
    code: "SA",
    lat: 23.8859,
    lng: 45.0792,
    neighbors: ["Jordan", "Iraq", "Kuwait", "Qatar", "UAE", "Oman", "Yemen"],
    economicPartners: ["China", "United States", "Japan", "India", "South Korea"],
    alliances: ["GCC", "US-partner"],
    region: "Middle East",
  },
  Turkey: {
    code: "TR",
    lat: 38.9637,
    lng: 35.2433,
    neighbors: ["Greece", "Bulgaria", "Georgia", "Armenia", "Iran", "Iraq", "Syria"],
    economicPartners: ["Germany", "United Kingdom", "Italy", "Iraq", "United States"],
    alliances: ["NATO"],
    region: "Middle East",
  },
  "United Kingdom": {
    code: "GB",
    lat: 55.3781,
    lng: -3.436,
    neighbors: ["Ireland"],
    economicPartners: ["United States", "Germany", "Netherlands", "France", "China"],
    alliances: ["NATO", "Five Eyes", "AUKUS"],
    region: "Western Europe",
  },
  France: {
    code: "FR",
    lat: 46.2276,
    lng: 2.2137,
    neighbors: ["Belgium", "Luxembourg", "Germany", "Switzerland", "Italy", "Spain", "Andorra", "Monaco"],
    economicPartners: ["Germany", "United States", "Italy", "Spain", "Belgium"],
    alliances: ["NATO", "EU"],
    region: "Western Europe",
  },
  Syria: {
    code: "SY",
    lat: 34.8021,
    lng: 38.9968,
    neighbors: ["Turkey", "Iraq", "Jordan", "Israel", "Lebanon"],
    economicPartners: ["Russia", "China", "Iran", "UAE"],
    alliances: ["Russia-ally", "Iran-ally"],
    region: "Middle East",
  },
  Lebanon: {
    code: "LB",
    lat: 33.8547,
    lng: 35.8623,
    neighbors: ["Syria", "Israel"],
    economicPartners: ["UAE", "Saudi Arabia", "China", "Turkey"],
    alliances: [],
    region: "Middle East",
  },
  Egypt: {
    code: "EG",
    lat: 26.8206,
    lng: 30.8025,
    neighbors: ["Libya", "Sudan", "Israel", "Palestine"],
    economicPartners: ["United States", "UAE", "Saudi Arabia", "China", "Turkey"],
    alliances: ["US-partner", "Arab League"],
    region: "Middle East",
  },
  Sudan: {
    code: "SD",
    lat: 12.8628,
    lng: 30.2176,
    neighbors: ["Egypt", "Libya", "Chad", "Central African Republic", "South Sudan", "Ethiopia", "Eritrea"],
    economicPartners: ["UAE", "China", "Saudi Arabia", "India"],
    alliances: [],
    region: "Africa",
  },
  Ethiopia: {
    code: "ET",
    lat: 9.145,
    lng: 40.4897,
    neighbors: ["Eritrea", "Djibouti", "Somalia", "Kenya", "South Sudan", "Sudan"],
    economicPartners: ["China", "United States", "Saudi Arabia", "UAE"],
    alliances: ["AU"],
    region: "Africa",
  },
  Nigeria: {
    code: "NG",
    lat: 9.082,
    lng: 8.6753,
    neighbors: ["Benin", "Niger", "Chad", "Cameroon"],
    economicPartners: ["India", "United States", "Spain", "Netherlands", "France"],
    alliances: ["AU", "ECOWAS"],
    region: "Africa",
  },
  Brazil: {
    code: "BR",
    lat: -14.235,
    lng: -51.9253,
    neighbors: ["Argentina", "Paraguay", "Bolivia", "Peru", "Colombia", "Venezuela", "Guyana", "Suriname", "French Guiana", "Uruguay"],
    economicPartners: ["China", "United States", "Argentina", "Netherlands", "Germany"],
    alliances: ["BRICS", "Mercosur"],
    region: "South America",
  },
  Australia: {
    code: "AU",
    lat: -25.2744,
    lng: 133.7751,
    neighbors: [],
    economicPartners: ["China", "Japan", "United States", "South Korea", "India"],
    alliances: ["AUKUS", "Five Eyes", "Quad"],
    region: "Oceania",
  },
};

// Impact type descriptions based on event category
const IMPACT_MAPPINGS: Record<string, string[]> = {
  conflict: ["military", "humanitarian", "economic", "political"],
  military: ["military", "political", "economic"],
  terrorism: ["political", "social", "economic"],
  protest: ["political", "social", "economic"],
  economic: ["economic", "political", "social"],
  diplomatic: ["political", "economic"],
  disaster: ["humanitarian", "economic"],
  cyber: ["economic", "military", "political"],
  health: ["humanitarian", "economic", "social"],
  environmental: ["humanitarian", "economic"],
};

export async function POST(request: NextRequest) {
  try {
    const { event } = await request.json();

    if (!event) {
      return NextResponse.json({ error: "Event data required" }, { status: 400 });
    }

    const eventCountry = event.location?.country || "Unknown";
    const eventCategory = event.category || "conflict";

    // Use Valyu to analyze potential cascade effects
    const analysisQuery = `Analyze the potential geopolitical and economic ripple effects of this event: "${event.title}".

    The event occurred in ${eventCountry} and is categorized as: ${eventCategory}.

    For each potentially affected country, provide:
    1. How likely they are to be affected (probability 0-100%)
    2. Expected timeframe for impact (hours/days)
    3. Type of impact (economic, military, political, humanitarian, social)
    4. Brief explanation of why they would be affected

    Focus on:
    - Neighboring countries
    - Major trading partners
    - Military allies
    - Countries with historical tensions
    - Supply chain dependencies

    List the top 8-12 most likely affected countries.`;

    type AnswerResponse = {
      contents?: string;
      search_results?: Array<{ title?: string; url?: string }>;
    };

    const response = await valyuClient.answer(analysisQuery, {
      excludedSources: ["wikipedia.org"],
    });

    const answerData = response as AnswerResponse;
    const analysisContent = answerData.contents || "";

    // Parse the AI response and build cascade effects
    const effects: Array<{
      id: string;
      targetCountry: string;
      targetCountryCode: string;
      latitude: number;
      longitude: number;
      probability: number;
      timeframeHours: number;
      impactType: string;
      description: string;
      factors: string[];
      delay: number;
    }> = [];

    // Get the source country data
    const sourceCountryData = COUNTRY_DATA[eventCountry];

    // Determine affected countries based on relationships + AI analysis
    const affectedCountries = new Set<string>();

    // Add neighbors
    if (sourceCountryData) {
      sourceCountryData.neighbors.forEach((c) => affectedCountries.add(c));
      sourceCountryData.economicPartners.slice(0, 5).forEach((c) => affectedCountries.add(c));
    }

    // Parse AI response for mentioned countries
    Object.keys(COUNTRY_DATA).forEach((country) => {
      if (country !== eventCountry && analysisContent.toLowerCase().includes(country.toLowerCase())) {
        affectedCountries.add(country);
      }
    });

    // Build effects for each affected country
    let delay = 0;
    const impactTypes = IMPACT_MAPPINGS[eventCategory] || ["political", "economic"];

    Array.from(affectedCountries).slice(0, 12).forEach((country, index) => {
      const countryData = COUNTRY_DATA[country];
      if (!countryData) return;

      // Calculate probability based on relationship
      let baseProbability = 30;
      if (sourceCountryData?.neighbors.includes(country)) baseProbability += 40;
      if (sourceCountryData?.economicPartners.includes(country)) baseProbability += 20;
      if (sourceCountryData?.alliances.some((a) => countryData.alliances.includes(a))) baseProbability += 15;

      // Add some variance
      const probability = Math.min(95, Math.max(15, baseProbability + Math.floor(Math.random() * 20) - 10));

      // Calculate timeframe
      const isNeighbor = sourceCountryData?.neighbors.includes(country);
      const timeframeHours = isNeighbor ? 24 + Math.floor(Math.random() * 48) : 72 + Math.floor(Math.random() * 168);

      // Determine impact type
      const impactType = impactTypes[index % impactTypes.length];

      // Generate factors
      const factors: string[] = [];
      if (sourceCountryData?.neighbors.includes(country)) factors.push("Neighboring country");
      if (sourceCountryData?.economicPartners.includes(country)) factors.push("Major trade partner");
      if (sourceCountryData?.alliances.some((a) => countryData.alliances.includes(a))) {
        factors.push("Alliance member");
      }
      if (countryData.region === sourceCountryData?.region) factors.push("Same region");

      // Generate description
      let description = `${country} may experience ${impactType} effects`;
      if (isNeighbor) description += " due to direct proximity";
      if (factors.includes("Major trade partner")) description += " through trade disruption";
      description += ".";

      effects.push({
        id: `cascade-${Date.now()}-${index}`,
        targetCountry: country,
        targetCountryCode: countryData.code,
        latitude: countryData.lat,
        longitude: countryData.lng,
        probability,
        timeframeHours,
        impactType,
        description,
        factors,
        delay,
      });

      delay += 150; // Stagger animation
    });

    // Sort by probability
    effects.sort((a, b) => b.probability - a.probability);

    // Update delays after sorting
    effects.forEach((effect, index) => {
      effect.delay = index * 150;
    });

    const highRiskCount = effects.filter((e) => e.probability >= 60).length;

    // Generate summary
    const summary = `This ${eventCategory} event in ${eventCountry} could potentially cascade to ${effects.length} countries. ${highRiskCount} countries face high probability (60%+) of being affected. Primary impact vectors include ${[...new Set(effects.slice(0, 5).map((e) => e.impactType))].join(", ")} effects.`;

    return NextResponse.json({
      sourceEvent: event,
      effects,
      summary,
      totalAffectedCountries: effects.length,
      highRiskCount,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cascade analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze cascade effects" },
      { status: 500 }
    );
  }
}
