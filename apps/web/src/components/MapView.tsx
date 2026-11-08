"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Map as MlMap,
  AttributionControl,
  GeoJSONSource,
  setWorkerUrl,
  type ErrorEvent as MlErrorEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { HAZARD_ORDER, hazardMeta, type HazardEvent, type HazardType } from "@risksense/shared";
import { ATTRIBUTION, STYLE_URL, fallbackStyle } from "@/lib/mapStyle";
import {
  REPORT_SPRITE_ID,
  drawReportMarker,
  hazardHeatRamp,
  registerHazardSprites,
} from "@/lib/mapIcons";
import type { CommunityReport } from "@/lib/reports";

// MapLibre v6 derives its worker URL from `import.meta.url`, which bundlers
// rewrite to a path where the worker does not exist, so the map fails with
// "Worker failed to load" and renders nothing. Point it at the copy served from
// `public/` (see scripts/copy-maplibre-worker.mjs).
if (typeof window !== "undefined") {
  setWorkerUrl("/maplibre-gl-worker.mjs");
}

export interface MapViewProps {
  events: HazardEvent[];
  /** Hazard families the user has enabled. */
  activeHazards: HazardType[];
  selectedId: string | null;
  onSelect: (event: HazardEvent) => void;
  /** Camera commands issued by the surrounding UI. */
  focus: { lat: number; lon: number; zoom?: number; nonce: number } | null;
  projection: "globe" | "mercator";
  /** The user's own position, if granted. */
  userLocation: { lat: number; lon: number } | null;
  onMoveEnd?: (center: { lat: number; lon: number; zoom: number }) => void;
  /** Unverified community reports, drawn separately from hazard events. */
  reports?: CommunityReport[];
  /** A point the user picked on the map to anchor a new report. */
  reportPoint?: { lat: number; lon: number; nonce: number } | null;
  /** Right-click (or long-press on touch) on the map. */
  onPickPoint?: (point: { lat: number; lon: number; x: number; y: number }) => void;
  /** Fired when a community-report pin is clicked. */
  onReportSelect?: (report: CommunityReport) => void;
  className?: string;
}

const REPORT_SOURCE_ID = "rs-reports";
const REPORT_LAYER_ID = "rs-report-points";
const PICKED_SOURCE_ID = "rs-picked";
const PICKED_LAYER_ID = "rs-picked-point";
/** Community reports use the emergency orange so they never read as a hazard colour. */
const REPORT_COLOR = "#F97316";

const SOURCE_ID = "rs-events";

/**
 * The primary RiskSense visualisation: a rotatable 3D globe (MapLibre GL's
 * globe projection) with a flat-map mode for detailed inspection.
 *
 * Markers are real events from real data sources — the map never fabricates a
 * location. Each hazard family has its own silhouette and colour, drawn as a
 * glowing sprite so a hazard reads at a glance without depending on the
 * reader's emoji font.
 */
