/**
 * RiskSense normalized hazard event model.
 *
 * Every data-source adapter converts its native payload into one or more
 * `HazardEvent` objects. Downstream code (API routes, map layers, alert engine,
 * statistics) only ever consumes this normalized shape, so adding a new source
 * never requires touching unrelated features.
 */

/** Canonical hazard families surfaced by RiskSense. */
export type HazardType =
  | "wildfire"
  | "flood"
  | "earthquake"
  | "severe-weather"
  | "cyclone"
  | "volcano"
  | "extreme-heat"
  | "air-quality"
  | "drought"
  | "landslide"
  | "industrial"
  | "other";

/** Lifecycle state of an event. AI may not promote an event past `detected`. */
export type EventStatus =
  | "detected"
  | "under-review"
  | "confirmed"
  | "warning"
  | "resolved";

/** Qualitative confidence, always accompanied by the reason it was assigned. */
export type ConfidenceLevel = "low" | "medium" | "high";

export interface Confidence {
  level: ConfidenceLevel;
  /** 0..1 numeric score when the source exposes one. */
  score?: number;
  /** Human-readable justification, e.g. "VIIRS high-confidence pixel". */
  basis: string;
}

export type SeverityLevel = "minor" | "moderate" | "severe" | "extreme";

export interface Severity {
  level: SeverityLevel;
  /** Normalized 0..1 intensity used for sorting and colour ramps. */
  score: number;
  /** Which raw quantity produced the level, e.g. "magnitude 6.2". */
  basis: string;
}

/**
 * A geo shape carried alongside the point location. Adapters supply this only
 * when the source publishes real geometry (e.g. GDACS bbox, NWS alert polygon).
 */
export type EventGeometry =
  | { type: "Point"; coordinates: [number, number] }
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] }
  | { type: "bbox"; bbox: [number, number, number, number] };

/** Stable identifier for a data provider, used for attribution and filtering. */
export interface SourceRef {
  /** Machine id, e.g. "usgs-earthquakes". */
  id: string;
  /** Display name, e.g. "USGS Earthquake Hazards Program". */
  name: string;
  /** Canonical landing page for attribution. */
  url: string;
  /** Link to the specific record when the source exposes one. */
  recordUrl?: string;
  /** License / terms note shown in the data-source directory. */
  license?: string;
}

export interface HazardEvent {
  /** Stable, deterministic id: `${source.id}:${nativeId}`. */
  id: string;
  hazard: HazardType;
  title: string;
  description?: string;
  lat: number;
  lon: number;
  /** Human-readable place name resolved from the source when available. */
  place?: string;
  /** ISO-3166-1 alpha-2 country code when confidently known. */
  countryCode?: string;
  /** When the hazard was observed / occurred (ISO 8601, UTC). */
  detectedAt: string;
  /** When the source last revised the record (ISO 8601, UTC). */
  updatedAt?: string;
  /** When RiskSense ingested the record (ISO 8601, UTC). */
  ingestedAt: string;
  source: SourceRef;
  severity: Severity;
  confidence: Confidence;
  status: EventStatus;
  geometry?: EventGeometry;
  /** Magnitude / measurement with its unit, when the source provides one. */
  measurement?: { label: string; value: number; unit: string };
  /** Depth in km for seismic events. */
  depthKm?: number;
  /** True when the event is a remote-sensing detection rather than a report. */
  isDetection: boolean;
  /** Issuing authority for official warnings (NWS, GDACS, met services). */
  issuingAuthority?: string;
  /** Official guidance text, verbatim from the authority. Never AI-authored. */
  officialGuidance?: string;
  /** Raw, source-specific extras preserved for transparency. */
  raw?: Record<string, unknown>;
}

/** Health report for one upstream data source, powering freshness indicators. */
export interface SourceStatus {
  id: string;
  name: string;
  url: string;
  license: string;
  /** Hazard families this source contributes. */
  hazards: readonly HazardType[];
  /** Typical update cadence in minutes, from the publisher's documentation. */
  expectedRefreshMinutes: number;
  state: "ok" | "degraded" | "unavailable" | "not-configured";
  /** ISO timestamp of the most recent successful fetch. */
  lastSuccessAt?: string;
  /** Number of events returned on the most recent successful fetch. */
  eventCount?: number;
  /** Populated when state !== "ok". */
  message?: string;
  /** True when the source requires an API key that is not present. */
  requiresKey?: boolean;
}

/** Envelope returned by the public events API. */
export interface EventsResponse {
  generatedAt: string;
  /** Window requested by the caller, in hours. */
  windowHours: number;
  total: number;
  events: HazardEvent[];
  sources: SourceStatus[];
  /** Non-fatal issues, e.g. "gdacs: upstream timeout". */
  warnings: string[];
}
