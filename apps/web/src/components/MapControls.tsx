"use client";

import {
  GlobeIcon,
  LayersIcon,
  MapIcon,
  MinusIcon,
  PlusIcon,
  LocateIcon,
} from "@/components/Icons";
import { cx } from "@/components/ui/Primitives";
import type { Dict } from "@/lib/i18n";

interface Props {
  dict: Dict;
  projection: "globe" | "mercator";
  onProjectionChange: (p: "globe" | "mercator") => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onLocate: () => void;
  layersOpen: boolean;
  onToggleLayers: () => void;
  locating: boolean;
}

/** Minimal, unobtrusive map controls — the map stays the hero. */
export default function MapControls({
  dict,
  projection,
  onProjectionChange,
  onZoomIn,
  onZoomOut,
  onReset,
  onLocate,
  layersOpen,
  onToggleLayers,
  locating,
}: Props) {
  const btn =
    "flex h-9 w-9 items-center justify-center text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink disabled:opacity-50";

  return (
    <div className="pointer-events-auto flex flex-col gap-1.5">
      <div className="flex flex-col overflow-hidden rounded-[var(--r-md)] border border-line bg-white/96 shadow-[var(--sh-2)] backdrop-blur-md">
        <button onClick={onZoomIn} className={btn} aria-label={dict.map.zoomIn} title={dict.map.zoomIn}>
          <PlusIcon size={16} />
        </button>
        <div className="h-px bg-line" />
        <button onClick={onZoomOut} className={btn} aria-label={dict.map.zoomOut} title={dict.map.zoomOut}>
          <MinusIcon size={16} />
        </button>
      </div>

      <button
        onClick={onLocate}
        disabled={locating}
        aria-label={dict.search.myLocation}
        title={dict.search.myLocation}
        className={cx(btn, "rounded-[var(--r-md)] border border-line bg-white/96 shadow-[var(--sh-2)] backdrop-blur-md")}
      >
        <LocateIcon size={16} className={locating ? "animate-spin" : undefined} />
      </button>

      <button
        onClick={onToggleLayers}
        aria-label={dict.layers.label}
        aria-expanded={layersOpen}
        title={dict.layers.label}
        className={cx(
          btn,
          "rounded-[var(--r-md)] border shadow-[var(--sh-2)] backdrop-blur-md",
          layersOpen ? "border-navy-3 bg-navy text-white hover:bg-navy-2" : "border-line bg-white/96",
        )}
      >
        <LayersIcon size={16} />
      </button>

      <button
        onClick={() => onProjectionChange(projection === "globe" ? "mercator" : "globe")}
        aria-label={projection === "globe" ? dict.map.flat : dict.map.globe}
        title={projection === "globe" ? dict.map.flat : dict.map.globe}
        className={cx(btn, "rounded-[var(--r-md)] border border-line bg-white/96 shadow-[var(--sh-2)] backdrop-blur-md")}
      >
        {projection === "globe" ? <MapIcon size={16} /> : <GlobeIcon size={16} />}
      </button>

      <button
        onClick={onReset}
        aria-label={dict.map.reset}
        title={dict.map.reset}
        className={cx(btn, "rounded-[var(--r-md)] border border-line bg-white/96 text-[10px] font-semibold shadow-[var(--sh-2)] backdrop-blur-md")}
      >
        1:1
      </button>
    </div>
  );
}
