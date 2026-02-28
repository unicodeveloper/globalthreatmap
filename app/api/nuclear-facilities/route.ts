import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface NuclearFacility {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  type: "enrichment" | "weapons" | "power" | "research" | "reprocessing" | "test_site" | "military";
  status: "active" | "decommissioned" | "under_construction" | "suspected";
  description: string;
}

const FACILITIES: NuclearFacility[] = [
  // Iran
  {
    id: "ir-natanz",
    name: "Natanz",
    country: "Iran",
    latitude: 33.7225,
    longitude: 51.7264,
    type: "enrichment",
    status: "active",
    description: "Primary uranium enrichment facility with underground centrifuge halls",
  },
  {
    id: "ir-fordow",
    name: "Fordow",
    country: "Iran",
    latitude: 34.708,
    longitude: 51.235,
    type: "enrichment",
    status: "active",
    description: "Underground uranium enrichment facility built into a mountain",
  },
  {
    id: "ir-isfahan",
    name: "Isfahan",
    country: "Iran",
    latitude: 32.6546,
    longitude: 51.668,
    type: "enrichment",
    status: "active",
    description: "Uranium conversion facility producing UF6 feedstock",
  },
  {
    id: "ir-bushehr",
    name: "Bushehr",
    country: "Iran",
    latitude: 28.8313,
    longitude: 50.8842,
    type: "power",
    status: "active",
    description: "Russian-built nuclear power plant on the Persian Gulf coast",
  },
  {
    id: "ir-arak",
    name: "Arak",
    country: "Iran",
    latitude: 34.3714,
    longitude: 49.2432,
    type: "research",
    status: "active",
    description: "Heavy water reactor facility redesigned under JCPOA",
  },
  {
    id: "ir-parchin",
    name: "Parchin",
    country: "Iran",
    latitude: 35.515,
    longitude: 51.77,
    type: "military",
    status: "suspected",
    description: "Military complex suspected of past nuclear weapons research",
  },

  // Israel
  {
    id: "il-dimona",
    name: "Dimona",
    country: "Israel",
    latitude: 31.0014,
    longitude: 35.1445,
    type: "weapons",
    status: "active",
    description: "Negev Nuclear Research Center, undeclared nuclear weapons production",
  },
  {
    id: "il-soreq",
    name: "Soreq",
    country: "Israel",
    latitude: 31.7583,
    longitude: 34.7167,
    type: "research",
    status: "active",
    description: "Soreq Nuclear Research Center with 5MW research reactor",
  },

  // North Korea
  {
    id: "kp-yongbyon",
    name: "Yongbyon",
    country: "North Korea",
    latitude: 39.7953,
    longitude: 125.7553,
    type: "weapons",
    status: "active",
    description: "Primary nuclear weapons complex with reactor and reprocessing plant",
  },

  // Pakistan
  {
    id: "pk-kahuta",
    name: "Kahuta",
    country: "Pakistan",
    latitude: 33.5917,
    longitude: 73.3856,
    type: "enrichment",
    status: "active",
    description: "Khan Research Laboratories, centrifuge-based uranium enrichment",
  },
  {
    id: "pk-khushab",
    name: "Khushab",
    country: "Pakistan",
    latitude: 32.0333,
    longitude: 72.2167,
    type: "weapons",
    status: "active",
    description: "Plutonium production reactors for nuclear weapons program",
  },

  // India
  {
    id: "in-bhabha",
    name: "Bhabha Atomic Research Centre",
    country: "India",
    latitude: 19.0144,
    longitude: 72.9208,
    type: "research",
    status: "active",
    description: "India's primary nuclear research complex in Mumbai",
  },
  {
    id: "in-tarapur",
    name: "Tarapur",
    country: "India",
    latitude: 19.8333,
    longitude: 72.6833,
    type: "power",
    status: "active",
    description: "India's oldest nuclear power station with BWR and PHWR units",
  },

  // Russia
  {
    id: "ru-sarov",
    name: "Sarov",
    country: "Russia",
    latitude: 54.9333,
    longitude: 43.3167,
    type: "weapons",
    status: "active",
    description: "RFNC-VNIIEF, Russia's primary nuclear weapons design laboratory",
  },
  {
    id: "ru-mayak",
    name: "Mayak",
    country: "Russia",
    latitude: 55.7167,
    longitude: 60.8333,
    type: "reprocessing",
    status: "active",
    description: "Nuclear fuel reprocessing and weapons material production facility",
  },

  // China
  {
    id: "cn-lopnur",
    name: "Lop Nur",
    country: "China",
    latitude: 41.5722,
    longitude: 88.3703,
    type: "test_site",
    status: "decommissioned",
    description: "Former nuclear weapons test site in Xinjiang, 45 tests conducted",
  },
  {
    id: "cn-jiuquan",
    name: "Jiuquan",
    country: "China",
    latitude: 39.7333,
    longitude: 98.5,
    type: "enrichment",
    status: "active",
    description: "Gaseous diffusion and centrifuge uranium enrichment complex",
  },

  // USA
  {
    id: "us-losalamos",
    name: "Los Alamos",
    country: "USA",
    latitude: 35.8819,
    longitude: -106.2992,
    type: "weapons",
    status: "active",
    description: "Los Alamos National Laboratory, nuclear weapons design and research",
  },
  {
    id: "us-oakridge",
    name: "Oak Ridge",
    country: "USA",
    latitude: 35.931,
    longitude: -84.31,
    type: "enrichment",
    status: "active",
    description: "Y-12 National Security Complex, uranium processing and storage",
  },
  {
    id: "us-hanford",
    name: "Hanford",
    country: "USA",
    latitude: 46.5503,
    longitude: -119.4886,
    type: "reprocessing",
    status: "decommissioned",
    description: "Former plutonium production site, now undergoing environmental cleanup",
  },

  // France
  {
    id: "fr-lahague",
    name: "La Hague",
    country: "France",
    latitude: 49.6783,
    longitude: -1.8814,
    type: "reprocessing",
    status: "active",
    description: "World's largest commercial nuclear fuel reprocessing plant",
  },
  {
    id: "fr-marcoule",
    name: "Marcoule",
    country: "France",
    latitude: 44.1464,
    longitude: 4.7086,
    type: "research",
    status: "active",
    description: "CEA research center for nuclear energy and waste management",
  },

  // UK
  {
    id: "uk-sellafield",
    name: "Sellafield",
    country: "UK",
    latitude: 54.4204,
    longitude: -3.498,
    type: "reprocessing",
    status: "active",
    description: "Nuclear reprocessing and decommissioning site in Cumbria",
  },
  {
    id: "uk-aldermaston",
    name: "Aldermaston",
    country: "UK",
    latitude: 51.355,
    longitude: -1.147,
    type: "weapons",
    status: "active",
    description: "Atomic Weapons Establishment, UK nuclear warhead design and manufacture",
  },
];

const MIDDLE_EAST_COUNTRIES = new Set(["Iran", "Israel", "Pakistan", "India"]);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region");

  let filtered = FACILITIES;

  if (region === "middle-east") {
    filtered = FACILITIES.filter((f) => MIDDLE_EAST_COUNTRIES.has(f.country));
  }

  return NextResponse.json({
    facilities: filtered,
    count: filtered.length,
  });
}
