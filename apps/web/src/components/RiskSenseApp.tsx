"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  HAZARD_ORDER,
  hazardMeta,
  type HazardEvent,
  type HazardType,
} from "@risksense/shared";
import dynamic from "next/dynamic";
import TopBar from "@/components/TopBar";
import SearchBar, { type GeoPlace } from "@/components/SearchBar";
import MapControls from "@/components/MapControls";
import LayerControl from "@/components/LayerControl";
import SourceStatusBar from "@/components/SourceStatusBar";
import EventFeed, { DEFAULT_FEED_FILTERS, type FeedFilters } from "@/components/panels/EventFeed";
import EventDetails from "@/components/panels/EventDetails";
import ReportDetails from "@/components/panels/ReportDetails";
import AlertsPanel from "@/components/panels/AlertsPanel";
import EmergencyModal from "@/components/panels/EmergencyModal";
import ReportModal from "@/components/panels/ReportModal";
import ReportContextMenu from "@/components/ReportContextMenu";
import type { CommunityReport } from "@/lib/reports";
import SourcesModal from "@/components/panels/SourcesModal";
import SiteFooter from "@/components/SiteFooter";
import { AlertIcon, BellIcon, ChevronDownIcon } from "@/components/Icons";
import { cx } from "@/components/ui/Primitives";
import { legendSwatch } from "@/lib/mapIcons";
import { useEvents } from "@/hooks/useEvents";
import { useAlerts, notifyMatches } from "@/hooks/useAlerts";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { dictFor, type Locale } from "@/lib/i18n";

// MapLibre touches `window` at import time, so the map is client-only.
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#eae7e0]">
      <span className="text-[12.5px] text-ink-2">Loading the map…</span>
    </div>
  ),
});

const WINDOWS = [6, 24, 72, 168] as const;
type WindowHours = (typeof WINDOWS)[number];

