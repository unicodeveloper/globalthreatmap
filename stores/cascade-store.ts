import { create } from "zustand";
import type { ThreatEvent } from "@/types";

export interface CascadeEffect {
  id: string;
  targetCountry: string;
  targetCountryCode: string;
  latitude: number;
  longitude: number;
  probability: number; // 0-100
  timeframeHours: number;
  impactType: "economic" | "military" | "political" | "humanitarian" | "social";
  description: string;
  factors: string[];
  delay: number; // Animation delay in ms
}

export interface CascadeAnalysis {
  sourceEvent: ThreatEvent;
  effects: CascadeEffect[];
  summary: string;
  totalAffectedCountries: number;
  highRiskCount: number;
  generatedAt: string;
}

interface CascadeState {
  isAnalyzing: boolean;
  currentAnalysis: CascadeAnalysis | null;
  showCascadeOverlay: boolean;
  animationPhase: number; // 0 = not started, 1-5 = ripple phases
  selectedEffect: CascadeEffect | null;
  error: string | null;

  startAnalysis: (event: ThreatEvent) => void;
  setAnalysis: (analysis: CascadeAnalysis) => void;
  clearAnalysis: () => void;
  toggleOverlay: () => void;
  setAnimationPhase: (phase: number) => void;
  selectEffect: (effect: CascadeEffect | null) => void;
  setError: (error: string | null) => void;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
}

export const useCascadeStore = create<CascadeState>((set) => ({
  isAnalyzing: false,
  currentAnalysis: null,
  showCascadeOverlay: true,
  animationPhase: 0,
  selectedEffect: null,
  error: null,

  startAnalysis: (event) =>
    set({
      isAnalyzing: true,
      currentAnalysis: null,
      animationPhase: 0,
      selectedEffect: null,
      error: null,
    }),

  setAnalysis: (analysis) =>
    set({
      currentAnalysis: analysis,
      isAnalyzing: false,
      animationPhase: 1,
    }),

  clearAnalysis: () =>
    set({
      currentAnalysis: null,
      isAnalyzing: false,
      animationPhase: 0,
      selectedEffect: null,
      error: null,
    }),

  toggleOverlay: () =>
    set((state) => ({ showCascadeOverlay: !state.showCascadeOverlay })),

  setAnimationPhase: (phase) => set({ animationPhase: phase }),

  selectEffect: (effect) => set({ selectedEffect: effect }),

  setError: (error) => set({ error, isAnalyzing: false }),

  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
}));
