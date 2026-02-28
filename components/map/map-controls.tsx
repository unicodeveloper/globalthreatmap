"use client";

import { useMapStore } from "@/stores/map-store";
import { Shield, Flame } from "lucide-react";

export function MapControls() {
  const {
    showMilitaryBases,
    toggleMilitaryBases,
    showFireDetections,
    toggleFireDetections,
    fireDetections,
    fireDetectionsLoading,
  } = useMapStore();

  return (
    <div className="absolute bottom-20 left-6 z-10 flex flex-col gap-2">
      <button
        onClick={toggleFireDetections}
        className={`flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-200 ${
          showFireDetections
            ? "bg-orange-600 text-white hover:bg-orange-700"
            : "bg-card/95 text-foreground hover:bg-card border border-border"
        } backdrop-blur-sm`}
        title={
          showFireDetections
            ? `Hide Fire Detections (${fireDetections.length})`
            : "Show Fire Detections (NASA FIRMS)"
        }
      >
        {fireDetectionsLoading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <Flame className="h-5 w-5" />
        )}
      </button>
      <button
        onClick={toggleMilitaryBases}
        className={`flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-200 ${
          showMilitaryBases
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-card/95 text-foreground hover:bg-card border border-border"
        } backdrop-blur-sm`}
        title={showMilitaryBases ? "Hide Military Bases" : "Show Military Bases"}
      >
        <Shield className="h-5 w-5" />
      </button>
    </div>
  );
}
