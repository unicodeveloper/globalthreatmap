"use client";

import { memo, useCallback } from "react";
import type { ThreatEvent } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/ui/markdown";
import { formatRelativeTime, cn } from "@/lib/utils";
import { useMapStore } from "@/stores/map-store";
import {
  MapPin,
  Clock,
  Swords,
  Users,
  CloudLightning,
  Landmark,
  TrendingDown,
  AlertTriangle,
  Shield,
  Heart,
  Leaf,
  Target,
  Skull,
  Anchor,
  Droplets,
  ShoppingCart,
} from "lucide-react";

const categoryIconMap = {
  conflict: Swords,
  protest: Users,
  disaster: CloudLightning,
  diplomatic: Landmark,
  economic: TrendingDown,
  terrorism: AlertTriangle,
  cyber: Shield,
  health: Heart,
  environmental: Leaf,
  military: Target,
  crime: Skull,
  piracy: Anchor,
  infrastructure: Droplets,
  commodities: ShoppingCart,
};

interface EventCardProps {
  event: ThreatEvent;
  isSelected: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
}

export const EventCard = memo(function EventCard({
  event,
  isSelected,
  onClick,
  style,
}: EventCardProps) {
  const flyTo = useMapStore((state) => state.flyTo);
  const CategoryIcon = categoryIconMap[event.category] || AlertTriangle;

  const handleClick = useCallback(() => {
    onClick();
    flyTo(event.location.longitude, event.location.latitude, 6);
  }, [onClick, flyTo, event.location.longitude, event.location.latitude]);

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:bg-accent/50 event-card-enter",
        isSelected && "ring-2 ring-primary bg-accent/30"
      )}
      style={style}
      onClick={handleClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
              event.threatLevel === "critical" && "bg-red-500/20 text-red-400",
              event.threatLevel === "high" &&
                "bg-orange-500/20 text-orange-400",
              event.threatLevel === "medium" &&
                "bg-yellow-500/20 text-yellow-400",
              event.threatLevel === "low" && "bg-green-500/20 text-green-400",
              event.threatLevel === "info" && "bg-blue-500/20 text-blue-400"
            )}
          >
            <CategoryIcon className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-medium text-foreground line-clamp-2">
                {event.title}
              </h3>
              <Badge
                variant={event.threatLevel}
                className="shrink-0 text-xs capitalize"
              >
                {event.threatLevel}
              </Badge>
            </div>

            <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
              <Markdown content={event.summary} />
            </div>

            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {event.location.placeName ||
                  event.location.country ||
                  "Unknown"}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(event.timestamp)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
