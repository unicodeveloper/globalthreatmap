"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEventsStore } from "@/stores/events-store";
import { useAuthStore } from "@/stores/auth-store";
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

  const { getAccessToken, signOut, isAuthenticated } = useAuthStore();
  const [requiresSignIn, setRequiresSignIn] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialFetchRef = useRef(false);

  const requiresAuth = APP_MODE === "valyu";

  const fetchEvents = useCallback(async (isInitialLoad = false) => {
    // After initial load, require sign-in for refreshes
    if (requiresAuth && !isInitialLoad && !isAuthenticated) {
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
  }, [queries, events, setEvents, addEvents, setLoading, setError, getAccessToken, signOut, requiresAuth, isAuthenticated]);

  const refresh = useCallback(() => {
    // After initial load, require sign-in for refreshes
    if (requiresAuth && !isAuthenticated) {
      setRequiresSignIn(true);
      return;
    }
    fetchEvents(false);
  }, [fetchEvents, requiresAuth, isAuthenticated]);

  useEffect(() => {
    if (!initialFetchRef.current) {
      // First load is always free
      fetchEvents(true);
    }

    // Only auto-refresh if authenticated (after initial load)
    if (autoRefresh && isAuthenticated) {
      intervalRef.current = setInterval(() => fetchEvents(false), refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, fetchEvents, isAuthenticated]);

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
