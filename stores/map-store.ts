import { create } from "zustand";
import type { MapViewport, GeoLocation } from "@/types";

interface EntityLocationMarker extends GeoLocation {
  entityName: string;
}

export interface MilitaryBaseMarker {
  country: string;
  baseName: string;
  latitude: number;
  longitude: number;
  type: "usa" | "nato";
}

export interface MilitaryFlightMarker {
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
  aircraftType: string;
  confidence: "high" | "medium" | "low";
  region: string;
}

export interface EarthquakeMarker {
  id: string;
  magnitude: number;
  place: string;
  latitude: number;
  longitude: number;
  depth: number;
  time: string;
  url: string;
  tsunami: boolean;
  felt: number;
  significance: number;
}

export interface NuclearFacilityMarker {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  type: "enrichment" | "weapons" | "power" | "research" | "reprocessing" | "test_site" | "military";
  status: "active" | "decommissioned" | "under_construction" | "suspected";
  description: string;
}

export interface FireDetectionMarker {
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

interface MapState {
  viewport: MapViewport;
  showHeatmap: boolean;
  showClusters: boolean;
  showWatchboxes: boolean;
  showMilitaryBases: boolean;
  isDrawingWatchbox: boolean;
  activeWatchboxId: string | null;
  isAutoPlaying: boolean;
  entityLocations: EntityLocationMarker[];
  militaryBases: MilitaryBaseMarker[];
  militaryBasesLoading: boolean;
  showFireDetections: boolean;
  fireDetections: FireDetectionMarker[];
  fireDetectionsLoading: boolean;
  showMilitaryFlights: boolean;
  militaryFlights: MilitaryFlightMarker[];
  militaryFlightsLoading: boolean;
  showEarthquakes: boolean;
  earthquakes: EarthquakeMarker[];
  earthquakesLoading: boolean;
  showNuclearFacilities: boolean;
  nuclearFacilities: NuclearFacilityMarker[];
  nuclearFacilitiesLoading: boolean;

  setViewport: (viewport: Partial<MapViewport>) => void;
  flyTo: (longitude: number, latitude: number, zoom?: number) => void;
  toggleHeatmap: () => void;
  toggleClusters: () => void;
  toggleWatchboxes: () => void;
  toggleMilitaryBases: () => void;
  toggleFireDetections: () => void;
  setFireDetections: (fires: FireDetectionMarker[]) => void;
  setFireDetectionsLoading: (loading: boolean) => void;
  toggleMilitaryFlights: () => void;
  setMilitaryFlights: (flights: MilitaryFlightMarker[]) => void;
  setMilitaryFlightsLoading: (loading: boolean) => void;
  toggleEarthquakes: () => void;
  setEarthquakes: (quakes: EarthquakeMarker[]) => void;
  setEarthquakesLoading: (loading: boolean) => void;
  toggleNuclearFacilities: () => void;
  setNuclearFacilities: (facilities: NuclearFacilityMarker[]) => void;
  setNuclearFacilitiesLoading: (loading: boolean) => void;
  startDrawingWatchbox: () => void;
  stopDrawingWatchbox: () => void;
  setActiveWatchbox: (id: string | null) => void;
  startAutoPlay: () => void;
  stopAutoPlay: () => void;
  setEntityLocations: (entityName: string, locations: GeoLocation[]) => void;
  clearEntityLocations: () => void;
  setMilitaryBases: (bases: MilitaryBaseMarker[]) => void;
  setMilitaryBasesLoading: (loading: boolean) => void;
}

const DEFAULT_VIEWPORT: MapViewport = {
  longitude: 0,
  latitude: 20,
  zoom: 2,
  bearing: 0,
  pitch: 0,
};

export const useMapStore = create<MapState>((set) => ({
  viewport: DEFAULT_VIEWPORT,
  showHeatmap: false,
  showClusters: true,
  showWatchboxes: true,
  showMilitaryBases: true,
  isDrawingWatchbox: false,
  activeWatchboxId: null,
  isAutoPlaying: false,
  entityLocations: [],
  militaryBases: [],
  militaryBasesLoading: false,
  showFireDetections: true,
  fireDetections: [],
  fireDetectionsLoading: false,
  showMilitaryFlights: true,
  militaryFlights: [],
  militaryFlightsLoading: false,
  showEarthquakes: true,
  earthquakes: [],
  earthquakesLoading: false,
  showNuclearFacilities: true,
  nuclearFacilities: [],
  nuclearFacilitiesLoading: false,

  setViewport: (viewport) =>
    set((state) => ({
      viewport: { ...state.viewport, ...viewport },
    })),

  flyTo: (longitude, latitude, zoom = 8) =>
    set((state) => ({
      viewport: {
        ...state.viewport,
        longitude,
        latitude,
        zoom,
      },
    })),

  toggleHeatmap: () =>
    set((state) => ({
      showHeatmap: !state.showHeatmap,
    })),

  toggleClusters: () =>
    set((state) => ({
      showClusters: !state.showClusters,
    })),

  toggleWatchboxes: () =>
    set((state) => ({
      showWatchboxes: !state.showWatchboxes,
    })),

  toggleMilitaryBases: () =>
    set((state) => ({
      showMilitaryBases: !state.showMilitaryBases,
    })),

  toggleFireDetections: () =>
    set((state) => ({
      showFireDetections: !state.showFireDetections,
    })),

  setFireDetections: (fires) => set({ fireDetections: fires }),

  setFireDetectionsLoading: (loading) => set({ fireDetectionsLoading: loading }),

  toggleMilitaryFlights: () =>
    set((state) => ({
      showMilitaryFlights: !state.showMilitaryFlights,
    })),

  setMilitaryFlights: (flights) => set({ militaryFlights: flights }),

  setMilitaryFlightsLoading: (loading) => set({ militaryFlightsLoading: loading }),

  toggleEarthquakes: () =>
    set((state) => ({
      showEarthquakes: !state.showEarthquakes,
    })),

  setEarthquakes: (quakes) => set({ earthquakes: quakes }),

  setEarthquakesLoading: (loading) => set({ earthquakesLoading: loading }),

  toggleNuclearFacilities: () =>
    set((state) => ({
      showNuclearFacilities: !state.showNuclearFacilities,
    })),

  setNuclearFacilities: (facilities) => set({ nuclearFacilities: facilities }),

  setNuclearFacilitiesLoading: (loading) => set({ nuclearFacilitiesLoading: loading }),

  startDrawingWatchbox: () => set({ isDrawingWatchbox: true }),

  stopDrawingWatchbox: () => set({ isDrawingWatchbox: false }),

  setActiveWatchbox: (id) => set({ activeWatchboxId: id }),

  startAutoPlay: () => set({ isAutoPlaying: true }),

  stopAutoPlay: () => set({ isAutoPlaying: false }),

  setEntityLocations: (entityName, locations) =>
    set({
      entityLocations: locations.map((loc) => ({
        ...loc,
        entityName,
      })),
    }),

  clearEntityLocations: () => set({ entityLocations: [] }),

  setMilitaryBases: (bases) => set({ militaryBases: bases }),

  setMilitaryBasesLoading: (loading) => set({ militaryBasesLoading: loading }),
}));
