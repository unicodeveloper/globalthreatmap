"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, {
  NavigationControl,
  GeolocateControl,
  ScaleControl,
  Source,
  Layer,
  Popup,
  type MapRef,
  type MapMouseEvent,
  type LayerProps,
} from "react-map-gl/mapbox";
import { useMapStore } from "@/stores/map-store";
import { useEventsStore } from "@/stores/events-store";
import { useAuthStore } from "@/stores/auth-store";
import { threatLevelColors } from "@/types";
import { EventPopup } from "./event-popup";
import { CountryConflictsModal } from "./country-conflicts-modal";
import { SignInModal } from "@/components/auth/sign-in-modal";

const APP_MODE = process.env.NEXT_PUBLIC_APP_MODE || "self-hosted";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const clusterLayer: LayerProps = {
  id: "clusters",
  type: "circle",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": [
      "step",
      ["get", "maxSeverity"],
      "#3b82f6",
      2,
      "#22c55e",
      3,
      "#eab308",
      4,
      "#f97316",
      5,
      "#ef4444",
    ],
    "circle-radius": ["step", ["get", "point_count"], 12, 10, 16, 30, 20, 100, 24],
    "circle-stroke-width": 2,
    "circle-stroke-color": "#1e293b",
    "circle-opacity": 0.85,
  },
};

const clusterCountLayer: LayerProps = {
  id: "cluster-count",
  type: "symbol",
  filter: ["has", "point_count"],
  layout: {
    "text-field": ["get", "point_count_abbreviated"],
    "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
    "text-size": 11,
  },
  paint: {
    "text-color": "#ffffff",
  },
};

const unclusteredPointLayer: LayerProps = {
  id: "unclustered-point",
  type: "circle",
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": [
      "match",
      ["get", "threatLevel"],
      "critical",
      threatLevelColors.critical,
      "high",
      threatLevelColors.high,
      "medium",
      threatLevelColors.medium,
      "low",
      threatLevelColors.low,
      "info",
      threatLevelColors.info,
      "#3b82f6",
    ],
    "circle-radius": 8,
    "circle-stroke-width": 2,
    "circle-stroke-color": "#1e293b",
  },
};

const heatmapLayer: LayerProps = {
  id: "events-heat",
  type: "heatmap",
  maxzoom: 9,
  paint: {
    "heatmap-weight": [
      "interpolate",
      ["linear"],
      ["get", "severity"],
      0,
      0,
      5,
      1,
    ],
    "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 9, 3],
    "heatmap-color": [
      "interpolate",
      ["linear"],
      ["heatmap-density"],
      0,
      "rgba(0, 0, 0, 0)",
      0.2,
      "rgba(59, 130, 246, 0.5)",
      0.4,
      "rgba(234, 179, 8, 0.6)",
      0.6,
      "rgba(249, 115, 22, 0.7)",
      0.8,
      "rgba(239, 68, 68, 0.8)",
      1,
      "rgba(220, 38, 38, 0.9)",
    ],
    "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 2, 9, 20],
    "heatmap-opacity": 0.8,
  },
};

const entityLocationLayer: LayerProps = {
  id: "entity-locations",
  type: "circle",
  paint: {
    "circle-color": "#a855f7",
    "circle-radius": 10,
    "circle-stroke-width": 3,
    "circle-stroke-color": "#ffffff",
  },
};

const entityLocationLabelLayer: LayerProps = {
  id: "entity-location-labels",
  type: "symbol",
  layout: {
    "text-field": ["get", "placeName"],
    "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
    "text-size": 12,
    "text-offset": [0, 1.5],
    "text-anchor": "top",
  },
  paint: {
    "text-color": "#a855f7",
    "text-halo-color": "#1e293b",
    "text-halo-width": 1,
  },
};

const militaryBaseLayer: LayerProps = {
  id: "military-bases",
  type: "symbol",
  layout: {
    "icon-image": [
      "match",
      ["get", "type"],
      "usa", "us-national-park-11",
      "nato", "us-national-park-11",
      "us-national-park-11",
    ],
    "icon-size": 1.5,
    "icon-allow-overlap": true,
    "text-field": ["get", "baseName"],
    "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
    "text-size": 10,
    "text-offset": [0, 1.5],
    "text-anchor": "top",
    "text-optional": true,
  },
  paint: {
    "icon-color": [
      "match",
      ["get", "type"],
      "usa", "#22c55e",
      "nato", "#3b82f6",
      "#22c55e",
    ],
    "text-color": [
      "match",
      ["get", "type"],
      "usa", "#22c55e",
      "nato", "#3b82f6",
      "#22c55e",
    ],
    "text-halo-color": "#1e293b",
    "text-halo-width": 1,
  },
};