export default function RiskSenseApp() {
  const [locale, setLocale] = useLocalStorage<Locale>("risksense.locale", "en");
  const dict = useMemo(() => dictFor(locale), [locale]);

  const [windowHours, setWindowHours] = useLocalStorage<WindowHours>("risksense.window", 24);
  const [activeHazards, setActiveHazards] = useLocalStorage<HazardType[]>(
    "risksense.layers",
    [],
  );
  const [projection, setProjection] = useLocalStorage<"globe" | "mercator">(
    "risksense.projection",
    "globe",
  );

  const { data, loading, error, reload } = useEvents(windowHours);
  const alerts = useAlerts(data?.events ?? []);

  const [feedFilters, setFeedFilters] = useState<FeedFilters>(DEFAULT_FEED_FILTERS);
  const [selected, setSelected] = useState<HazardEvent | null>(null);
  const [focus, setFocus] = useState<{ lat: number; lon: number; zoom?: number; nonce: number } | null>(
    null,
  );
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lon: number } | null>(null);

  const [layersOpen, setLayersOpen] = useState(false);
  const [feedCollapsed, setFeedCollapsed] = useState<boolean>(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  /** The coordinate the user pointed at, which anchors a new report. */
  const [reportPoint, setReportPoint] = useState<{
    lat: number;
    lon: number;
    nonce: number;
  } | null>(null);
  /** The coordinate the user pointed at when asking for emergency assistance. */
  const [emergencyPoint, setEmergencyPoint] = useState<{
    lat: number;
    lon: number;
    nonce: number;
  } | null>(null);
  /** Screen position of the "report here" menu, in map-container coordinates. */
  const [pickMenu, setPickMenu] = useState<{
    lat: number;
    lon: number;
    x: number;
    y: number;
  } | null>(null);
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<CommunityReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/reports?limit=200");
        if (!res.ok) return;
        const json = (await res.json()) as { reports?: CommunityReport[] };
        if (!cancelled) setReports(json.reports ?? []);
      } catch {
        // Reports are a supplementary layer; hazard data must not depend on them.
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [mobileFeedOpen, setMobileFeedOpen] = useState(false);

  const notifiedRef = useRef<Set<string>>(new Set());
  const mapApiRef = useRef<{ zoomIn: () => void; zoomOut: () => void; reset: () => void } | null>(
    null,
  );

  // ---- Geolocation --------------------------------------------------------
  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError(dict.search.unavailable);
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserLocation(loc);
        setMapCenter(loc);
        setFocus({ ...loc, zoom: 8, nonce: Date.now() });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setLocationError(
          err.code === err.PERMISSION_DENIED ? dict.search.denied : dict.search.unavailable,
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }, [dict.search.denied, dict.search.unavailable]);

  // ---- Browser notifications (opt-in only) -------------------------------
  useEffect(() => {
    if (!alerts.state.notify || alerts.permission !== "granted") return;
    notifyMatches(alerts.matches, notifiedRef.current);
  }, [alerts.matches, alerts.state.notify, alerts.permission]);

  const focusEvent = useCallback((event: HazardEvent) => {
    setSelectedReport(null);
    setSelected(event);
    setFocus({ lat: event.lat, lon: event.lon, zoom: 7, nonce: Date.now() });
  }, []);

  const selectedId = selected?.id ?? null;
  // Read outside the render branch: inside it, `selectedReport` is already
  // narrowed to null, so the id would type as `never`.
  const reportId = selectedReport?.id ?? null;

  const pickPlace = useCallback((place: GeoPlace) => {
    setFocus({ lat: place.lat, lon: place.lon, zoom: 8, nonce: Date.now() });
    setMapCenter({ lat: place.lat, lon: place.lon });
  }, []);

  const hazardCounts = useMemo(() => {
    const counts: Partial<Record<HazardType, number>> = {};
    for (const e of data?.events ?? []) counts[e.hazard] = (counts[e.hazard] ?? 0) + 1;
    return counts;
  }, [data]);

  const visibleEvents = useMemo(
    () =>
      (data?.events ?? []).filter(
        (e) => activeHazards.length === 0 || activeHazards.includes(e.hazard),
      ),
    [data, activeHazards],
  );

  const windowLabel: Record<WindowHours, string> = {
    6: dict.time.h6,
    24: dict.time.h24,
    72: dict.time.h72,
    168: dict.time.d7,
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-paper">
      <TopBar
        dict={dict}
        locale={locale}
        onLocaleChange={setLocale}
        onEmergency={() => setEmergencyOpen(true)}
        onAlerts={() => setAlertsOpen(true)}
        onReport={() => setReportOpen(true)}
        alertMatchCount={alerts.matches.length}
      />

      <main className="relative flex min-h-0 flex-1">
        {/* Map layer */}
        <div className="absolute inset-0">
          <MapView
            className="h-full w-full"
            events={visibleEvents}
            activeHazards={activeHazards}
            selectedId={selectedId}
            onSelect={focusEvent}
            focus={focus}
            projection={projection}
            userLocation={userLocation}
            onMoveEnd={(c) => setMapCenter({ lat: c.lat, lon: c.lon })}
            reports={reports}
            reportPoint={reportPoint}
            onPickPoint={(p) => setPickMenu(p)}
            onReportSelect={(r) => {
              setSelected(null);
              setSelectedReport(r);
              setFocus({ lat: r.lat, lon: r.lon, zoom: 11, nonce: Date.now() });
            }}
          />
        </div>

        {/* Floating controls — desktop */}
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col p-3 sm:p-4">
          {pickMenu && (
            <ReportContextMenu
              at={pickMenu}
              dict={dict}
              onReportHere={() => {
                setSelected(null);
                setSelectedReport(null);
                setReportPoint({
                  lat: pickMenu.lat,
                  lon: pickMenu.lon,
                  nonce: Date.now(),
                });
                setPickMenu(null);
                setReportOpen(true);
              }}
              onEmergencyHere={() => {
                setSelected(null);
                setSelectedReport(null);
                setEmergencyPoint({
                  lat: pickMenu.lat,
                  lon: pickMenu.lon,
                  nonce: Date.now(),
                });
                setPickMenu(null);
                setEmergencyOpen(true);
              }}
              onAlertArea={() => {
                alerts.addArea({
                  label: `${pickMenu.lat.toFixed(2)}, ${pickMenu.lon.toFixed(2)}`,
                  lat: pickMenu.lat,
                  lon: pickMenu.lon,
                  radiusKm: 100,
                });
                setPickMenu(null);
                setAlertsOpen(true);
              }}
              onDismiss={() => setPickMenu(null)}
            />
          )}

          <div className="flex items-start gap-3">
            <div className="pointer-events-auto w-full max-w-md">
              <SearchBar
                onPick={pickPlace}
                onMyLocation={locate}
                locating={locating}
                locationError={locationError}
                dict={dict}
              />

              {/* Time window pills */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="pointer-events-auto rounded-[var(--r-pill)] border border-line bg-white/95 px-2 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-ink-3 shadow-[var(--sh-1)] backdrop-blur-md">
                  {dict.time.label}
                </span>
                {WINDOWS.map((w) => (
                  <button
                    key={w}
                    onClick={() => setWindowHours(w)}
                    className={cx(
                      "pointer-events-auto h-7 rounded-[var(--r-pill)] border px-3 text-[11.5px] font-medium shadow-[var(--sh-1)] backdrop-blur-md transition-colors",
                      windowHours === w
                        ? "border-transparent bg-navy text-white"
                        : "border-line bg-white/95 text-ink-2 hover:text-ink",
                    )}
                  >
                    {windowLabel[w]}
                  </button>
                ))}
              </div>
            </div>

            <div className="ml-auto hidden flex-col items-end gap-2 md:flex">
              <SourceStatusBar data={data} loading={loading} dict={dict} onOpenSources={() => setSourcesOpen(true)} />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setReportOpen(true)}
                  className="pointer-events-auto inline-flex h-9 items-center gap-1.5 rounded-[var(--r-md)] bg-navy px-3 text-[12.5px] font-medium text-white shadow-[var(--sh-2)] transition-colors hover:bg-navy-2"
                >
                  <AlertIcon size={14} />
                  {dict.map.report}
                </button>
                <button
                  onClick={() => {
                    if (mapCenter) {
                      alerts.addArea({
                        label: `${mapCenter.lat.toFixed(2)}, ${mapCenter.lon.toFixed(2)}`,
                        lat: mapCenter.lat,
                        lon: mapCenter.lon,
                        radiusKm: 100,
                      });
                    }
                    setAlertsOpen(true);
                  }}
                  className="pointer-events-auto inline-flex h-9 items-center gap-1.5 rounded-[var(--r-md)] border border-line bg-white/95 px-3 text-[12.5px] font-medium text-ink shadow-[var(--sh-2)] backdrop-blur-md transition-colors hover:bg-paper-2"
                >
                  <BellIcon size={14} />
                  {dict.map.areaAlert}
                </button>
              </div>
            </div>
          </div>

          {/* Right-hand map controls */}
          <div className="absolute right-3 top-1/2 hidden -translate-y-1/2 sm:block sm:right-4">
            <MapControls
              dict={dict}
              projection={projection}
              onProjectionChange={setProjection}
              onZoomIn={() => mapApiRef.current?.zoomIn()}
              onZoomOut={() => mapApiRef.current?.zoomOut()}
              onReset={() => setFocus({ lat: 12, lon: 26, zoom: 1.7, nonce: Date.now() })}
              onLocate={locate}
              layersOpen={layersOpen}
              onToggleLayers={() => setLayersOpen((v) => !v)}
              locating={locating}
            />
          </div>

          {layersOpen && (
            <div className="absolute right-3 top-[72px] sm:right-16">
              <LayerControl
                dict={dict}
                active={activeHazards}
                counts={hazardCounts}
                onChange={setActiveHazards}
                onClose={() => setLayersOpen(false)}
              />
            </div>
          )}

          {/* Prominent bottom-centre report action, as in the FireSight layout.
              Anchors to the current map centre so it works without a right-click. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-4 hidden justify-center md:flex">
            <button
              onClick={() => {
                setSelected(null);
                setSelectedReport(null);
                if (mapCenter) {
                  setReportPoint({ lat: mapCenter.lat, lon: mapCenter.lon, nonce: Date.now() });
                }
                setReportOpen(true);
              }}
              className="pointer-events-auto inline-flex h-10 items-center gap-2 rounded-[var(--r-pill)] bg-emergency px-4 text-[13px] font-semibold text-white shadow-[var(--sh-3)] transition-colors hover:bg-emergency-strong"
            >
              <AlertIcon size={15} />
              {dict.map.reportThisArea}
            </button>
          </div>
        </div>

        {/* Live feed — desktop */}
        <aside className="pointer-events-none absolute bottom-3 right-3 top-3 z-20 hidden w-[352px] flex-col md:flex sm:bottom-4 sm:right-4 sm:top-4">
          <div className="pointer-events-auto flex h-full flex-col gap-2">
            {selected ? (
              <div className="min-h-0 flex-1 overflow-hidden">
                <EventDetails
                  event={selected}
                  onClose={() => setSelected(null)}
                  onFocus={() => setFocus({ lat: selected.lat, lon: selected.lon, zoom: 7, nonce: Date.now() })}
                  onCreateAlert={() => {
                    alerts.addArea({
                      label: selected.place ?? selected.title,
                      lat: selected.lat,
                      lon: selected.lon,
                      radiusKm: 100,
                    });
                    setAlertsOpen(true);
                  }}
                  dict={dict}
                />
              </div>
            ) : selectedReport ? (
              <div className="min-h-0 flex-1 overflow-hidden">
                <ReportDetails
                  report={selectedReport}
                  onClose={() => setSelectedReport(null)}
                  onFocus={() =>
                    setFocus({
                      lat: selectedReport.lat,
                      lon: selectedReport.lon,
                      zoom: 12,
                      nonce: Date.now(),
                    })
                  }
                  dict={dict}
                />
              </div>
            ) : (
              <div className={cx("min-h-0", feedCollapsed ? "flex-none" : "flex-1")}>
                <EventFeed
                  data={data}
                  loading={loading}
                  error={error}
                  filters={feedFilters}
                  onFiltersChange={setFeedFilters}
                  selectedId={selectedId}
                  onSelect={focusEvent}
                  onRetry={reload}
                  collapsed={feedCollapsed}
                  onToggleCollapsed={() => setFeedCollapsed((v) => !v)}
                  dict={dict}
                  reports={reports}
                  selectedReportId={reportId}
                  onSelectReport={(r) => {
                    setSelected(null);
                    setSelectedReport(r);
                    setFocus({ lat: r.lat, lon: r.lon, zoom: 12, nonce: Date.now() });
                  }}
                />
              </div>
            )}

            {alertsOpen && (
              <div className="min-h-0 flex-1 overflow-hidden">
                <AlertsPanel
                  dict={dict}
                  alerts={alerts}
                  onClose={() => setAlertsOpen(false)}
                  mapCenter={mapCenter}
                  onFocusEvent={(lat, lon) => setFocus({ lat, lon, zoom: 7, nonce: Date.now() })}
                />
              </div>
            )}
          </div>
        </aside>

        {/* Mobile: bottom sheet feed */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 md:hidden">
          {mobileFeedOpen && (
            <div className="pointer-events-auto mx-2 mb-2 h-[58vh] overflow-hidden">
              {selected ? (
                <EventDetails
                  event={selected}
                  onClose={() => setSelected(null)}
                  onFocus={() => setFocus({ lat: selected.lat, lon: selected.lon, zoom: 7, nonce: Date.now() })}
                  onCreateAlert={() => {
                    alerts.addArea({
                      label: selected.place ?? selected.title,
                      lat: selected.lat,
                      lon: selected.lon,
                      radiusKm: 100,
                    });
                    setAlertsOpen(true);
                  }}
                  dict={dict}
                />
              ) : selectedReport ? (
                <ReportDetails
                  report={selectedReport}
                  onClose={() => setSelectedReport(null)}
                  onFocus={() =>
                    setFocus({
                      lat: selectedReport.lat,
                      lon: selectedReport.lon,
                      zoom: 12,
                      nonce: Date.now(),
                    })
                  }
                  dict={dict}
                />
              ) : alertsOpen ? (
                <AlertsPanel
                  dict={dict}
                  alerts={alerts}
                  onClose={() => setAlertsOpen(false)}
                  mapCenter={mapCenter}
                  onFocusEvent={(lat, lon) => setFocus({ lat, lon, zoom: 7, nonce: Date.now() })}
                />
              ) : (
                <EventFeed
                  data={data}
                  loading={loading}
                  error={error}
                  filters={feedFilters}
                  onFiltersChange={setFeedFilters}
                  selectedId={selectedId}
                  onSelect={focusEvent}
                  onRetry={reload}
                  collapsed={false}
                  onToggleCollapsed={() => setMobileFeedOpen(false)}
                  dict={dict}
                />
              )}
            </div>
          )}
          <div className="pointer-events-auto flex items-center gap-2 px-2 pb-2">
            <button
              onClick={() => {
                setMobileFeedOpen((v) => !v);
                if (!mobileFeedOpen) setAlertsOpen(false);
              }}
              className="flex h-10 flex-1 items-center justify-between gap-2 rounded-[var(--r-md)] border border-line bg-white/97 px-3 text-[12.5px] font-medium text-ink shadow-[var(--sh-3)] backdrop-blur-md"
            >
              <span className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="rs-live-dot absolute inline-flex h-2 w-2 rounded-full bg-alert" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-alert" />
                </span>
                {dict.feed.title}
                <span className="rs-tabular rounded-full bg-paper-2 px-1.5 text-[11px] text-ink-2">
                  {visibleEvents.length}
                </span>
              </span>
              <ChevronDownIcon
                size={16}
                className={cx("transition-transform", mobileFeedOpen && "rotate-180")}
              />
            </button>
            <button
              onClick={() => setReportOpen(true)}
              aria-label={dict.map.report}
              className="flex h-10 w-10 items-center justify-center rounded-[var(--r-md)] bg-navy text-white shadow-[var(--sh-3)]"
            >
              <AlertIcon size={16} />
            </button>
            <button
              onClick={() => {
                setAlertsOpen(true);
                setMobileFeedOpen(true);
                setSelected(null);
              }}
              aria-label={dict.nav.alerts}
              className="relative flex h-10 w-10 items-center justify-center rounded-[var(--r-md)] border border-line bg-white/97 text-ink shadow-[var(--sh-3)] backdrop-blur-md"
            >
              <BellIcon size={16} />
              {alerts.matches.length > 0 && (
                <span className="absolute -right-1 -top-1 rounded-full bg-emergency px-1.5 text-[10px] font-semibold text-white">
                  {alerts.matches.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* Legend strip — desktop only, keeps the map readable */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-10 hidden xl:block">
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-[var(--r-pill)] border border-line bg-white/95 px-3 py-1.5 shadow-[var(--sh-2)] backdrop-blur-md">
          <span className="rs-overline text-ink-3">{dict.map.legend}</span>
          {HAZARD_ORDER.filter((h) => (hazardCounts[h] ?? 0) > 0)
            .slice(0, 9)
            .map((h) => (
              <span key={h} className="inline-flex items-center gap-1 text-[10.5px] text-ink-2">
                <span
                  className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] leading-none"
                  style={{
                    background: legendSwatch(hazardMeta(h).color, hazardMeta(h).glow),
                  }}
                  aria-hidden
                >
                  {hazardMeta(h).emoji}
                </span>
                {hazardMeta(h).short}
              </span>
            ))}
          {reports.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[10.5px] text-ink-2">
              <span
                className="flex h-4 w-4 items-center justify-center rounded-full border border-dashed border-emergency text-[9px] leading-none"
                aria-hidden
              >
                📍
              </span>
              {dict.feed.communityReports} ({reports.length})
            </span>
          )}
        </div>
      </div>

      <SiteFooter dict={dict} compact />

      <EmergencyModal
        open={emergencyOpen}
        onClose={() => {
          setEmergencyOpen(false);
          setEmergencyPoint(null);
        }}
        dict={dict}
        userLocation={userLocation}
        onRequestLocation={locate}
        locating={locating}
        events={visibleEvents}
        initialPoint={emergencyPoint}
      />
      <ReportModal
        open={reportOpen}
        onClose={() => {
          setReportOpen(false);
          setReportPoint(null);
        }}
        dict={dict}
        mapCenter={mapCenter}
        userLocation={userLocation}
        onRequestLocation={locate}
        locating={locating}
        initialPoint={reportPoint}
        onSubmitted={(r) => {
          setReports((prev) => [r, ...prev]);
          setSelectedReport(r);
        }}
      />
      <SourcesModal open={sourcesOpen} onClose={() => setSourcesOpen(false)} dict={dict} data={data} />
    </div>
  );
}
