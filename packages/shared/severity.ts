import type { Confidence, ConfidenceLevel, Severity, SeverityLevel } from "./types.ts";

const SEVERITY_RANK: Record<SeverityLevel, number> = {
  minor: 0,
  moderate: 1,
  severe: 2,
  extreme: 3,
};

export function severityRank(level: SeverityLevel): number {
  return SEVERITY_RANK[level];
}

export function severityFromScore(score: number, basis: string): Severity {
  const clamped = Math.max(0, Math.min(1, score));
  let level: SeverityLevel = "minor";
  if (clamped >= 0.8) level = "extreme";
  else if (clamped >= 0.55) level = "severe";
  else if (clamped >= 0.3) level = "moderate";
  return { level, score: clamped, basis };
}

/** Colour ramp shared by map markers, badges and legends. */
export const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  minor: "#64748B",
  moderate: "#F59E0B",
  severe: "#F97316",
  extreme: "#DC2626",
};

export const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  minor: "Minor",
  moderate: "Moderate",
  severe: "Severe",
  extreme: "Extreme",
};

const CONFIDENCE_RANK: Record<ConfidenceLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

export function confidenceRank(level: ConfidenceLevel): number {
  return CONFIDENCE_RANK[level];
}

export function confidenceFromLevel(level: ConfidenceLevel, basis: string): Confidence {
  return { level, basis };
}

/** Maps a 0..1 confidence score to a qualitative level. */
export function confidenceFromScore(score: number, basis: string): Confidence {
  const clamped = Math.max(0, Math.min(1, score));
  const level: ConfidenceLevel = clamped >= 0.75 ? "high" : clamped >= 0.45 ? "medium" : "low";
  return { level, score: clamped, basis };
}

/**
 * "Urgent" combines severity and how recently the event was detected. Used by
 * the live panel's Urgent filter and the alert engine — never as an official
 * classification.
 */
export function isUrgent(
  severity: Severity,
  detectedAt: string,
  now: number = Date.now(),
  windowHours = 24,
): boolean {
  const ageHours = (now - new Date(detectedAt).getTime()) / 3_600_000;
  return severityRank(severity.level) >= 2 && ageHours <= windowHours;
}
