"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, TrendingUp } from "lucide-react";

const HEADER_HEIGHT = 40;
const TICKER_HEIGHT = 48;
const COLLAPSED_HEIGHT = HEADER_HEIGHT;
const EXPANDED_HEIGHT = HEADER_HEIGHT + TICKER_HEIGHT;

interface PolymarketTickerProps {
  category?: "Breaking News" | "Politics" | "Crypto" | "Sports" | "Technology" | "Finance & Earnings";
}

export function PolymarketTicker({ category = "Politics" }: PolymarketTickerProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const tickerUrl = `https://ticker.polymarket.com/embed?category=${encodeURIComponent(category)}&theme=dark&speed=1&displayMode=classic&height=${TICKER_HEIGHT}`;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border overflow-hidden"
      style={{ height: isCollapsed ? COLLAPSED_HEIGHT : EXPANDED_HEIGHT }}
    >
      {/* Header bar - clickable to toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center justify-between w-full px-4 border-b border-border hover:bg-muted/50 transition-colors"
        style={{ height: HEADER_HEIGHT }}
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="h-4 w-4" />
          <span>Prediction Markets</span>
          <span className="text-xs opacity-60">powered by Polymarket</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{category}</span>
          {isCollapsed ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Ticker iframe */}
      {!isCollapsed && (
        <iframe
          src={tickerUrl}
          className="w-full border-0 block"
          style={{ height: TICKER_HEIGHT }}
          title="Polymarket Prediction Markets"
          sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox"
        />
      )}
    </div>
  );
}

// Export height for use in layout
export const POLYMARKET_TICKER_HEIGHT = EXPANDED_HEIGHT;