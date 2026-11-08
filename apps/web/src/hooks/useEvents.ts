"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EventsResponse } from "@risksense/shared";

interface State {
  data: EventsResponse | null;
  loading: boolean;
  error: string | null;
  /** Wall-clock time of the last successful load. */
  loadedAt: number | null;
}

/**
 * Loads the aggregated event feed for a time window and refreshes it on an
 * interval. The feed is real: every record comes from a live upstream source.
 */
export function useEvents(windowHours: number, refreshMs = 180_000) {
  const [state, setState] = useState<State>({
    data: null,
    loading: true,
    error: null,
    loadedAt: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(
    async (showSpinner: boolean) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      if (showSpinner) setState((s) => ({ ...s, loading: true, error: null }));

      try {
        const res = await fetch(`/api/events?window=${windowHours}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        const data = (await res.json()) as EventsResponse;
        setState({ data, loading: false, error: null, loadedAt: Date.now() });
      } catch (e) {
        if (controller.signal.aborted) return;
        setState((s) => ({
          ...s,
          loading: false,
          error: e instanceof Error ? e.message : "Unknown error",
        }));
      }
    },
    [windowHours],
  );

  useEffect(() => {
    void load(true);
    const timer = setInterval(() => void load(false), refreshMs);
    return () => {
      clearInterval(timer);
      abortRef.current?.abort();
    };
  }, [load, refreshMs]);

  return {
    ...state,
    refresh: () => load(false),
    reload: () => load(true),
  };
}