// Fallback circle layer for military bases (in case icons don't load)
const militaryBaseCircleLayer: LayerProps = {
  id: "military-bases-circle",
  type: "circle",
  paint: {
    "circle-color": [
      "match",
      ["get", "type"],
      "usa", "#22c55e",
      "nato", "#3b82f6",
      "#22c55e",
    ],
    "circle-radius": 8,
    "circle-stroke-width": 3,
    "circle-stroke-color": [
      "match",
      ["get", "type"],
      "usa", "#166534",
      "nato", "#1e40af",
      "#166534",
    ],
  },
};

const militaryBaseLabelLayer: LayerProps = {
  id: "military-bases-labels",
  type: "symbol",
  layout: {
    "text-field": ["get", "baseName"],
    "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
    "text-size": 10,
    "text-offset": [0, 1.2],
    "text-anchor": "top",
  },
  paint: {
    "text-color": [
      "match",
      ["get", "type"],
      "usa", "#22c55e",
      "nato", "#3b82f6",
      "#22c55e",
    ],
    "text-halo-color": "#1e293b",
    "text-halo-width": 1,
  },
};

const fireDetectionLayer: LayerProps = {
  id: "fire-detections",
  type: "symbol",
  layout: {
    "icon-image": "fire-icon",
    "icon-size": [
      "interpolate",
      ["linear"],
      ["get", "frp"],
      0, 0.5,
      10, 0.7,
      30, 0.9,
      100, 1.3,
    ],
    "icon-allow-overlap": true,
    "icon-ignore-placement": true,
  },
};

const militaryFlightLayer: LayerProps = {
  id: "military-flights",
  type: "symbol",
  layout: {
    "icon-image": "airplane-icon",
    "icon-size": [
      "interpolate",
      ["linear"],
      ["zoom"],
      2, 0.45,
      5, 0.65,
      8, 0.85,
      12, 1.0,
    ],
    "icon-rotate": ["get", "heading"],
    "icon-rotation-alignment": "map",
    "icon-allow-overlap": true,
    "icon-ignore-placement": true,
    "text-field": ["get", "callsign"],
    "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
    "text-size": 10,
    "text-offset": [0, 1.8],
    "text-anchor": "top",
    "text-optional": true,
  },
  paint: {
    "text-color": "#7dd3fc",
    "text-halo-color": "#0c1222",
    "text-halo-width": 1.5,
  },
};

const fireDetectionHeatLayer: LayerProps = {
  id: "fire-heat",
  type: "heatmap",
  maxzoom: 10,
  paint: {
    "heatmap-weight": [
      "interpolate",
      ["linear"],
      ["get", "frp"],
      0,
      0.1,
      50,
      1,
    ],
    "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.5, 10, 2],
    "heatmap-color": [
      "interpolate",
      ["linear"],
      ["heatmap-density"],
      0,
      "rgba(0, 0, 0, 0)",
      0.2,
      "rgba(255, 140, 0, 0.3)",
      0.4,
      "rgba(255, 100, 0, 0.5)",
      0.6,
      "rgba(255, 69, 0, 0.6)",
      0.8,
      "rgba(255, 30, 0, 0.7)",
      1,
      "rgba(255, 0, 0, 0.8)",
    ],
    "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 4, 10, 20],
    "heatmap-opacity": 0.7,
  },
};

function getSeverityValue(threatLevel: string): number {
  const values: Record<string, number> = {
    critical: 5,
    high: 4,
    medium: 3,
    low: 2,
    info: 1,
  };
  return values[threatLevel] || 2;
}

interface SelectedEntityLocation {
  longitude: number;
  latitude: number;
  placeName: string;
  entityName: string;
  country?: string;
}

interface SelectedMilitaryBase {
  longitude: number;
  latitude: number;
  baseName: string;
  country: string;
  type: "usa" | "nato";
}

