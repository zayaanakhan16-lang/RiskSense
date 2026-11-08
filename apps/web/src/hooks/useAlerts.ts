"use client";

import { useCallback, useMemo, useState } from "react";
import { HAZARD_ORDER, type HazardEvent, type HazardType, type SeverityLevel } from "@risksense/shared";
import {
  matchAlerts,
  type AlertArea,
  type AlertMatch,
  type AlertRule,
} from "@risksense/hazard-engine";
import { useLocalStorage } from "./useLocalStorage";

export interface StoredAlertState {
  areas: AlertArea[];
  hazards: HazardType[];
  minSeverity: SeverityLevel;
  enabled: boolean;
  notify: boolean;
}

const DEFAULT_STATE: StoredAlertState = {
  areas: [],
  hazards: [],
  minSeverity: "moderate",
  enabled: true,
  notify: false,
};

/**
 * Personal risk alerts.
 *
 * Areas and preferences live only in this browser. Matching runs against the
 * real events that were just fetched — nothing is synthesised, and "no match"
 * is never presented as "you are safe".
 */
export function useAlerts(events: HazardEvent[]) {
  const [state, setState] = useLocalStorage<StoredAlertState>("risksense.alerts.v1", DEFAULT_STATE);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() =>
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported",
  );

  const rule: AlertRule = useMemo(
    () => ({
      areas: state.areas,
      hazards: state.hazards,
      minSeverity: state.minSeverity,
      enabled: state.enabled,
    }),
    [state],
  );

  const matches: AlertMatch[] = useMemo(
    () => matchAlerts(events, [rule]),
    [events, rule],
  );

  const addArea = useCallback(
    (area: Omit<AlertArea, "id">) => {
      setState((s) => ({
        ...s,
        areas: [...s.areas, { ...area, id: crypto.randomUUID() }],
      }));
    },
    [setState],
  );

  const removeArea = useCallback(
    (id: string) => setState((s) => ({ ...s, areas: s.areas.filter((a) => a.id !== id) })),
    [setState],
  );

  const toggleHazard = useCallback(
    (h: HazardType) =>
      setState((s) => ({
        ...s,
        hazards: s.hazards.includes(h)
          ? s.hazards.filter((x) => x !== h)
          : [...s.hazards, h],
      })),
    [setState],
  );

  const setAllHazards = useCallback(
    (on: boolean) => setState((s) => ({ ...s, hazards: on ? [...HAZARD_ORDER] : [] })),
    [setState],
  );

  const setMinSeverity = useCallback(
    (level: SeverityLevel) => setState((s) => ({ ...s, minSeverity: level })),
    [setState],
  );

  const setEnabled = useCallback(
    (enabled: boolean) => setState((s) => ({ ...s, enabled })),
    [setState],
  );

  /**
   * Requests notification permission. Notifications are strictly opt-in: the
   * browser prompt is only triggered by this explicit user action.
   */
  const requestNotifications = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return "unsupported" as const;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") setState((s) => ({ ...s, notify: true }));
    return result;
  }, [setState]);

  const disableNotifications = useCallback(
    () => setState((s) => ({ ...s, notify: false })),
    [setState],
  );

  return {
    state,
    permission,
    matches,
    addArea,
    removeArea,
    toggleHazard,
    setAllHazards,
    setMinSeverity,
    setEnabled,
    requestNotifications,
    disableNotifications,
  };
}

/**
 * Fires one browser notification per new matching event. Only called after the
 * user has explicitly opted in; nothing is sent on the user's behalf otherwise.
 */
export function notifyMatches(matches: AlertMatch[], seen: Set<string>): AlertMatch[] {
  if (typeof window === "undefined" || !("Notification" in window)) return [];
  if (Notification.permission !== "granted") return [];

  const fresh: AlertMatch[] = [];
  for (const match of matches) {
    if (seen.has(match.event.id)) continue;
    seen.add(match.event.id);
    fresh.push(match);
    new Notification(`${match.event.severity.level.toUpperCase()} ${match.event.hazard.replace("-", " ")}`, {
      body: match.reason,
      tag: match.event.id,
    });
  }
  return fresh;
}
