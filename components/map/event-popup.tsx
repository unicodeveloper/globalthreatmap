"use client";

import { useState } from "react";
import type { ThreatEvent } from "@/types";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";
import { ExternalLink, MapPin, ArrowDownRight, ChevronUp } from "lucide-react";
import { Streamdown } from "streamdown";

interface EventPopupProps {
  event: ThreatEvent;
}

export function EventPopup({ event }: EventPopupProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`min-w-[250px] p-2 ${isExpanded ? "max-w-[500px]" : "max-w-[300px]"}`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground line-clamp-2">
          <a
            href={event.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-foreground hover:underline"
          >
            {event.title}
          </a>
        </h3>
        <Badge
          variant={event.threatLevel}
          className="shrink-0 text-xs capitalize"
        >
          {event.threatLevel}
        </Badge>
      </div>

      {!isExpanded ? (
        <div className="mb-2 text-xs text-muted-foreground line-clamp-3">
          {event.summary}
        </div>
      ) : (
        <div className="mb-2 max-h-[400px] overflow-y-auto rounded-md bg-muted/30 p-3">
          <div className="prose prose-sm prose-invert max-w-none text-xs">
            <Streamdown>{event.rawContent || event.summary}</Streamdown>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <MapPin className="h-3 w-3" />
        <span>
          {event.location.placeName || event.location.country || "Unknown"}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {formatRelativeTime(event.timestamp)}
        </span>
        <div className="flex items-center gap-2">
          {event.rawContent && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Collapse
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-3 w-3" />
                  Expand
                </>
              )}
            </button>
          )}
          {event.sourceUrl && (
            <a
              href={event.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              Source <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        <Badge variant="outline" className="text-xs capitalize">
          {event.category}
        </Badge>
        {event.keywords?.slice(0, 2).map((keyword) => (
          <Badge key={keyword} variant="secondary" className="text-xs">
            {keyword}
          </Badge>
        ))}
      </div>
    </div>
  );
}
