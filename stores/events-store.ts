import { create } from "zustand";
import type { ThreatEvent, TimeRange } from "@/types";

// Threat level priority for sorting (lower = higher priority)
const THREAT_LEVEL_PRIORITY: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

interface EventsState {
  events: ThreatEvent[];
  filteredEvents: ThreatEvent[];
  selectedEvent: ThreatEvent | null;
  isLoading: boolean;
  error: string | null;
  timeRange: TimeRange | null;
  categoryFilters: string[];
  threatLevelFilters: string[];
  searchQuery: string;

  setEvents: (events: ThreatEvent[]) => void;
  addEvent: (event: ThreatEvent) => void;
  addEvents: (events: ThreatEvent[]) => void;
  selectEvent: (event: ThreatEvent | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setTimeRange: (range: TimeRange | null) => void;
  setCategoryFilters: (categories: string[]) => void;
  setThreatLevelFilters: (levels: string[]) => void;
  setSearchQuery: (query: string) => void;
  applyFilters: () => void;
  clearFilters: () => void;
}

export const useEventsStore = create<EventsState>((set, get) => ({
  events: [],
  filteredEvents: [],
  selectedEvent: null,
  isLoading: false,
  error: null,
  timeRange: null,
  categoryFilters: [],
  threatLevelFilters: [],
  searchQuery: "",

  setEvents: (events) => {
    set({ events });
    get().applyFilters();
  },

  addEvent: (event) => {
    set((state) => ({
      events: [event, ...state.events].slice(0, 1000),
    }));
    get().applyFilters();
  },

  addEvents: (events) => {
    set((state) => ({
      events: [...events, ...state.events].slice(0, 1000),
    }));
    get().applyFilters();
  },

  selectEvent: (event) => set({ selectedEvent: event }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  setTimeRange: (timeRange) => {
    set({ timeRange });
    get().applyFilters();
  },

  setCategoryFilters: (categoryFilters) => {
    set({ categoryFilters });
    get().applyFilters();
  },

  setThreatLevelFilters: (threatLevelFilters) => {
    set({ threatLevelFilters });
    get().applyFilters();
  },

  setSearchQuery: (searchQuery) => {
    set({ searchQuery });
    get().applyFilters();
  },

  applyFilters: () => {
    const {
      events,
      timeRange,
      categoryFilters,
      threatLevelFilters,
      searchQuery,
    } = get();

    let filtered = [...events];

    if (timeRange) {
      filtered = filtered.filter((event) => {
        const eventTime = new Date(event.timestamp);
        return eventTime >= timeRange.start && eventTime <= timeRange.end;
      });
    }

    if (categoryFilters.length > 0) {
      filtered = filtered.filter((event) =>
        categoryFilters.includes(event.category)
      );
    }

    if (threatLevelFilters.length > 0) {
      filtered = filtered.filter((event) =>
        threatLevelFilters.includes(event.threatLevel)
      );
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (event) =>
          event.title.toLowerCase().includes(query) ||
          event.summary.toLowerCase().includes(query) ||
          event.location.placeName?.toLowerCase().includes(query) ||
          event.location.country?.toLowerCase().includes(query)
      );
    }

    // Sort by threat level first (critical -> high -> medium -> low -> info), then by date
    filtered.sort((a, b) => {
      const priorityA = THREAT_LEVEL_PRIORITY[a.threatLevel] ?? 5;
      const priorityB = THREAT_LEVEL_PRIORITY[b.threatLevel] ?? 5;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      // Within same threat level, sort by date (most recent first)
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateB - dateA;
    });

    set({ filteredEvents: filtered });
  },

  clearFilters: () => {
    set({
      timeRange: null,
      categoryFilters: [],
      threatLevelFilters: [],
      searchQuery: "",
    });
    get().applyFilters();
  },
}));
