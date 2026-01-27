"use client";

import { useState, useEffect } from "react";
import { useEvents } from "@/hooks/use-events";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { ThreatMap } from "@/components/map/threat-map";
import { TimelineScrubber } from "@/components/map/timeline-scrubber";
import { MapControls } from "@/components/map/map-controls";
import { WelcomeModal } from "@/components/welcome-modal";
import { SignInPanel } from "@/components/auth";
import { ThreatMarketsPanel, THREAT_MARKETS_PANEL_HEIGHT } from "@/components/threat-markets-panel";

const WELCOME_DISMISSED_KEY = "globalthreatmap_welcome_dismissed";

export default function Home() {
  const [showWelcome, setShowWelcome] = useState(false);
  const { isLoading, refresh } = useEvents({
    autoRefresh: true,
    refreshInterval: 300000, // 5 minutes
  });

  useEffect(() => {
    const dismissed = localStorage.getItem(WELCOME_DISMISSED_KEY);
    if (!dismissed) {
      setShowWelcome(true);
    }
  }, []);

  return (
    <div className="flex h-screen flex-col" style={{ paddingBottom: THREAT_MARKETS_PANEL_HEIGHT }}>
      <Header
        onRefresh={refresh}
        isLoading={isLoading}
        onShowHelp={() => setShowWelcome(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="relative flex-1">
          <ThreatMap />
          <TimelineScrubber />
          <MapControls />
        </div>
        <Sidebar />
      </div>
      <WelcomeModal open={showWelcome} onOpenChange={setShowWelcome} />
      <SignInPanel />
      <ThreatMarketsPanel />
    </div>
  );
}
