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
import { hasReachedLimit, incrementCountryClicks } from "@/lib/usage-limits";

const APP_MODE = process.env.NEXT_PUBLIC_APP_MODE || "self-hosted";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const clusterLayer: LayerProps = {
  id: "clusters",
  type: "circle",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": [
      "step",
      ["get", "point_count"],
      "#3b82f6",
      10,
      "#eab308",
      30,
      "#f97316",
      100,
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
  } = useMapStore();
  const { filteredEvents, selectedEvent, selectEvent } = useEventsStore();
  const { isAuthenticated, initialized } = useAuthStore();
  const [selectedEntityLocation, setSelectedEntityLocation] = useState<SelectedEntityLocation | null>(null);
  const [selectedMilitaryBase, setSelectedMilitaryBase] = useState<SelectedMilitaryBase | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [isCountryLoading, setIsCountryLoading] = useState(false);
  const [blinkOpacity, setBlinkOpacity] = useState(0.4);
  const [showSignInModal, setShowSignInModal] = useState(false);

  const requiresAuth = APP_MODE === "valyu";

  const checkLimit = useCallback(() => {
    if (!requiresAuth) return false;
    if (!initialized) return false;
    if (isAuthenticated) return false;
    return hasReachedLimit();
  }, [requiresAuth, isAuthenticated, initialized]);

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

  const geojsonData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: filteredEvents.map((event) => ({
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
          coordinates: [event.location.longitude, event.location.latitude],
        },
      })),
    }),
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
          return;
        }
      }

      // If no feature was clicked, reverse geocode to get country
      selectEvent(null);
      setSelectedEntityLocation(null);
      setSelectedMilitaryBase(null);

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

          if (checkLimit()) {
            setShowSignInModal(true);
            return;
          }

          if (requiresAuth && initialized && !isAuthenticated) {
            incrementCountryClicks();
          }

          setSelectedCountry(countryName);
          setSelectedCountryCode(countryCode);
          setIsCountryLoading(true);
        }
      } catch (error) {
        console.error("Error reverse geocoding:", error);
      }
    },
    [filteredEvents, selectEvent, viewport.zoom, checkLimit, requiresAuth, isAuthenticated, initialized]
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
      mapStyle="mapbox://styles/mapbox/dark-v11"
      mapboxAccessToken={MAPBOX_TOKEN}
      interactiveLayerIds={
        showClusters
          ? ["clusters", "unclustered-point", "entity-locations", "military-bases-circle"]
          : ["unclustered-point", "entity-locations", "military-bases-circle"]
      }
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
      >
        {showHeatmap && <Layer {...heatmapLayer} />}
        {showClusters && (
          <>
            <Layer {...clusterLayer} />
            <Layer {...clusterCountLayer} />
          </>
        )}
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

      <CountryConflictsModal
        country={selectedCountry}
        onClose={handleCountryModalClose}
        onLoadingChange={handleCountryLoadingChange}
      />

      <SignInModal open={showSignInModal} onOpenChange={setShowSignInModal} />
    </Map>
  );
}
