"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EventFeed } from "@/components/feed/event-feed";
import { EntitySearch } from "@/components/search/entity-search";
import { CascadePanel } from "@/components/cascade";
import { useCascadeStore } from "@/stores/cascade-store";
import { Activity, Search, ChevronLeft, ChevronRight, Zap } from "lucide-react";

type Tab = "feed" | "search" | "cascade";

export function Sidebar() {
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { currentAnalysis, isAnalyzing } = useCascadeStore();

  const hasCascade = currentAnalysis !== null || isAnalyzing;

  const tabs = [
    { id: "feed" as Tab, label: "Feed", icon: Activity },
    { id: "search" as Tab, label: "Search", icon: Search },
    { id: "cascade" as Tab, label: "Cascade", icon: Zap, active: hasCascade },
  ];

  return (
    <div
      className={cn(
        "relative flex h-full flex-col border-l border-border bg-card transition-all duration-300",
        isCollapsed ? "w-12" : "w-96"
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute -left-3 top-4 z-10 h-6 w-6 rounded-full border border-border bg-card"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? (
          <ChevronLeft className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
      </Button>

      {!isCollapsed && (
        <>
          <div className="flex border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex flex-1 items-center justify-center gap-1 py-3 text-xs font-medium transition-colors",
                  activeTab === tab.id
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground",
                  tab.active && activeTab !== tab.id && "text-primary/70"
                )}
              >
                <tab.icon className={cn("h-4 w-4", tab.active && "animate-pulse")} />
                {tab.label}
                {tab.active && activeTab !== tab.id && (
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary animate-pulse" />
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden">
            {activeTab === "feed" && <EventFeed />}
            {activeTab === "search" && <EntitySearch />}
            {activeTab === "cascade" && <CascadePanel />}
          </div>
        </>
      )}

      {isCollapsed && (
        <div className="flex flex-col items-center gap-2 pt-12">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant="ghost"
              size="icon"
              onClick={() => {
                setActiveTab(tab.id);
                setIsCollapsed(false);
              }}
              className={cn(
                "h-8 w-8",
                activeTab === tab.id && "bg-primary/20 text-primary"
              )}
            >
              <tab.icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
