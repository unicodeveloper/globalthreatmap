"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Loader2,
  Building2,
  User,
  Globe,
  Users,
  FileText,
  MapPin,
  Navigation,
  Lock,
  FileSpreadsheet,
  Presentation,
  File,
  Maximize2,
} from "lucide-react";
import { Favicon } from "@/components/ui/favicon";
import { useMapStore } from "@/stores/map-store";
import { useAuthStore } from "@/stores/auth-store";
import { Markdown } from "@/components/ui/markdown";
import { SignInModal } from "@/components/auth/sign-in-modal";
import type { EntityProfile } from "@/types";

const APP_MODE = process.env.NEXT_PUBLIC_APP_MODE || "self-hosted";

const typeIcons = {
  organization: Building2,
  person: User,
  country: Globe,
  group: Users,
};

interface DeepResearchProgress {
  currentStep: number;
  totalSteps: number;
}

interface DeepResearchResult {
  output: string;
  sources: Array<{ title: string; url: string }>;
  deliverables?: Array<{
    type: string;
    title: string;
    url: string;
    status: string;
  }>;
  pdfUrl?: string;
}

export function EntitySearch() {
  const [query, setQuery] = useState("");
  const [entity, setEntity] = useState<EntityProfile | null>(null);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showFullReport, setShowFullReport] = useState(false);

  // Deep research state
  const [deepResearchTaskId, setDeepResearchTaskId] = useState<string | null>(null);
  const [deepResearchProgress, setDeepResearchProgress] = useState<DeepResearchProgress | null>(null);
  const [deepResearchResult, setDeepResearchResult] = useState<DeepResearchResult | null>(null);
  const [deepResearchError, setDeepResearchError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const { flyTo, setEntityLocations, clearEntityLocations } = useMapStore();
  const { isAuthenticated, accessToken } = useAuthStore();

  const requiresAuth = APP_MODE === "valyu";
  const isLoading = !!deepResearchTaskId;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // Poll for deep research status
  useEffect(() => {
    if (!deepResearchTaskId) return;

    const pollStatus = async () => {
      try {
        const url = new URL(`/api/deepresearch/${deepResearchTaskId}`, window.location.origin);
        if (accessToken) {
          url.searchParams.set("accessToken", accessToken);
        }
        const response = await fetch(url.toString());
        const data = await response.json();

        if (data.error) {
          setDeepResearchError(data.error);
          setDeepResearchTaskId(null);
          if (pollingRef.current) clearInterval(pollingRef.current);
          return;
        }

        if (data.progress) {
          setDeepResearchProgress(data.progress);
        }

        if (data.status === "completed") {
          setDeepResearchResult({
            output: data.output,
            sources: data.sources || [],
            deliverables: data.deliverables,
            pdfUrl: data.pdfUrl,
          });
          setDeepResearchTaskId(null);
          if (pollingRef.current) clearInterval(pollingRef.current);
        } else if (data.status === "failed") {
          setDeepResearchError(data.error || "Research failed");
          setDeepResearchTaskId(null);
          if (pollingRef.current) clearInterval(pollingRef.current);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    // Poll immediately, then every 5 seconds
    pollStatus();
    pollingRef.current = setInterval(pollStatus, 5000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [deepResearchTaskId, accessToken]);

  const handleSearch = async () => {
    if (!query.trim()) return;

    // Always require sign-in for intel search
    if (!isAuthenticated) {
      setShowSignInModal(true);
      return;
    }

    // Reset state
    clearEntityLocations();
    setEntity(null);
    setDeepResearchResult(null);
    setDeepResearchProgress(null);
    setDeepResearchError(null);

    // Create placeholder entity
    setEntity({
      id: `entity_${Date.now()}`,
      name: query,
      type: "group",
      description: "",
      locations: [],
      relatedEntities: [],
      economicData: {},
    });

    // Start deep research
    fetch("/api/deepresearch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: query, accessToken }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setDeepResearchError(data.error);
        } else if (data.taskId) {
          setDeepResearchTaskId(data.taskId);
        }
      })
      .catch(() => {
        setDeepResearchError("Failed to start research");
      });
  };

  const handleShowOnMap = () => {
    if (entity?.locations && entity.locations.length > 0) {
      setEntityLocations(entity.name, entity.locations);
      const firstLocation = entity.locations[0];
      flyTo(firstLocation.longitude, firstLocation.latitude, 4);
    }
  };

  const handleFlyToLocation = (longitude: number, latitude: number) => {
    flyTo(longitude, latitude, 8);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const TypeIcon = entity ? typeIcons[entity.type] : Building2;

  // Get deliverable by type
  const getDeliverable = (type: string) => {
    return deepResearchResult?.deliverables?.find(
      (d) => d.type === type && d.status === "completed"
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <h2 className="text-lg font-semibold text-foreground">Build Dossier</h2>
        <p className="text-sm text-muted-foreground">
          Deep research on any actor with sourced analysis
        </p>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="e.g. Wagner Group, Hezbollah, North Korea..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9"
            />
          </div>
          <Button onClick={handleSearch} disabled={isLoading || !query.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Research"
            )}
          </Button>
        </div>

        {/* Deep research progress */}
        {isLoading && (
          <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-sm">
            <div className="flex items-center gap-2 text-foreground font-medium mb-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Generating Intelligence Report
            </div>
            {deepResearchProgress ? (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Step {deepResearchProgress.currentStep} of {deepResearchProgress.totalSteps}</span>
                  <span>{Math.round((deepResearchProgress.currentStep / deepResearchProgress.totalSteps) * 100)}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{
                      width: `${(deepResearchProgress.currentStep / deepResearchProgress.totalSteps) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary/50 animate-pulse w-1/4" />
              </div>
            )}
            <p className="text-muted-foreground text-xs mt-2">
              This takes <span className="text-foreground font-medium">5-10 minutes</span> but produces an extremely detailed report with CSV data export and PowerPoint briefing.
            </p>
          </div>
        )}

        {/* Deep research error */}
        {deepResearchError && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {deepResearchError}
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 p-4">
        {entity && deepResearchResult && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                  <TypeIcon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{entity.name}</CardTitle>
                  <Badge variant="outline" className="mt-1 capitalize">
                    {entity.type}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Deep Research Report Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <FileText className="h-4 w-4" />
                    Intelligence Report
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFullReport(true)}
                    className="h-7 text-xs"
                  >
                    <Maximize2 className="mr-1 h-3 w-3" />
                    View Full Report
                  </Button>
                </div>

                {/* Preview - first 800 chars */}
                <div className="text-sm text-muted-foreground max-h-40 overflow-hidden relative">
                  <Markdown content={deepResearchResult.output.slice(0, 800) + "..."} />
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent" />
                </div>

                {/* Deliverables Download Buttons */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  {getDeliverable("csv") && (
                    <a
                      href={getDeliverable("csv")!.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex"
                    >
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-green-500" />
                        Download CSV
                      </Button>
                    </a>
                  )}
                  {getDeliverable("pptx") && (
                    <a
                      href={getDeliverable("pptx")!.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex"
                    >
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        <Presentation className="mr-1.5 h-3.5 w-3.5 text-orange-500" />
                        Download PPTX
                      </Button>
                    </a>
                  )}
                  {deepResearchResult.pdfUrl && (
                    <a
                      href={deepResearchResult.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex"
                    >
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        <File className="mr-1.5 h-3.5 w-3.5 text-red-500" />
                        Download PDF
                      </Button>
                    </a>
                  )}
                </div>
              </div>

              {/* Sources */}
              {deepResearchResult.sources.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium text-foreground">
                    Sources ({deepResearchResult.sources.length})
                  </h4>
                  <div className="space-y-1">
                    {deepResearchResult.sources.slice(0, 10).map((source, i) => (
                      <a
                        key={i}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
                      >
                        <Favicon url={source.url} size={16} />
                        <span className="truncate">{source.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!entity && !isLoading && (
          <div className="py-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              Enter any actor to compile an intelligence dossier
            </p>
            <div className="mt-3 space-y-1 text-xs text-muted-foreground/70">
              <p>Wagner Group, Houthis, Hezbollah, North Korea</p>
              <p>Nations, militias, PMCs, cartels, political figures</p>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <p>Reports take <span className="text-foreground font-medium">5-10 minutes</span> to generate but are extremely detailed with downloadable CSV data and PowerPoint briefings.</p>
            </div>
            {requiresAuth && !isAuthenticated && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                <Lock className="h-4 w-4" />
                <span>Sign in required</span>
              </div>
            )}
          </div>
        )}

        {entity && isLoading && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                  <TypeIcon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{entity.name}</CardTitle>
                  <Badge variant="outline" className="mt-1 capitalize">
                    {entity.type}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                <div className="h-4 bg-muted rounded animate-pulse w-full" />
                <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
                <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
              </div>
            </CardContent>
          </Card>
        )}
      </ScrollArea>

      {/* Full Report Dialog */}
      <Dialog open={showFullReport} onClose={() => setShowFullReport(false)} className="max-w-4xl">
        <DialogHeader onClose={() => setShowFullReport(false)}>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Intelligence Report: {entity?.name}
          </DialogTitle>
        </DialogHeader>
        <DialogContent className="h-[70vh] flex flex-col">
          {/* Download buttons */}
          <div className="flex flex-wrap gap-2 pb-3 border-b border-border mb-3">
            {getDeliverable("csv") && (
              <a href={getDeliverable("csv")!.url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <FileSpreadsheet className="mr-1.5 h-4 w-4 text-green-500" />
                  Download CSV
                </Button>
              </a>
            )}
            {getDeliverable("pptx") && (
              <a href={getDeliverable("pptx")!.url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <Presentation className="mr-1.5 h-4 w-4 text-orange-500" />
                  Download PPTX
                </Button>
              </a>
            )}
            {deepResearchResult?.pdfUrl && (
              <a href={deepResearchResult.pdfUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <File className="mr-1.5 h-4 w-4 text-red-500" />
                  Download PDF
                </Button>
              </a>
            )}
          </div>
          <ScrollArea className="flex-1">
            <div className="prose prose-sm dark:prose-invert max-w-none pr-4">
              {deepResearchResult && (
                <Markdown content={deepResearchResult.output} />
              )}
            </div>
            {/* Sources at bottom */}
            {deepResearchResult?.sources && deepResearchResult.sources.length > 0 && (
              <div className="mt-8 pt-4 border-t border-border">
                <h4 className="text-sm font-medium mb-3">Sources ({deepResearchResult.sources.length})</h4>
                <div className="grid grid-cols-2 gap-2">
                  {deepResearchResult.sources.slice(0, 20).map((source, i) => (
                    <a
                      key={i}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground truncate"
                    >
                      <Favicon url={source.url} size={12} />
                      <span className="truncate">{source.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <SignInModal open={showSignInModal} onOpenChange={setShowSignInModal} />
    </div>
  );
}
