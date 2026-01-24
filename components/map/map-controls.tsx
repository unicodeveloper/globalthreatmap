"use client";

import { useMapStore } from "@/stores/map-store";
import { Shield } from "lucide-react";

export function MapControls() {
  const { showMilitaryBases, toggleMilitaryBases } = useMapStore();

  return (
    <div className="absolute bottom-20 left-6 z-10">
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
