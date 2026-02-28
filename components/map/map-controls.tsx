"use client";

import { useMapStore } from "@/stores/map-store";
import { Shield, Flame, Plane, Zap, Radiation } from "lucide-react";

export function MapControls() {
  const {
    showMilitaryBases,
    toggleMilitaryBases,
    showFireDetections,
    toggleFireDetections,
    fireDetections,
    fireDetectionsLoading,
    showMilitaryFlights,
    toggleMilitaryFlights,
    militaryFlights,
    militaryFlightsLoading,
    showEarthquakes,
    toggleEarthquakes,
    earthquakes,
    earthquakesLoading,
    showNuclearFacilities,
    toggleNuclearFacilities,
    nuclearFacilities,
    nuclearFacilitiesLoading,
  } = useMapStore();

  return (
    <div className="absolute bottom-20 left-6 z-10 flex flex-col gap-2">
      <button
        onClick={toggleMilitaryFlights}
        className={`flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-all duration-200 ${
          showMilitaryFlights
            ? "bg-sky-600 text-white hover:bg-sky-700 shadow-sky-600/30"
            : "bg-card/90 text-foreground hover:bg-card border border-border/50"
        } backdrop-blur-md`}
        title={
          showMilitaryFlights
            ? `Hide Military Flights (${militaryFlights.length})`
            : "Show Military Flights"
        }
      >
        {militaryFlightsLoading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <Plane className="h-4 w-4" />
        )}
      </button>
      <button
        onClick={toggleFireDetections}
        className={`flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-all duration-200 ${
          showFireDetections
            ? "bg-orange-600 text-white hover:bg-orange-700 shadow-orange-600/30"
            : "bg-card/90 text-foreground hover:bg-card border border-border/50"
        } backdrop-blur-md`}
        title={
          showFireDetections
            ? `Hide Fires (${fireDetections.length})`
            : "Show Fire Detections"
        }
      >
        {fireDetectionsLoading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <Flame className="h-4 w-4" />
        )}
      </button>
      <button
        onClick={toggleEarthquakes}
        className={`flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-all duration-200 ${
          showEarthquakes
            ? "bg-yellow-600 text-white hover:bg-yellow-700 shadow-yellow-600/30"
            : "bg-card/90 text-foreground hover:bg-card border border-border/50"
        } backdrop-blur-md`}
        title={
          showEarthquakes
            ? `Hide Earthquakes (${earthquakes.length})`
            : "Show Earthquakes"
        }
      >
        {earthquakesLoading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <Zap className="h-4 w-4" />
        )}
      </button>
      <button
        onClick={toggleNuclearFacilities}
        className={`flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-all duration-200 ${
          showNuclearFacilities
            ? "bg-yellow-500 text-black hover:bg-yellow-400 shadow-yellow-500/30"
            : "bg-card/90 text-foreground hover:bg-card border border-border/50"
        } backdrop-blur-md`}
        title={
          showNuclearFacilities
            ? `Hide Nuclear Sites (${nuclearFacilities.length})`
            : "Show Nuclear Facilities"
        }
      >
        {nuclearFacilitiesLoading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <Radiation className="h-4 w-4" />
        )}
      </button>
      <button
        onClick={toggleMilitaryBases}
        className={`flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-all duration-200 ${
          showMilitaryBases
            ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/30"
            : "bg-card/90 text-foreground hover:bg-card border border-border/50"
        } backdrop-blur-md`}
        title={showMilitaryBases ? "Hide Military Bases" : "Show Military Bases"}
      >
        <Shield className="h-4 w-4" />
      </button>
    </div>
  );
}