export default function MapView({
  events,
  activeHazards,
  selectedId,
  onSelect,
  focus,
  projection,
  userLocation,
  onMoveEnd,
  reports,
  reportPoint,
  onPickPoint,
  onReportSelect,
  className,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Keep the latest callbacks/events without re-creating the map.
  const onSelectRef = useRef(onSelect);
  const eventsRef = useRef(events);
  const onMoveEndRef = useRef(onMoveEnd);
  const onPickPointRef = useRef(onPickPoint);
  const reportsRef = useRef<CommunityReport[]>(reports ?? []);
  const onReportSelectRef = useRef<(r: CommunityReport) => void>(() => {});
  onSelectRef.current = onSelect;
  eventsRef.current = events;
  onMoveEndRef.current = onMoveEnd;
  onPickPointRef.current = onPickPoint;
  reportsRef.current = reports ?? [];
  onReportSelectRef.current = onReportSelect ?? (() => {});

  const visible = useMemo(
    () => events.filter((e) => activeHazards.length === 0 || activeHazards.includes(e.hazard)),
    [events, activeHazards],
  );

  const geojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: visible.map((e) => ({
        type: "Feature" as const,
        id: e.id,
        geometry: { type: "Point" as const, coordinates: [e.lon, e.lat] },
        properties: {
          id: e.id,
          hazard: e.hazard,
          color: hazardMeta(e.hazard).color,
          glow: hazardMeta(e.hazard).glow,
          severity: e.severity.level,
          title: e.title,
          place: e.place ?? "",
          selected: e.id === selectedId ? 1 : 0,
          // Severity drives marker scale and halo strength, so an extreme event
          // is visibly heavier than a minor one without changing its meaning.
          scale:
            e.severity.level === "extreme" ? 1.3 : e.severity.level === "severe" ? 1.12 : 1,
          urgent: e.severity.level === "severe" || e.severity.level === "extreme" ? 1 : 0,
        },
      })),
    }),
    [visible, selectedId],
  );

  // ---- Map lifecycle ------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new MlMap({
      container: containerRef.current,
      style: STYLE_URL,
      center: [12, 22],
      zoom: 2.4,
      minZoom: 0.6,
      maxZoom: 16,
      attributionControl: false,
      dragRotate: true,
      pitchWithRotate: true,
    });
    mapRef.current = map;

    map.addControl(
      new AttributionControl({ compact: true, customAttribution: ATTRIBUTION }),
      "bottom-right",
    );

    // If the vector basemap cannot be reached, fall back to a plain raster
    // basemap so hazard data still renders instead of an empty canvas.
    map.on("error", (e: MlErrorEvent) => {
      const msg = String(e.error?.message ?? "");
      if (!ready && /style|sprite|glyphs|tile|load/i.test(msg)) {
        setFailed(true);
      }
    });

    map.on("load", () => {
      try {
        map.setProjection({ type: "globe" } as never);
      } catch {
        // Older runtimes without globe support still render a usable flat map.
      }
      installLayers(map, geojson as never);
      // The report pin sprite is registered after installLayers so the layer
      // definition above always has its image available.
      try {
        if (!map.hasImage(REPORT_SPRITE_ID)) {
          map.addImage(REPORT_SPRITE_ID, drawReportMarker(REPORT_COLOR), { pixelRatio: 2 });
        }
      } catch {
        // A missing sprite degrades the report layer only; hazard data is safe.
      }
      setReady(true);
      bindInteractions(map, eventsRef, onSelectRef, reportsRef, onReportSelectRef, onPickPointRef);

      map.on("moveend", () => {
        const c = map.getCenter();
        onMoveEndRef.current?.({ lat: c.lat, lon: c.lng, zoom: map.getZoom() });
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Data updates -------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(geojson as never);
  }, [geojson, ready]);

  const reportGeojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: (reports ?? []).map((r) => ({
        type: "Feature" as const,
        id: r.id,
        geometry: { type: "Point" as const, coordinates: [r.lon, r.lat] },
        properties: { id: r.id, category: r.category, status: r.status },
      })),
    }),
    [reports],
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource(REPORT_SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(reportGeojson as never);
  }, [reportGeojson, ready]);

  // ---- Picked point -------------------------------------------------------
  // A pin is dropped at the coordinate the user chose, before the form opens,
  // so the report is visibly anchored to a place rather than to a vague "here".
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (!reportPoint) {
      if (map.getLayer(PICKED_LAYER_ID)) map.removeLayer(PICKED_LAYER_ID);
      if (map.getSource(PICKED_SOURCE_ID)) map.removeSource(PICKED_SOURCE_ID);
      return;
    }
    const data = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [reportPoint.lon, reportPoint.lat] },
          properties: {},
        },
      ],
    };
    const src = map.getSource(PICKED_SOURCE_ID) as GeoJSONSource | undefined;
    if (src) {
      src.setData(data as never);
    } else {
      map.addSource(PICKED_SOURCE_ID, { type: "geojson", data: data as never });
    }
    if (!map.getLayer(PICKED_LAYER_ID)) {
      map.addLayer({
        id: PICKED_LAYER_ID,
        type: "circle",
        source: PICKED_SOURCE_ID,
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            2, 5, 8, 9, 14, 14,
          ],
          "circle-color": "rgba(249,115,22,0.18)",
          "circle-stroke-color": REPORT_COLOR,
          "circle-stroke-width": 2.2,
        },
      });
    }
  }, [reportPoint, ready]);

  // ---- Projection toggle --------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    try {
      map.setProjection({ type: projection } as never);
      if (projection === "globe") map.easeTo({ pitch: 0, duration: 500 });
    } catch {
      // Ignore: projection changes are cosmetic, data stays visible.
    }
  }, [projection, ready]);

  // ---- External focus -----------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !focus) return;
    map.flyTo({
      center: [focus.lon, focus.lat],
      zoom: focus.zoom ?? 6,
      duration: 1400,
      essential: true,
    });
  }, [focus, ready]);

  // ---- User location marker ----------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const id = "rs-user";
    if (map.getLayer(`${id}-dot`)) map.removeLayer(`${id}-dot`);
    if (map.getLayer(`${id}-ring`)) map.removeLayer(`${id}-ring`);
    if (map.getSource(id)) map.removeSource(id);
    if (!userLocation) return;

    map.addSource(id, {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: { type: "Point", coordinates: [userLocation.lon, userLocation.lat] },
        properties: {},
      } as never,
    });
    map.addLayer({
      id: `${id}-ring`,
      type: "circle",
      source: id,
      paint: {
        "circle-radius": 16,
        "circle-color": "#0284c7",
        "circle-opacity": 0.18,
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#0284c7",
      },
    });
    map.addLayer({
      id: `${id}-dot`,
      type: "circle",
      source: id,
      paint: {
        "circle-radius": 6,
        "circle-color": "#0284c7",
        "circle-stroke-width": 2.5,
        "circle-stroke-color": "#ffffff",
      },
    });
  }, [userLocation, ready]);

  const useFallback = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    setFailed(false);
    map.setStyle(fallbackStyle());
    map.once("styledata", () => {
      try {
        map.setProjection({ type: "globe" } as never);
      } catch {
        /* flat map is fine */
      }
      installLayers(map, geojson as never);
    });
  }, [geojson]);

  return (
    <div className={className}>
      <div ref={containerRef} className="h-full w-full" />
      {failed && (
        <div className="absolute inset-x-4 top-20 z-20 mx-auto max-w-md rounded-[var(--r-md)] border border-line bg-white/95 p-3 text-[12.5px] shadow-[var(--sh-2)]">
          <p className="font-medium text-ink">The detailed basemap could not be loaded.</p>
          <p className="mt-1 text-ink-2">
            Hazard data is still available. Switch to a lightweight basemap to continue.
          </p>
          <button
            onClick={useFallback}
            className="mt-2 rounded-[var(--r-sm)] bg-navy px-3 py-1.5 text-[12px] font-medium text-white hover:bg-navy-2"
          >
            Use lightweight basemap
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Adds the hazard source and its layers. Called on first load and again after a
 * basemap swap, so the two paths cannot drift apart.
 */
function installLayers(map: MlMap, data: never) {
  registerHazardSprites(map);

  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, {
      type: "geojson",
      data,
    });
  }

  // Glow field: one heatmap per hazard family, so a cluster of fire lights the
  // region amber, a flood blue, a seismic swarm violet — the "burning Earth"
  // language of a night-time satellite view, generalised per hazard. Weighted
  // by severity so a dense field of minor detections never reads like one
  // major event, and it fades out as markers take over on zoom-in.
  HAZARD_ORDER.forEach((hazard) => {
    const meta = hazardMeta(hazard);
    map.addLayer({
      id: `rs-heat-${hazard}`,
      type: "heatmap",
      source: SOURCE_ID,
      filter: ["==", ["get", "hazard"], hazard],
      maxzoom: 7,
      paint: {
        "heatmap-weight": [
          "match", ["get", "severity"],
          "extreme", 1, "severe", 0.7, "moderate", 0.4, "minor", 0.2, 0.25,
        ],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 1, 12, 4, 20, 7, 34],
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 1, 0.85, 7, 1.5],
        "heatmap-color": hazardHeatRamp(meta.color, meta.glow),
        "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0.75, 7, 0],
      },
    } as never);
  });

  // Hazard markers. The sprite is chosen by hazard and severity, so this layer
  // definition stays independent of which families are enabled.
  map.addLayer({
    id: "rs-points",
    type: "symbol",
    source: SOURCE_ID,
    layout: {
      "icon-image": [
        "case",
        ["==", ["get", "selected"], 1],
        ["concat", "rs-marker-selected-", ["get", "hazard"]],
        ["==", ["get", "urgent"], 1],
        ["concat", "rs-marker-urgent-", ["get", "hazard"]],
        ["concat", "rs-marker-", ["get", "hazard"]],
      ],
      "icon-size": [
        "interpolate", ["linear"], ["zoom"],
        1, ["*", 0.34, ["get", "scale"]],
        4, ["*", 0.5, ["get", "scale"]],
        7, ["*", 0.7, ["get", "scale"]],
        10, ["*", 0.9, ["get", "scale"]],
        14, ["*", 1.15, ["get", "scale"]],
      ],
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
  });

  // Labels for the strongest events only, so the map stays readable.
  map.addLayer({
    id: "rs-labels",
    type: "symbol",
    source: SOURCE_ID,
    filter: ["==", ["get", "severity"], "extreme"],
    minzoom: 4,
    layout: {
      "text-field": ["get", "title"],
      "text-font": ["Noto Sans Regular"],
      "text-size": 11,
      "text-offset": [0, 1.3],
      "text-anchor": "top",
      "text-allow-overlap": false,
      "text-optional": true,
    },
    paint: {
      "text-color": "#102a43",
      "text-halo-color": "rgba(255,255,255,0.95)",
      "text-halo-width": 1.4,
    },
  });

  // Community reports live in their own source and layer. They are kept apart
  // from hazard events on purpose: a citizen submission is not a detection, so
  // it gets its own shape, its own legend entry and its own "unverified" label
  // rather than being blended into the official record.
  if (!map.getSource(REPORT_SOURCE_ID)) {
    map.addSource(REPORT_SOURCE_ID, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }
  if (!map.getLayer(REPORT_LAYER_ID)) {
    map.addLayer({
      id: REPORT_LAYER_ID,
      type: "symbol",
      source: REPORT_SOURCE_ID,
      layout: {
        "icon-image": REPORT_SPRITE_ID,
        "icon-size": [
          "interpolate", ["linear"], ["zoom"],
          2, 0.34, 6, 0.52, 10, 0.74,
        ],
        "icon-allow-overlap": true,
        "icon-anchor": "bottom",
      },
      paint: { "icon-opacity": 0.95 },
    });
  }
}

function bindInteractions(
  map: MlMap,
  eventsRef: { current: HazardEvent[] },
  onSelectRef: { current: (e: HazardEvent) => void },
  reportsRef: { current: CommunityReport[] },
  onReportSelectRef: { current: (r: CommunityReport) => void },
  onPickPointRef: { current: MapViewProps["onPickPoint"] },
) {
  // Clicking a marker selects the event.
  map.on("click", "rs-points", (e) => {
    const feature = e.features?.[0];
    if (!feature) return;
    const id = feature.properties?.id as string;
    const event = eventsRef.current.find((x) => x.id === id);
    if (event) onSelectRef.current(event);
  });

  map.on("click", REPORT_LAYER_ID, (e) => {
    const feature = e.features?.[0];
    if (!feature) return;
    const id = feature.properties?.id as string;
    const report = reportsRef.current.find((x) => x.id === id);
    if (report) onReportSelectRef.current(report);
  });

  for (const layer of ["rs-points", REPORT_LAYER_ID]) {
    map.on("mouseenter", layer, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", layer, () => {
      map.getCanvas().style.cursor = "";
    });
  }

  // Right-click anywhere on the map offers "report here", anchored to the exact
  // point the user pointed at — the same idea as FireSight's contribute action,
  // but tied to a coordinate the user chose rather than the map centre.
  map.on("contextmenu", (e) => {
    e.preventDefault();
    const p = e.point;
    const ll = e.lngLat;
    onPickPointRef.current?.({ lat: ll.lat, lon: ll.lng, x: p.x, y: p.y });
  });

  // Touch equivalent: a 550 ms press is a long-press, not a pan.
  let pressTimer: ReturnType<typeof setTimeout> | null = null;
  let pressed: { x: number; y: number } | null = null;
  const cancelPress = () => {
    if (pressTimer) clearTimeout(pressTimer);
    pressTimer = null;
    pressed = null;
  };
  map.on("touchstart", (e) => {
    if (e.points.length !== 1) return cancelPress();
    const p = e.point;
    pressed = { x: p.x, y: p.y };
    pressTimer = setTimeout(() => {
      if (!pressed) return;
      const ll = map.unproject([pressed.x, pressed.y]);
      onPickPointRef.current?.({ lat: ll.lat, lon: ll.lng, x: pressed.x, y: pressed.y });
      cancelPress();
    }, 550);
  });
  map.on("touchmove", cancelPress);
  map.on("touchend", cancelPress);
  map.on("touchcancel", cancelPress);
  map.on("movestart", cancelPress);
}
