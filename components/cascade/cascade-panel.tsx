"use client";

import { useState } from "react";
import { useCascadeStore, type CascadeEffect } from "@/stores/cascade-store";
import { useMapStore } from "@/stores/map-store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Zap,
  X,
  Eye,
  EyeOff,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  Shield,
  Users,
  DollarSign,
  Heart,
  Clock,
  Target,
  Loader2,
} from "lucide-react";

const IMPACT_ICONS: Record<string, React.ElementType> = {
  economic: DollarSign,
  military: Shield,
  political: TrendingUp,
  humanitarian: Heart,
  social: Users,
};

const IMPACT_COLORS: Record<string, string> = {
  economic: "#eab308",
  military: "#ef4444",
  political: "#8b5cf6",
  humanitarian: "#ec4899",
  social: "#06b6d4",
};

function getProbabilityColor(probability: number): string {
  if (probability >= 70) return "#ef4444"; // red
  if (probability >= 50) return "#f97316"; // orange
  if (probability >= 30) return "#eab308"; // yellow
  return "#22c55e"; // green
}

function formatTimeframe(hours: number): string {
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

export function CascadePanel() {
  const {
    isAnalyzing,
    currentAnalysis,
    showCascadeOverlay,
    selectedEffect,
    error,
    clearAnalysis,
    toggleOverlay,
    selectEffect,
  } = useCascadeStore();

  const { flyTo } = useMapStore();
  const [expandedEffect, setExpandedEffect] = useState<string | null>(null);

  const handleEffectClick = (effect: CascadeEffect) => {
    selectEffect(effect);
    flyTo(effect.longitude, effect.latitude, 5);
  };

  const toggleExpand = (effectId: string) => {
    setExpandedEffect(expandedEffect === effectId ? null : effectId);
  };

  if (!currentAnalysis && !isAnalyzing) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">Cascade Prediction</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Analyze how events ripple across regions
          </p>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Zap className="h-8 w-8 text-primary" />
          </div>
          <h3 className="mt-4 font-medium text-foreground">No Analysis Active</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Click on any event marker on the map, then click the{" "}
            <span className="font-medium text-primary">"Analyze Cascade"</span> button
            to see how it might ripple across regions.
          </p>
        </div>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">Cascade Prediction</h2>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <h3 className="mt-4 font-medium text-foreground">Analyzing Cascade Effects</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Simulating geopolitical and economic ripple effects...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">Cascade Prediction</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={clearAnalysis} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <h3 className="mt-4 font-medium text-foreground">Analysis Failed</h3>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" className="mt-4" onClick={clearAnalysis}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">Cascade Prediction</h2>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleOverlay}
              className="h-8 w-8"
              title={showCascadeOverlay ? "Hide overlay" : "Show overlay"}
            >
              {showCascadeOverlay ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={clearAnalysis} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Source Event */}
          {currentAnalysis && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="flex items-start gap-2">
                <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-primary">Source Event</p>
                  <p className="mt-1 text-sm font-medium text-foreground line-clamp-2">
                    {currentAnalysis.sourceEvent.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {currentAnalysis.sourceEvent.location?.country || "Unknown location"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Summary Stats */}
          {currentAnalysis && (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border bg-background/50 p-3 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {currentAnalysis.totalAffectedCountries}
                </p>
                <p className="text-xs text-muted-foreground">Countries Affected</p>
              </div>
              <div className="rounded-lg border border-border bg-background/50 p-3 text-center">
                <p className="text-2xl font-bold text-red-500">
                  {currentAnalysis.highRiskCount}
                </p>
                <p className="text-xs text-muted-foreground">High Risk (60%+)</p>
              </div>
            </div>
          )}

          {/* Summary */}
          {currentAnalysis && (
            <div className="rounded-lg border border-border bg-background/50 p-3">
              <p className="text-sm text-muted-foreground">{currentAnalysis.summary}</p>
            </div>
          )}

          {/* Cascade Effects List */}
          {currentAnalysis && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">Cascade Effects</h3>

              {currentAnalysis.effects.map((effect) => {
                const ImpactIcon = IMPACT_ICONS[effect.impactType] || AlertTriangle;
                const isExpanded = expandedEffect === effect.id;
                const isSelected = selectedEffect?.id === effect.id;

                return (
                  <div
                    key={effect.id}
                    className={cn(
                      "rounded-lg border border-border bg-background/50 transition-all",
                      isSelected && "ring-2 ring-primary border-primary"
                    )}
                  >
                    <div
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => handleEffectClick(effect)}
                    >
                      {/* Probability indicator */}
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full text-white text-sm font-bold shrink-0"
                        style={{ backgroundColor: getProbabilityColor(effect.probability) }}
                      >
                        {effect.probability}%
                      </div>

                      {/* Country info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground truncate">
                            {effect.targetCountry}
                          </span>
                          <Badge
                            variant="outline"
                            className="shrink-0 text-[10px]"
                            style={{
                              borderColor: IMPACT_COLORS[effect.impactType],
                              color: IMPACT_COLORS[effect.impactType],
                            }}
                          >
                            <ImpactIcon className="mr-1 h-3 w-3" />
                            {effect.impactType}
                          </Badge>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>~{formatTimeframe(effect.timeframeHours)}</span>
                        </div>
                      </div>

                      {/* Expand button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(effect.id);
                        }}
                      >
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 transition-transform",
                            isExpanded && "rotate-90"
                          )}
                        />
                      </Button>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="border-t border-border p-3 space-y-2">
                        <p className="text-sm text-muted-foreground">{effect.description}</p>

                        {effect.factors.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-foreground">Risk Factors:</p>
                            <div className="flex flex-wrap gap-1">
                              {effect.factors.map((factor, i) => (
                                <Badge key={i} variant="secondary" className="text-[10px]">
                                  {factor}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
