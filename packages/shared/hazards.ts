import type { HazardType } from "./types.ts";

export interface HazardMeta {
  id: HazardType;
  label: string;
  /** Short label for compact chips. */
  short: string;
  /** Primary marker colour (hex). */
  color: string;
  /** Lighter halo / soft background. */
  soft: string;
  /** Glyph key rendered by the vector icon component. */
  icon: string;
  /** Emoji used for map markers, legend chips and compact badges. */
  emoji: string;
  /** Secondary colour used for marker gradients and glows. */
  glow: string;
  description: string;
}

export const HAZARDS: Record<HazardType, HazardMeta> = {
  wildfire: {
    id: "wildfire",
    label: "Wildfire",
    short: "Fire",
    color: "#F97316",
    soft: "#FEEBD9",
    icon: "flame",
    emoji: "🔥",
    glow: "#FBBF24",
    description:
      "Active fire detections and burnt-area reports from satellite and ground sources.",
  },
  flood: {
    id: "flood",
    label: "Flood",
    short: "Flood",
    color: "#0284C7",
    soft: "#DCEEFB",
    icon: "water",
    emoji: "🌊",
    glow: "#38BDF8",
    description:
      "Floods and flash floods reported by hydrological and disaster agencies.",
  },
  earthquake: {
    id: "earthquake",
    label: "Earthquake",
    short: "Quake",
    color: "#7C3AED",
    soft: "#EDE4FB",
    icon: "seismic",
    emoji: "🌋",
    glow: "#C4B5FD",
    description:
      "Seismic events with magnitude and depth from regional seismic networks.",
  },
  "severe-weather": {
    id: "severe-weather",
    label: "Severe weather",
    short: "Storm",
    color: "#0891B2",
    soft: "#DAF1F6",
    icon: "storm",
    emoji: "⛈️",
    glow: "#67E8F9",
    description:
      "Official severe-weather warnings: storms, blizzards, high winds and hail.",
  },
  cyclone: {
    id: "cyclone",
    label: "Cyclone",
    short: "Cyclone",
    color: "#1D4ED8",
    soft: "#DEE5FB",
    icon: "cyclone",
    emoji: "🌀",
    glow: "#93C5FD",
    description:
      "Tropical cyclones and hurricanes tracked by global warning centres.",
  },
  volcano: {
    id: "volcano",
    label: "Volcanic activity",
    short: "Volcano",
    color: "#B45309",
    soft: "#F6E7D6",
    icon: "volcano",
    emoji: "🌋",
    glow: "#FCD34D",
    description:
      "Volcanic eruptions, ash emissions and elevated activity from observatories.",
  },
  "extreme-heat": {
    id: "extreme-heat",
    label: "Extreme heat",
    short: "Heat",
    color: "#DC2626",
    soft: "#FADEDE",
    icon: "heat",
    emoji: "🌡️",
    glow: "#FCA5A5",
    description:
      "Official heat warnings and temperature extremes affecting populations.",
  },
  "air-quality": {
    id: "air-quality",
    label: "Air quality",
    short: "Air",
    color: "#7E22CE",
    soft: "#EBE1F6",
    icon: "haze",
    emoji: "😷",
    glow: "#C4B5FD",
    description:
      "Air-quality hazards: smoke, dust and hazardous particulate levels.",
  },
  drought: {
    id: "drought",
    label: "Drought",
    short: "Drought",
    color: "#A16207",
    soft: "#F1E6D1",
    icon: "drought",
    emoji: "🏜️",
    glow: "#FDE68A",
    description: "Drought conditions and water scarcity reported by agencies.",
  },
  landslide: {
    id: "landslide",
    label: "Landslide",
    short: "Slide",
    color: "#92400E",
    soft: "#F0E2D8",
    icon: "landslide",
    emoji: "⛰️",
    glow: "#FCD9A8",
    description: "Landslides and debris flows reported by disaster agencies.",
  },
  industrial: {
    id: "industrial",
    label: "Industrial incident",
    short: "Industrial",
    color: "#CA8A04",
    soft: "#F7EFD3",
    icon: "industrial",
    emoji: "☣️",
    glow: "#FDE047",
    description:
      "Industrial accidents, chemical releases and technological hazards.",
  },
  other: {
    id: "other",
    label: "Other hazard",
    short: "Other",
    color: "#64748B",
    soft: "#E7EBF0",
    icon: "other",
    emoji: "⚠️",
    glow: "#CBD5E1",
    description: "Other significant emergencies supported by reliable sources.",
  },
};

export const HAZARD_ORDER: HazardType[] = [
  "wildfire",
  "flood",
  "earthquake",
  "severe-weather",
  "cyclone",
  "volcano",
  "extreme-heat",
  "air-quality",
  "drought",
  "landslide",
  "industrial",
  "other",
];

export function hazardMeta(h: HazardType): HazardMeta {
  return HAZARDS[h] ?? HAZARDS.other;
}
