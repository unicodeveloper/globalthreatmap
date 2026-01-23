import { z } from "zod";

export const ThreatLevel = z.enum(["critical", "high", "medium", "low", "info"]);
export type ThreatLevel = z.infer<typeof ThreatLevel>;

export const EventCategory = z.enum([
  "conflict",
  "protest",
  "disaster",
  "diplomatic",
  "economic",
  "terrorism",
  "cyber",
  "health",
  "environmental",
  "military",
  "crime",
  "piracy",
  "infrastructure",
  "commodities",
]);
export type EventCategory = z.infer<typeof EventCategory>;

export const GeoLocation = z.object({
  latitude: z.number(),
  longitude: z.number(),
  placeName: z.string().optional(),
  country: z.string().optional(),
  region: z.string().optional(),
});
export type GeoLocation = z.infer<typeof GeoLocation>;

export const ThreatEvent = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  category: EventCategory,
  threatLevel: ThreatLevel,
  location: GeoLocation,
  timestamp: z.string().datetime(),
  source: z.string(),
  sourceUrl: z.string().url().optional(),
  entities: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  rawContent: z.string().optional(),
});
export type ThreatEvent = z.infer<typeof ThreatEvent>;

export const EntityProfile = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["organization", "person", "country", "group"]),
  description: z.string().optional(),
  locations: z.array(GeoLocation).optional(),
  relatedEntities: z
    .array(
      z.object({
        name: z.string(),
        relationship: z.string(),
      })
    )
    .optional(),
  economicData: z.record(z.string(), z.unknown()).optional(),
  recentEvents: z.array(z.string()).optional(),
  researchSummary: z.string().optional(),
});
export type EntityProfile = z.infer<typeof EntityProfile>;

export interface MapViewport {
  longitude: number;
  latitude: number;
  zoom: number;
  bearing?: number;
  pitch?: number;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export const threatLevelColors: Record<ThreatLevel, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
  info: "#3b82f6",
};

export const categoryIcons: Record<EventCategory, string> = {
  conflict: "Swords",
  protest: "Users",
  disaster: "CloudLightning",
  diplomatic: "Landmark",
  economic: "TrendingDown",
  terrorism: "AlertTriangle",
  cyber: "Shield",
  health: "Heart",
  environmental: "Leaf",
  military: "Target",
  crime: "Skull",
  piracy: "Anchor",
  infrastructure: "Droplets",
  commodities: "ShoppingCart",
};
