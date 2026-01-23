"use client";

import { useEventsStore } from "@/stores/events-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import type { EventCategory, ThreatLevel } from "@/types";

const THREAT_LEVELS: ThreatLevel[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
];

const CATEGORIES: EventCategory[] = [
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
];

export function FeedFilters() {
  const {
    searchQuery,
    categoryFilters,
    threatLevelFilters,
    setSearchQuery,
    setCategoryFilters,
    setThreatLevelFilters,
    clearFilters,
  } = useEventsStore();

  const hasFilters =
    searchQuery ||
    categoryFilters.length > 0 ||
    threatLevelFilters.length > 0;

  const toggleCategory = (category: EventCategory) => {
    if (categoryFilters.includes(category)) {
      setCategoryFilters(categoryFilters.filter((c) => c !== category));
    } else {
      setCategoryFilters([...categoryFilters, category]);
    }
  };

  const toggleThreatLevel = (level: ThreatLevel) => {
    if (threatLevelFilters.includes(level)) {
      setThreatLevelFilters(threatLevelFilters.filter((l) => l !== level));
    } else {
      setThreatLevelFilters([...threatLevelFilters, level]);
    }
  };

  return (
    <div className="border-b border-border p-4 space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search events..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Threat Level
        </p>
        <div className="flex flex-wrap gap-1">
          {THREAT_LEVELS.map((level) => (
            <Badge
              key={level}
              variant={threatLevelFilters.includes(level) ? level : "outline"}
              className="cursor-pointer capitalize"
              onClick={() => toggleThreatLevel(level)}
            >
              {level}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Category
        </p>
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((category) => (
            <Badge
              key={category}
              variant={
                categoryFilters.includes(category) ? "default" : "outline"
              }
              className="cursor-pointer capitalize"
              onClick={() => toggleCategory(category)}
            >
              {category}
            </Badge>
          ))}
        </div>
      </div>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="w-full text-muted-foreground"
        >
          <X className="mr-2 h-4 w-4" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}