export function ThreatMap() {
  const mapRef = useRef<MapRef>(null);
  const {
    viewport,
    setViewport,
    showHeatmap,
    showClusters,
    entityLocations,
    showMilitaryBases,
    militaryBases,
    setMilitaryBases,
    setMilitaryBasesLoading,
    showFireDetections,
    fireDetections,
    setFireDetections,
    setFireDetectionsLoading,
    showMilitaryFlights,
    militaryFlights,
    setMilitaryFlights,
    setMilitaryFlightsLoading,
  } = useMapStore();
  const { filteredEvents, selectedEvent, selectEvent } = useEventsStore();
  const { isAuthenticated } = useAuthStore();
  const [selectedEntityLocation, setSelectedEntityLocation] = useState<SelectedEntityLocation | null>(null);
  const [selectedMilitaryBase, setSelectedMilitaryBase] = useState<SelectedMilitaryBase | null>(null);
  const [selectedFire, setSelectedFire] = useState<{
    longitude: number;
    latitude: number;
    brightness: number;
    frp: number;
    confidence: string;
    region: string;
    acqDate: string;
    acqTime: string;
  } | null>(null);
  const [selectedFlight, setSelectedFlight] = useState<{
    longitude: number;
    latitude: number;
    callsign: string;
    originCountry: string;
    altitude: number;
    velocity: number;
    heading: number;
    verticalRate: number;
    squawk: string;
    aircraftType: string;
    confidence: string;
    region: string;
  } | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [isCountryLoading, setIsCountryLoading] = useState(false);
  const [blinkOpacity, setBlinkOpacity] = useState(0.4);
  const [showSignInModal, setShowSignInModal] = useState(false);

  const requiresAuth = APP_MODE === "valyu";


  // Fetch military bases on mount
  useEffect(() => {
    const fetchMilitaryBases = async () => {
      setMilitaryBasesLoading(true);
      try {
        const response = await fetch("/api/military-bases");
        const data = await response.json();
        if (data.bases) {
          setMilitaryBases(data.bases);
        }
      } catch (error) {
        console.error("Error fetching military bases:", error);
      } finally {
        setMilitaryBasesLoading(false);
      }
    };

    fetchMilitaryBases();
  }, [setMilitaryBases, setMilitaryBasesLoading]);

  // Fetch fire detections on mount
  useEffect(() => {
    const fetchFireDetections = async () => {
      setFireDetectionsLoading(true);
      try {
        const response = await fetch("/api/fire-detections");
        const data = await response.json();
        if (data.fires) {
          setFireDetections(data.fires);
        }
      } catch (error) {
        console.error("Error fetching fire detections:", error);
      } finally {
        setFireDetectionsLoading(false);
      }
    };

    fetchFireDetections();
  }, [setFireDetections, setFireDetectionsLoading]);

  // Fetch military flights on mount + poll every 60s
  useEffect(() => {
    const fetchMilitaryFlights = async () => {
      setMilitaryFlightsLoading(true);
      try {
        const response = await fetch("/api/military-flights");
        const data = await response.json();
        if (data.flights) {
          setMilitaryFlights(data.flights);
        }
      } catch (error) {
        console.error("Error fetching military flights:", error);
      } finally {
        setMilitaryFlightsLoading(false);
      }
    };

    fetchMilitaryFlights();
    const interval = setInterval(fetchMilitaryFlights, 60_000);
    return () => clearInterval(interval);
  }, [setMilitaryFlights, setMilitaryFlightsLoading]);

  // Blinking effect for selected country while loading
  useEffect(() => {
    if (!selectedCountryCode || !isCountryLoading) {
      setBlinkOpacity(0.4);
      return;
    }

    const interval = setInterval(() => {
      setBlinkOpacity((prev) => (prev === 0.4 ? 0.15 : 0.4));
    }, 400);

    return () => clearInterval(interval);
  }, [selectedCountryCode, isCountryLoading]);

  const handleCountryLoadingChange = useCallback((loading: boolean) => {
    setIsCountryLoading(loading);
  }, []);

  const handleCountryModalClose = useCallback(() => {
    setSelectedCountry(null);
    setSelectedCountryCode(null);
    setIsCountryLoading(false);
  }, []);

  const handleMapLoad = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const size = 36;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Outer flame
    ctx.beginPath();
    ctx.moveTo(18, 2);
    ctx.bezierCurveTo(18, 2, 26, 12, 27, 18);
    ctx.bezierCurveTo(28, 24, 25, 30, 18, 32);
    ctx.bezierCurveTo(11, 30, 8, 24, 9, 18);
    ctx.bezierCurveTo(10, 12, 18, 2, 18, 2);
    ctx.closePath();
    const outerGrad = ctx.createLinearGradient(18, 2, 18, 32);
    outerGrad.addColorStop(0, "#ff4500");
    outerGrad.addColorStop(0.6, "#ff6a00");
    outerGrad.addColorStop(1, "#ff8c00");
    ctx.fillStyle = outerGrad;
    ctx.fill();

    // Inner flame
    ctx.beginPath();
    ctx.moveTo(18, 12);
    ctx.bezierCurveTo(18, 12, 22, 18, 22, 22);
    ctx.bezierCurveTo(22, 26, 20, 28, 18, 28);
    ctx.bezierCurveTo(16, 28, 14, 26, 14, 22);
    ctx.bezierCurveTo(14, 18, 18, 12, 18, 12);
    ctx.closePath();
    const innerGrad = ctx.createLinearGradient(18, 12, 18, 28);
    innerGrad.addColorStop(0, "#ffcc00");
    innerGrad.addColorStop(1, "#ffee88");
    ctx.fillStyle = innerGrad;
    ctx.fill();

    const imageData = ctx.getImageData(0, 0, size, size);
    map.addImage("fire-icon", { width: size, height: size, data: new Uint8Array(imageData.data) });

    // Draw airplane icon (pointing up / north) - sleek fighter jet silhouette
    const planeSize = 48;
    const pc = document.createElement("canvas");
    pc.width = planeSize;
    pc.height = planeSize;
    const pctx = pc.getContext("2d");
    if (pctx) {
      const cx = planeSize / 2;

      // Glow effect
      pctx.shadowColor = "#38bdf8";
      pctx.shadowBlur = 6;

      // Fuselage - sleek pointed body
      pctx.beginPath();
      pctx.moveTo(cx, 3);          // Nose tip
      pctx.lineTo(cx + 2, 10);
      pctx.lineTo(cx + 3, 20);
      pctx.lineTo(cx + 2.5, 34);
      pctx.lineTo(cx + 1.5, 38);
      pctx.lineTo(cx, 40);
      pctx.lineTo(cx - 1.5, 38);
      pctx.lineTo(cx - 2.5, 34);
      pctx.lineTo(cx - 3, 20);
      pctx.lineTo(cx - 2, 10);
      pctx.closePath();
      const fuselageGrad = pctx.createLinearGradient(cx, 3, cx, 40);
      fuselageGrad.addColorStop(0, "#7dd3fc");
      fuselageGrad.addColorStop(0.3, "#38bdf8");
      fuselageGrad.addColorStop(1, "#0284c7");
      pctx.fillStyle = fuselageGrad;
      pctx.fill();

      // Wings - swept back delta
      pctx.shadowBlur = 4;
      pctx.beginPath();
      pctx.moveTo(cx, 17);
      pctx.lineTo(cx + 16, 28);
      pctx.lineTo(cx + 15, 30);
      pctx.lineTo(cx + 3, 25);
      pctx.lineTo(cx - 3, 25);
      pctx.lineTo(cx - 15, 30);
      pctx.lineTo(cx - 16, 28);
      pctx.closePath();
      const wingGrad = pctx.createLinearGradient(cx - 16, 17, cx + 16, 30);
      wingGrad.addColorStop(0, "#0ea5e9");
      wingGrad.addColorStop(0.5, "#38bdf8");
      wingGrad.addColorStop(1, "#0ea5e9");
      pctx.fillStyle = wingGrad;
      pctx.fill();

      // Tail fins - angled
      pctx.shadowBlur = 3;
      pctx.beginPath();
      pctx.moveTo(cx, 33);
      pctx.lineTo(cx + 8, 40);
      pctx.lineTo(cx + 7, 42);
      pctx.lineTo(cx + 1.5, 38);
      pctx.lineTo(cx - 1.5, 38);
      pctx.lineTo(cx - 7, 42);
      pctx.lineTo(cx - 8, 40);
      pctx.closePath();
      pctx.fillStyle = "#0284c7";
      pctx.fill();

      // Cockpit highlight
      pctx.shadowBlur = 0;
      pctx.beginPath();
      pctx.moveTo(cx, 6);
      pctx.lineTo(cx + 1.2, 11);
      pctx.lineTo(cx, 14);
      pctx.lineTo(cx - 1.2, 11);
      pctx.closePath();
      pctx.fillStyle = "#bae6fd";
      pctx.fill();

      // Engine exhaust glow
      pctx.beginPath();
      pctx.arc(cx, 41, 2, 0, Math.PI * 2);
      const exhaustGrad = pctx.createRadialGradient(cx, 41, 0, cx, 41, 3);
      exhaustGrad.addColorStop(0, "rgba(125, 211, 252, 0.8)");
      exhaustGrad.addColorStop(1, "rgba(56, 189, 248, 0)");
      pctx.fillStyle = exhaustGrad;
      pctx.fill();

      const planeData = pctx.getImageData(0, 0, planeSize, planeSize);
      map.addImage("airplane-icon", { width: planeSize, height: planeSize, data: new Uint8Array(planeData.data) });
    }
  }, []);

  const geojsonData = useMemo(
    () => {
      // Track coordinate usage to jitter overlapping points
      const coordCounts: Record<string, number> = {};
      return {
        type: "FeatureCollection" as const,
        features: filteredEvents.map((event) => {
          const key = `${event.location.latitude.toFixed(4)},${event.location.longitude.toFixed(4)}`;
          const count = coordCounts[key] || 0;
          coordCounts[key] = count + 1;

          // Spread overlapping points in a spiral pattern
          let lng = event.location.longitude;
          let lat = event.location.latitude;
          if (count > 0) {
            const angle = (count * 137.5 * Math.PI) / 180; // golden angle
            const radius = 0.3 + count * 0.15; // degrees offset, grows outward
            lng += radius * Math.cos(angle);
            lat += radius * Math.sin(angle);
          }

          return {
            type: "Feature" as const,
            properties: {
              id: event.id,
              title: event.title,
              category: event.category,
              threatLevel: event.threatLevel,
              severity: getSeverityValue(event.threatLevel),
              timestamp: event.timestamp,
            },
            geometry: {
              type: "Point" as const,
              coordinates: [lng, lat],
            },
          };
        }),
      };
    },
    [filteredEvents]
  );

  const entityLocationsData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: entityLocations.map((location, index) => ({
        type: "Feature" as const,
        properties: {
          id: `entity-loc-${index}`,
          placeName: location.placeName || location.country || "Unknown",
          entityName: location.entityName,
          country: location.country,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [location.longitude, location.latitude],
        },
      })),
    }),
    [entityLocations]
  );

  const militaryBasesData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: militaryBases.map((base, index) => ({
        type: "Feature" as const,
        properties: {
          id: `military-base-${index}`,
          baseName: base.baseName,
          country: base.country,
          type: base.type,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [base.longitude, base.latitude],
        },
      })),
    }),
    [militaryBases]
  );

  const fireDetectionsData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: fireDetections.map((fire, index) => ({
        type: "Feature" as const,
        properties: {
          id: `fire-${index}`,
          brightness: fire.brightness,
          frp: fire.frp,
          confidence: fire.confidence,
          region: fire.region,
          acqDate: fire.acqDate,
          acqTime: fire.acqTime,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [fire.longitude, fire.latitude],
        },
      })),
    }),
    [fireDetections]
  );

  const militaryFlightsData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: militaryFlights.map((flight) => ({
        type: "Feature" as const,
        properties: {
          id: flight.icao24,
          callsign: flight.callsign,
          originCountry: flight.originCountry,
          altitude: flight.altitude,
          velocity: flight.velocity,
          heading: flight.heading,
          verticalRate: flight.verticalRate,
          squawk: flight.squawk,
          aircraftType: flight.aircraftType,
          confidence: flight.confidence,
          region: flight.region,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [flight.longitude, flight.latitude],
        },
      })),
    }),
    [militaryFlights]
  );

  const handleMapClick = useCallback(
    async (event: MapMouseEvent) => {
      // If clicking on a known feature (event, cluster, entity), handle that
      if (event.features?.length) {
        const feature = event.features[0];
        const layerId = feature.layer?.id;

        if (layerId === "clusters" && mapRef.current) {
          const clusterId = feature.properties?.cluster_id;
          const source = mapRef.current.getSource("events") as mapboxgl.GeoJSONSource;

          source.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return;

            mapRef.current?.easeTo({
              center: (feature.geometry as GeoJSON.Point).coordinates as [
                number,
                number,
              ],
              zoom: zoom || viewport.zoom + 2,
              duration: 500,
            });
          });
          return;
        } else if (layerId === "unclustered-point") {
          const eventId = feature.properties?.id;
          const clickedEvent = filteredEvents.find((e) => e.id === eventId);
          if (clickedEvent) {
            selectEvent(clickedEvent);
            setSelectedEntityLocation(null);
            setSelectedMilitaryBase(null);
          }
          return;
        } else if (layerId === "entity-locations") {
          const coords = (feature.geometry as GeoJSON.Point).coordinates;
          setSelectedEntityLocation({
            longitude: coords[0],
            latitude: coords[1],
            placeName: feature.properties?.placeName || "Unknown",
            entityName: feature.properties?.entityName || "Unknown",
            country: feature.properties?.country,
          });
          selectEvent(null);
          setSelectedMilitaryBase(null);
          return;
        } else if (layerId === "military-bases-circle") {
          const coords = (feature.geometry as GeoJSON.Point).coordinates;
          setSelectedMilitaryBase({
            longitude: coords[0],
            latitude: coords[1],
            baseName: feature.properties?.baseName || "Military Base",
            country: feature.properties?.country || "Unknown",
            type: feature.properties?.type || "usa",
          });
          selectEvent(null);
          setSelectedEntityLocation(null);
          setSelectedFire(null);
          return;
        } else if (layerId === "military-flights") {
          const coords = (feature.geometry as GeoJSON.Point).coordinates;
          setSelectedFlight({
            longitude: coords[0],
            latitude: coords[1],
            callsign: feature.properties?.callsign || "Unknown",
            originCountry: feature.properties?.originCountry || "Unknown",
            altitude: feature.properties?.altitude || 0,
            velocity: feature.properties?.velocity || 0,
            heading: feature.properties?.heading || 0,
            verticalRate: feature.properties?.verticalRate || 0,
            squawk: feature.properties?.squawk || "",
            aircraftType: feature.properties?.aircraftType || "unknown",
            confidence: feature.properties?.confidence || "low",
            region: feature.properties?.region || "Unknown",
          });
          selectEvent(null);
          setSelectedEntityLocation(null);
          setSelectedMilitaryBase(null);
          setSelectedFire(null);
          return;
        } else if (layerId === "fire-detections") {
          const coords = (feature.geometry as GeoJSON.Point).coordinates;
          setSelectedFire({
            longitude: coords[0],
            latitude: coords[1],
            brightness: feature.properties?.brightness || 0,
            frp: feature.properties?.frp || 0,
            confidence: feature.properties?.confidence || "unknown",
            region: feature.properties?.region || "Unknown",
            acqDate: feature.properties?.acqDate || "",
            acqTime: feature.properties?.acqTime || "",
          });
          selectEvent(null);
          setSelectedEntityLocation(null);
          setSelectedMilitaryBase(null);
          return;
        }
      }

      // If no feature was clicked, reverse geocode to get country
      selectEvent(null);
      setSelectedEntityLocation(null);
      setSelectedMilitaryBase(null);
      setSelectedFire(null);
      setSelectedFlight(null);

      const { lng, lat } = event.lngLat;

      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=country&access_token=${MAPBOX_TOKEN}`
        );
        const data = await response.json();

        if (data.features && data.features.length > 0) {
          const countryFeature = data.features[0];
          const countryName = countryFeature.place_name;
          // Get ISO 3166-1 alpha-2 country code from short_code property
          const countryCode = countryFeature.properties?.short_code?.toUpperCase() || null;

          // Always require sign-in for country clicks (answers about a place)
          if (requiresAuth && !isAuthenticated) {
            setShowSignInModal(true);
            return;
          }

          setSelectedCountry(countryName);
          setSelectedCountryCode(countryCode);
          setIsCountryLoading(true);
        }
      } catch (error) {
        console.error("Error reverse geocoding:", error);
      }
    },
    [filteredEvents, selectEvent, viewport.zoom, requiresAuth, isAuthenticated]
  );

  const handleMouseEnter = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor = "pointer";
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor = "";
    }
  }, []);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-card">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">
            Mapbox Token Required
          </p>
          <p className="text-sm text-muted-foreground">
            Please add NEXT_PUBLIC_MAPBOX_TOKEN to your .env.local file
          </p>
        </div>
      </div>
    );
  }

  return (
    <Map
      ref={mapRef}
      {...viewport}
      onMove={(evt) => setViewport(evt.viewState)}
      onLoad={handleMapLoad}
      mapStyle="mapbox://styles/mapbox/dark-v11"
      mapboxAccessToken={MAPBOX_TOKEN}
      interactiveLayerIds={[
        ...(showClusters ? ["clusters"] : []),
        "unclustered-point",
        "entity-locations",
        "military-bases-circle",
        ...(showFireDetections ? ["fire-detections"] : []),
        ...(showMilitaryFlights ? ["military-flights"] : []),
      ]}
      onClick={handleMapClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      attributionControl={false}
    >
      <NavigationControl position="top-right" />
      <GeolocateControl position="top-right" />
      <ScaleControl position="bottom-right" />

      {/* Country highlight layer */}
      {selectedCountryCode && (
        <Source
          id="country-boundaries"
          type="vector"
          url="mapbox://mapbox.country-boundaries-v1"
        >
          <Layer
            id="country-highlight"
            type="fill"
            source-layer="country_boundaries"
            filter={[
              "all",
              ["==", ["get", "iso_3166_1"], selectedCountryCode],
              ["==", ["get", "worldview"], "all"],
            ]}
            paint={{
              "fill-color": "#ef4444",
              "fill-opacity": blinkOpacity,
            }}
            beforeId="waterway-label"
          />
          <Layer
            id="country-highlight-outline"
            type="line"
            source-layer="country_boundaries"
            filter={[
              "all",
              ["==", ["get", "iso_3166_1"], selectedCountryCode],
              ["==", ["get", "worldview"], "all"],
            ]}
            paint={{
              "line-color": "#ef4444",
              "line-width": 2,
              "line-opacity": 0.8,
            }}
            beforeId="waterway-label"
          />
        </Source>
      )}

      <Source
        id="events"
        type="geojson"
        data={geojsonData}
        cluster={showClusters}
        clusterMaxZoom={14}
        clusterRadius={50}
        clusterProperties={{
          maxSeverity: ["max", ["get", "severity"]],
        }}
      >
        {showHeatmap && <Layer {...heatmapLayer} />}
        {showClusters && <Layer {...clusterLayer} />}
        {showClusters && <Layer {...clusterCountLayer} />}
        <Layer {...unclusteredPointLayer} />
      </Source>

      {entityLocations.length > 0 && (
        <Source id="entity-locations" type="geojson" data={entityLocationsData}>
          <Layer {...entityLocationLayer} />
          <Layer {...entityLocationLabelLayer} />
        </Source>
      )}

      {/* Military Bases Layer */}
      {showMilitaryBases && militaryBases.length > 0 && (
        <Source id="military-bases" type="geojson" data={militaryBasesData}>
          <Layer {...militaryBaseCircleLayer} />
          <Layer {...militaryBaseLabelLayer} />
        </Source>
      )}

      {/* Fire Detections Layer (NASA FIRMS) */}
      {showFireDetections && fireDetections.length > 0 && (
        <Source id="fire-detections" type="geojson" data={fireDetectionsData}>
          <Layer {...fireDetectionHeatLayer} />
          <Layer {...fireDetectionLayer} />
        </Source>
      )}

      {/* Military Flights Layer (OpenSky) */}
      {showMilitaryFlights && militaryFlights.length > 0 && (
        <Source id="military-flights" type="geojson" data={militaryFlightsData}>
          <Layer {...militaryFlightLayer} />
        </Source>
      )}

      {selectedEvent && (
        <Popup
          longitude={selectedEvent.location.longitude}
          latitude={selectedEvent.location.latitude}
          anchor="bottom"
          onClose={() => selectEvent(null)}
          closeButton={true}
          closeOnClick={false}
          className="threat-popup"
        >
          <EventPopup event={selectedEvent} />
        </Popup>
      )}

      {selectedEntityLocation && (
        <Popup
          longitude={selectedEntityLocation.longitude}
          latitude={selectedEntityLocation.latitude}
          anchor="bottom"
          onClose={() => setSelectedEntityLocation(null)}
          closeButton={true}
          closeOnClick={false}
          className="threat-popup"
        >
          <div className="min-w-[200px] p-2">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20">
                <svg
                  className="h-4 w-4 text-purple-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {selectedEntityLocation.entityName}
                </h3>
                <span className="text-xs text-purple-400">Organization</span>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex items-start gap-2 text-muted-foreground">
                <svg
                  className="mt-0.5 h-3 w-3 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>{selectedEntityLocation.placeName}</span>
              </div>
              {selectedEntityLocation.country &&
               selectedEntityLocation.country !== selectedEntityLocation.placeName && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <svg
                    className="h-3 w-3 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{selectedEntityLocation.country}</span>
                </div>
              )}
            </div>
          </div>
        </Popup>
      )}

      {selectedMilitaryBase && (
        <Popup
          longitude={selectedMilitaryBase.longitude}
          latitude={selectedMilitaryBase.latitude}
          anchor="bottom"
          onClose={() => setSelectedMilitaryBase(null)}
          closeButton={true}
          closeOnClick={false}
          className="threat-popup"
        >
          <div className="min-w-[220px] p-2">
            <div className="mb-2 flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  selectedMilitaryBase.type === "usa"
                    ? "bg-green-500/20"
                    : "bg-blue-500/20"
                }`}
              >
                <svg
                  className={`h-4 w-4 ${
                    selectedMilitaryBase.type === "usa"
                      ? "text-green-400"
                      : "text-blue-400"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {selectedMilitaryBase.baseName}
                </h3>
                <span
                  className={`text-xs ${
                    selectedMilitaryBase.type === "usa"
                      ? "text-green-400"
                      : "text-blue-400"
                  }`}
                >
                  {selectedMilitaryBase.type === "usa" ? "US Military Base" : "NATO Base"}
                </span>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <svg
                  className="h-3 w-3 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{selectedMilitaryBase.country}</span>
              </div>
            </div>
          </div>
        </Popup>
      )}

      {selectedFire && (
        <Popup
          longitude={selectedFire.longitude}
          latitude={selectedFire.latitude}
          anchor="bottom"
          onClose={() => setSelectedFire(null)}
          closeButton={true}
          closeOnClick={false}
          className="threat-popup"
        >
          <div className="min-w-[200px] p-2">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/20">
                <svg className="h-4 w-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Fire Detection
                </h3>
                <span className={`text-xs ${
                  selectedFire.confidence === "high" ? "text-red-400" : "text-orange-400"
                }`}>
                  {selectedFire.confidence} confidence - {selectedFire.region}
                </span>
              </div>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Fire Radiative Power</span>
                <span className="font-medium text-foreground">{selectedFire.frp.toFixed(1)} MW</span>
              </div>
              <div className="flex justify-between">
                <span>Brightness</span>
                <span className="font-medium text-foreground">{selectedFire.brightness.toFixed(1)} K</span>
              </div>
              <div className="flex justify-between">
                <span>Detected</span>
                <span className="font-medium text-foreground">{selectedFire.acqDate} {selectedFire.acqTime}</span>
              </div>
              <div className="flex justify-between">
                <span>Coordinates</span>
                <span className="font-medium text-foreground">{selectedFire.latitude.toFixed(4)}, {selectedFire.longitude.toFixed(4)}</span>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground/70">
              NASA FIRMS VIIRS satellite data
            </div>
          </div>
        </Popup>
      )}

      {selectedFlight && (
        <Popup
          longitude={selectedFlight.longitude}
          latitude={selectedFlight.latitude}
          anchor="bottom"
          onClose={() => setSelectedFlight(null)}
          closeButton={true}
          closeOnClick={false}
          className="threat-popup"
        >
          <div className="min-w-[240px] p-2">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/20">
                <svg className="h-4 w-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground font-mono">
                  {selectedFlight.callsign}
                </h3>
                <span className={`text-xs ${
                  selectedFlight.confidence === "high" ? "text-sky-400" :
                  selectedFlight.confidence === "medium" ? "text-yellow-400" : "text-slate-400"
                }`}>
                  {selectedFlight.aircraftType !== "unknown" ? selectedFlight.aircraftType.toUpperCase() : "Military"} - {selectedFlight.originCountry}
                </span>
              </div>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Altitude</span>
                <span className="font-medium text-foreground">{selectedFlight.altitude.toLocaleString()} ft</span>
              </div>
              <div className="flex justify-between">
                <span>Speed</span>
                <span className="font-medium text-foreground">{selectedFlight.velocity} kts</span>
              </div>
              <div className="flex justify-between">
                <span>Heading</span>
                <span className="font-medium text-foreground">{Math.round(selectedFlight.heading)}&deg;</span>
              </div>
              {selectedFlight.verticalRate !== 0 && (
                <div className="flex justify-between">
                  <span>Vertical Rate</span>
                  <span className={`font-medium ${selectedFlight.verticalRate > 0 ? "text-green-400" : "text-red-400"}`}>
                    {selectedFlight.verticalRate > 0 ? "+" : ""}{selectedFlight.verticalRate} ft/min
                  </span>
                </div>
              )}
              {selectedFlight.squawk && (
                <div className="flex justify-between">
                  <span>Squawk</span>
                  <span className={`font-medium font-mono ${
                    ["7700", "7600", "7500", "7777"].includes(selectedFlight.squawk)
                      ? "text-red-400"
                      : "text-foreground"
                  }`}>{selectedFlight.squawk}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Confidence</span>
                <span className={`font-medium ${
                  selectedFlight.confidence === "high" ? "text-sky-400" :
                  selectedFlight.confidence === "medium" ? "text-yellow-400" : "text-slate-400"
                }`}>{selectedFlight.confidence}</span>
              </div>
              <div className="flex justify-between">
                <span>Region</span>
                <span className="font-medium text-foreground">{selectedFlight.region}</span>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground/70">
              OpenSky Network ADS-B data
            </div>
          </div>
        </Popup>
      )}

      <CountryConflictsModal
        country={selectedCountry}
        onClose={handleCountryModalClose}
        onLoadingChange={handleCountryLoadingChange}
      />

      <SignInModal open={showSignInModal} onOpenChange={setShowSignInModal} />
    </Map>
  );
}
