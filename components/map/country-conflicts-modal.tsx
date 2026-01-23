"use client";

import { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Markdown } from "@/components/ui/markdown";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Swords,
  ExternalLink,
  Globe,
  History,
  AlertTriangle,
  MessageSquare,
  Database,
  RotateCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CountryConflictsModalProps {
  country: string | null;
  onClose: () => void;
  onLoadingChange?: (isLoading: boolean) => void;
}

interface ConflictSection {
  conflicts: string;
  sources: { title: string; url: string }[];
}

interface ConflictData {
  country: string;
  past: ConflictSection;
  current: ConflictSection;
}

type TabType = "current" | "past";

function AnswerSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex items-center gap-2">
        <RotateCw className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Researching conflicts - typically under 15 seconds
        </span>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  );
}

function SourcesSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-foreground">Sources</span>
        <span className="text-sm text-muted-foreground">loading sources...</span>
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-6 w-6 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <div className="flex gap-2 pt-1">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CountryConflictsModal({
  country,
  onClose,
  onLoadingChange,
}: CountryConflictsModalProps) {
  const [data, setData] = useState<ConflictData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreamingCurrent, setIsStreamingCurrent] = useState(false);
  const [isStreamingPast, setIsStreamingPast] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("current");
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!country) {
      setData(null);
      setError(null);
      onLoadingChange?.(false);
      return;
    }

    // Close any existing EventSource
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setIsLoading(true);
    setIsStreamingCurrent(true);
    setIsStreamingPast(false);
    onLoadingChange?.(true);
    setError(null);
    setActiveTab("current");

    // Initialize data structure
    setData({
      country,
      current: { conflicts: "", sources: [] },
      past: { conflicts: "", sources: [] },
    });

    const eventSource = new EventSource(
      `/api/countries/conflicts?country=${encodeURIComponent(country)}&stream=true`
    );
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const chunk = JSON.parse(event.data);

        switch (chunk.type) {
          case "current_content":
            setData((prev) =>
              prev
                ? {
                    ...prev,
                    current: {
                      ...prev.current,
                      conflicts: prev.current.conflicts + (chunk.content || ""),
                    },
                  }
                : null
            );
            break;

          case "current_sources":
            setData((prev) =>
              prev
                ? {
                    ...prev,
                    current: {
                      ...prev.current,
                      sources: chunk.sources || [],
                    },
                  }
                : null
            );
            setIsStreamingCurrent(false);
            setIsStreamingPast(true);
            break;

          case "past_content":
            setData((prev) =>
              prev
                ? {
                    ...prev,
                    past: {
                      ...prev.past,
                      conflicts: prev.past.conflicts + (chunk.content || ""),
                    },
                  }
                : null
            );
            break;

          case "past_sources":
            setData((prev) =>
              prev
                ? {
                    ...prev,
                    past: {
                      ...prev.past,
                      sources: chunk.sources || [],
                    },
                  }
                : null
            );
            break;

          case "done":
            setIsLoading(false);
            setIsStreamingCurrent(false);
            setIsStreamingPast(false);
            onLoadingChange?.(false);
            eventSource.close();
            break;

          case "error":
            setError(chunk.error || "An error occurred");
            setIsLoading(false);
            setIsStreamingCurrent(false);
            setIsStreamingPast(false);
            onLoadingChange?.(false);
            eventSource.close();
            break;
        }
      } catch {
        // Ignore JSON parse errors
      }
    };

    eventSource.onerror = () => {
      setError("Connection lost. Please try again.");
      setIsLoading(false);
      setIsStreamingCurrent(false);
      setIsStreamingPast(false);
      onLoadingChange?.(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [country, onLoadingChange]);

  const isStreaming =
    (activeTab === "current" && isStreamingCurrent) ||
    (activeTab === "past" && isStreamingPast);

  // Show skeleton while loading and content hasn't arrived yet
  // Use isLoading (not isStreaming) so skeleton stays until content actually appears
  const showAnswerSkeleton = isLoading && !data?.[activeTab].conflicts;
  const showSourcesSkeleton = isLoading && data?.[activeTab].sources.length === 0;

  return (
    <Dialog open={!!country} onClose={onClose}>
      <DialogHeader onClose={onClose}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
            <Swords className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <DialogTitle>{country}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Wars & Conflicts History
            </p>
          </div>
        </div>
      </DialogHeader>

      <DialogContent className="max-h-[60vh]">
        {error && (
          <div className="rounded-lg bg-destructive/10 p-4 text-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {data && (
          <div className="flex h-full flex-col">
            {/* Tabs */}
            <div className="mb-4 flex gap-2 border-b border-border">
              <button
                onClick={() => setActiveTab("current")}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                  activeTab === "current"
                    ? "border-red-500 text-red-400"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <AlertTriangle className="h-4 w-4" />
                Current
                {isStreamingCurrent && (
                  <RotateCw className="h-3 w-3 animate-spin" />
                )}
              </button>
              <button
                onClick={() => setActiveTab("past")}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                  activeTab === "past"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <History className="h-4 w-4" />
                Historical
                {isStreamingPast && (
                  <RotateCw className="h-3 w-3 animate-spin" />
                )}
              </button>
            </div>

            {/* Tab Content */}
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6">
                {/* Answer Section */}
                {showAnswerSkeleton ? (
                  <AnswerSkeleton />
                ) : data[activeTab].conflicts ? (
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="mb-4 flex items-center gap-2">  
                      {isStreaming && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          {/* <RotateCw className="h-3 w-3 animate-spin" />
                          <span>generating</span> */}
                        </div>
                      )}
                    </div>
                    <div className="prose prose-base prose-invert max-w-none">
                      <Markdown
                        content={data[activeTab].conflicts}
                        className="text-base leading-relaxed"
                      />
                      {isStreaming && (
                        <span className="inline-block h-4 w-1 animate-pulse bg-primary" />
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Sources Section */}
                {showSourcesSkeleton ? (
                  <SourcesSkeleton />
                ) : data[activeTab].sources.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">Sources</span>
                      <span className="text-sm text-muted-foreground">
                        ({data[activeTab].sources.length})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {data[activeTab].sources.slice(0, 10).map((source, i) => (
                        <a
                          key={i}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-2 rounded-lg border border-border bg-card p-3 text-sm transition-colors hover:bg-muted/50"
                        >
                          <Globe className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <span className="line-clamp-2 text-foreground">
                              {source.title}
                            </span>
                            <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <ExternalLink className="h-3 w-3" />
                              {new URL(source.url).hostname}
                            </span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </ScrollArea>
          </div>
        )}

        {!isLoading && !error && !data && (
          <div className="py-12 text-center">
            <Swords className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              Click on a country to view its conflict history
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
