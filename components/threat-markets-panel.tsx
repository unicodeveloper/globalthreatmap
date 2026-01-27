"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronUp,
  ChevronDown,
  TrendingUp,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatVolume, formatProbability, getLeadingOutcome, type ParsedMarket } from "@/lib/polymarket";

const HEADER_HEIGHT = 48;
const EXPANDED_HEIGHT = 320;

export function ThreatMarketsPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [markets, setMarkets] = useState<ParsedMarket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMarkets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/polymarket?type=geopolitical&limit=30");
      const data = await response.json();

      if (data.success) {
        setMarkets(data.markets);
        setLastUpdated(new Date());
      } else {
        setError(data.error || "Failed to fetch markets");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch markets");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on first expand
  useEffect(() => {
    if (isExpanded && markets.length === 0 && !isLoading) {
      fetchMarkets();
    }
  }, [isExpanded, markets.length, isLoading, fetchMarkets]);

  // Auto-refresh every 5 minutes when panel is expanded
  useEffect(() => {
    if (!isExpanded) return;

    const interval = setInterval(fetchMarkets, 300000);
    return () => clearInterval(interval);
  }, [isExpanded, fetchMarkets]);

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t border-border transition-all duration-300 ease-in-out"
      )}
      style={{ height: isExpanded ? EXPANDED_HEIGHT : HEADER_HEIGHT }}
    >
      {/* Header - Always visible, clickable to toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full px-4 h-12 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Prediction Markets</span>
          </div>
          <span className="text-xs text-muted-foreground">
            powered by Polymarket
          </span>
          {markets.length > 0 && !isExpanded && (
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
              {markets.length} active
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && isExpanded && (
            <span className="text-[10px] text-muted-foreground">
              Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          isExpanded ? "opacity-100" : "opacity-0"
        )}
        style={{ height: isExpanded ? EXPANDED_HEIGHT - HEADER_HEIGHT : 0 }}
      >
        <div className="h-full flex flex-col border-t border-border">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
            <span className="text-xs text-muted-foreground">
              Geopolitical & conflict prediction markets
            </span>
            <div className="flex items-center gap-2">
              <a
                href="https://polymarket.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>View all</span>
                <ExternalLink className="h-3 w-3" />
              </a>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fetchMarkets();
                }}
                disabled={isLoading}
                className="p-1.5 rounded hover:bg-muted disabled:opacity-50"
                title="Refresh markets"
              >
                <RefreshCw className={cn("h-3.5 w-3.5 text-muted-foreground", isLoading && "animate-spin")} />
              </button>
            </div>
          </div>

          {/* Markets Grid */}
          <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 py-3">
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            {isLoading && markets.length === 0 && (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                <span className="text-sm">Loading markets...</span>
              </div>
            )}

            {!isLoading && markets.length === 0 && !error && (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <TrendingUp className="h-5 w-5 mr-2 opacity-50" />
                <span className="text-sm">No markets found</span>
              </div>
            )}

            {markets.length > 0 && (
              <div className="flex gap-3 h-full">
                {markets.map((market) => (
                  <MarketCard key={market.id} market={market} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface MarketCardProps {
  market: ParsedMarket;
}

function MarketCard({ market }: MarketCardProps) {
  const leading = getLeadingOutcome(market);
  const isHighProbability = leading.probability >= 70;
  const isLowProbability = leading.probability <= 30;

  return (
    <a
      href={market.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-shrink-0 w-72 h-full rounded-lg border border-border bg-card p-3 hover:bg-muted/50 transition-colors group flex flex-col"
    >
      {/* Question */}
      <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors flex-shrink-0">
        {market.question}
      </p>

      {/* Outcomes */}
      <div className="mt-2 flex items-center gap-2 flex-wrap flex-shrink-0">
        {market.outcomes.slice(0, 2).map((outcome) => (
          <div
            key={outcome.label}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
              outcome.label === leading.label
                ? isHighProbability
                  ? "bg-green-500/20 text-green-400"
                  : isLowProbability
                    ? "bg-red-500/20 text-red-400"
                    : "bg-yellow-500/20 text-yellow-400"
                : "bg-muted text-muted-foreground"
            )}
          >
            <span>{outcome.label}</span>
            <span>{formatProbability(outcome.probability)}</span>
          </div>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Volume & End Date */}
      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground flex-shrink-0">
        <span>Vol: {formatVolume(market.volume)}</span>
        {market.endDate && (
          <span>Ends: {new Date(market.endDate).toLocaleDateString()}</span>
        )}
      </div>
    </a>
  );
}

// Export height for layout calculations
export const THREAT_MARKETS_PANEL_HEIGHT = HEADER_HEIGHT;
