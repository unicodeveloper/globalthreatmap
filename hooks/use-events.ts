"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEventsStore } from "@/stores/events-store";
import { useAuthStore } from "@/stores/auth-store";
import { hasReachedLimit, incrementEventLoads } from "@/lib/usage-limits";
import type { ThreatEvent } from "@/types";

const APP_MODE = process.env.NEXT_PUBLIC_APP_MODE || "self-hosted";

interface UseEventsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  queries?: string[];
}

export function useEvents(options: UseEventsOptions = {}) {
  const {
    autoRefresh = true,
    refreshInterval = 60000,
    queries,
  } = options;

  const {
    events,
    filteredEvents,
    isLoading,
    error,
    setEvents,
    addEvents,
    setLoading,
    setError,
  } = useEventsStore();

  const { getAccessToken, signOut, isAuthenticated, initialized } = useAuthStore();
  const [requiresSignIn, setRequiresSignIn] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialFetchRef = useRef(false);

  const requiresAuth = APP_MODE === "valyu";

  const fetchEvents = useCallback(async () => {
    if (requiresAuth && initialized && !isAuthenticated && hasReachedLimit()) {
      setRequiresSignIn(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const accessToken = getAccessToken();

      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queries: queries || [], accessToken }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }

      const data = await response.json();

      if (data.requiresReauth) {
        signOut();
        setError("Session expired. Please sign in again.");
        return;
      }

      const newEvents: ThreatEvent[] = data.events;

      if (!initialFetchRef.current) {
        setEvents(newEvents);
        initialFetchRef.current = true;
        if (requiresAuth && initialized && !isAuthenticated) {
          incrementEventLoads();
        }
      } else {
        const existingIds = new Set(events.map((e) => e.id));
        const trulyNewEvents = newEvents.filter((e) => !existingIds.has(e.id));

        if (trulyNewEvents.length > 0) {
          addEvents(trulyNewEvents);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  }, [queries, events, setEvents, addEvents, setLoading, setError, getAccessToken, signOut, requiresAuth, isAuthenticated, initialized]);

  const refresh = useCallback(() => {
    if (requiresAuth && initialized && !isAuthenticated && hasReachedLimit()) {
      setRequiresSignIn(true);
      return;
    }
    if (requiresAuth && initialized && !isAuthenticated) {
      incrementEventLoads();
    }
    fetchEvents();
  }, [fetchEvents, requiresAuth, isAuthenticated, initialized]);

  useEffect(() => {
    if (!initialFetchRef.current) {
      fetchEvents();
    }

    if (autoRefresh && !(requiresAuth && initialized && !isAuthenticated && hasReachedLimit())) {
      intervalRef.current = setInterval(fetchEvents, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, fetchEvents, requiresAuth, isAuthenticated, initialized]);

  useEffect(() => {
    if (isAuthenticated) {
      setRequiresSignIn(false);
    }
  }, [isAuthenticated]);

  return {
    events,
    filteredEvents,
    isLoading,
    error,
    refresh,
    requiresSignIn,
  };
}
