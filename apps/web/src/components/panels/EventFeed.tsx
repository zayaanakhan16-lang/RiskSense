"use client";

import { useMemo, useState } from "react";
import {
  HAZARD_ORDER,
  hazardMeta,
  humanAge,
  severityRank,
  type EventsResponse,
  type HazardEvent,
  type HazardType,
  type SeverityLevel,
} from "@risksense/shared";
import { ChevronDownIcon, AlertIcon, InfoIcon } from "@/components/Icons";
import { legendSwatch } from "@/lib/mapIcons";
import { Badge, Chip, EmptyState, Spinner, cx } from "@/components/ui/Primitives";
import { formatDateTime } from "@/lib/format";
import type { CommunityReport, ReportCategory } from "@/lib/reports";
import type { Dict } from "@/lib/i18n";

const REPORT_CATEGORY_LABEL: Record<ReportCategory, string> = {
  "fire-observed": "Fire observed",
  "flooding-observed": "Flooding observed",
  "road-blocked": "Road blocked",
  "severe-damage": "Severe damage",
  "resource-needed": "Resource needed",
  other: "Other",
};

export interface FeedFilters {
  urgentOnly: boolean;
  hazard: HazardType | "all";
  severity: SeverityLevel | "all";
  sourceId: string | "all";
}

export const DEFAULT_FEED_FILTERS: FeedFilters = {
  urgentOnly: false,
  hazard: "all",
  severity: "all",
  sourceId: "all",
};

interface Props {
  data: EventsResponse | null;
  loading: boolean;
  error: string | null;
  filters: FeedFilters;
  onFiltersChange: (f: FeedFilters) => void;
  selectedId: string | null;
  onSelect: (event: HazardEvent) => void;
  onRetry: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  dict: Dict;
  /** Extra controls rendered under the header (time window, layer chips). */
  headerExtra?: React.ReactNode;
  /** Unverified community reports, shown on their own tab. */
  reports?: CommunityReport[];
  selectedReportId?: string | null;
  onSelectReport?: (report: CommunityReport) => void;
}

/**
 * The live activity panel: the readable half of the map. Every row is a real
 * event from a real source, with its severity, confidence and freshness shown
 * plainly so nothing looks more certain than it is.
 */
export default function EventFeed({
  data,
  loading,
  error,
  filters,
  onFiltersChange,
  selectedId,
  onSelect,
  onRetry,
  collapsed,
  onToggleCollapsed,
  dict,
  headerExtra,
  reports = [],
  selectedReportId,
  onSelectReport,
}: Props) {
  const [showFilters, setShowFilters] = useState(false);
  const [tab, setTab] = useState<"events" | "reports">("events");

  const events = useMemo(() => {
    if (!data) return [];
    return data.events
      .filter((e) => {
        if (filters.urgentOnly && severityRank(e.severity.level) < 2) return false;
        if (filters.hazard !== "all" && e.hazard !== filters.hazard) return false;
        if (filters.severity !== "all" && e.severity.level !== filters.severity) return false;
        if (filters.sourceId !== "all" && e.source.id !== filters.sourceId) return false;
        return true;
      })
      .sort((a, b) => {
        const bySeverity = severityRank(b.severity.level) - severityRank(a.severity.level);
        if (bySeverity !== 0) return bySeverity;
        return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
      });
  }, [data, filters]);

  const hazardCounts = useMemo(() => {
    const counts = new Map<HazardType, number>();
    for (const e of data?.events ?? []) counts.set(e.hazard, (counts.get(e.hazard) ?? 0) + 1);
    return counts;
  }, [data]);

  const availableHazards = useMemo(
    () => HAZARD_ORDER.filter((h) => (hazardCounts.get(h) ?? 0) > 0),
    [hazardCounts],
  );

  const sources = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of data?.sources ?? []) map.set(s.id, s.name);
    return [...map.entries()];
  }, [data]);

  const activeFilterCount =
    (filters.urgentOnly ? 1 : 0) +
    (filters.hazard !== "all" ? 1 : 0) +
    (filters.severity !== "all" ? 1 : 0) +
    (filters.sourceId !== "all" ? 1 : 0);

  return (
    <section
      aria-label={dict.feed.title}
      className="pointer-events-auto flex h-full w-full flex-col overflow-hidden rounded-[var(--r-lg)] border border-line bg-white/96 shadow-[var(--sh-3)] backdrop-blur-md"
    >
      <header className="border-b border-line px-3.5 pb-2.5 pt-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="rs-live-dot absolute inline-flex h-2 w-2 rounded-full bg-alert" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-alert" />
            </span>
            <h2 className="text-[13.5px] font-semibold tracking-[-0.01em] text-ink">
              {dict.feed.title}
            </h2>
            {data && (
              <span className="rs-tabular rounded-[var(--r-pill)] bg-paper-2 px-1.5 py-0.5 text-[11px] font-medium text-ink-2">
                {events.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
              className={cx(
                "relative rounded-[var(--r-sm)] border px-2 py-1 text-[11.5px] font-medium transition-colors",
                showFilters || activeFilterCount > 0
                  ? "border-navy-3 bg-paper-2 text-ink"
                  : "border-line bg-white text-ink-2 hover:text-ink",
              )}
            >
              {dict.filters.all === "All" ? "Filters" : dict.filters.all}
              {activeFilterCount > 0 && (
                <span className="ml-1 rounded-full bg-navy px-1.5 text-[10px] text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button
              onClick={onToggleCollapsed}
              aria-label={collapsed ? dict.feed.expand : dict.feed.collapse}
              className="rounded-[var(--r-sm)] p-1 text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink"
            >
              <ChevronDownIcon
                size={16}
                className={cx("transition-transform", collapsed && "rotate-180")}
              />
            </button>
          </div>
        </div>
        <p className="mt-1 text-[11.5px] leading-snug text-ink-3">{dict.feed.subtitle}</p>

        <div className="mt-2 flex items-center gap-1" role="tablist" aria-label={dict.feed.title}>
          <button
            role="tab"
            aria-selected={tab === "events"}
            onClick={() => setTab("events")}
            className={cx(
              "rounded-[var(--r-sm)] px-2 py-1 text-[11.5px] font-medium transition-colors",
              tab === "events" ? "bg-navy text-white" : "text-ink-2 hover:bg-paper-2",
            )}
          >
            {dict.feed.sourceEvents}
          </button>
          <button
            role="tab"
            aria-selected={tab === "reports"}
            onClick={() => setTab("reports")}
            className={cx(
              "rounded-[var(--r-sm)] px-2 py-1 text-[11.5px] font-medium transition-colors",
              tab === "reports" ? "bg-navy text-white" : "text-ink-2 hover:bg-paper-2",
            )}
          >
            {dict.feed.communityReports}
            {reports.length > 0 && (
              <span className="rs-tabular ml-1 opacity-80">{reports.length}</span>
            )}
          </button>
        </div>

        {headerExtra}

        {showFilters && (
          <div className="mt-2.5 space-y-2.5 border-t border-line pt-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip
                active={filters.urgentOnly}
                color="var(--alert)"
                onClick={() => onFiltersChange({ ...filters, urgentOnly: !filters.urgentOnly })}
              >
                <AlertIcon size={11} />
                {dict.filters.urgent}
              </Chip>
              <Chip
                active={filters.hazard === "all"}
                onClick={() => onFiltersChange({ ...filters, hazard: "all" })}
              >
                {dict.filters.all}
              </Chip>
              {availableHazards.map((h) => {
                const meta = hazardMeta(h);
                return (
                  <Chip
                    key={h}
                    active={filters.hazard === h}
                    color={meta.color}
                    title={meta.description}
                    onClick={() =>
                      onFiltersChange({ ...filters, hazard: filters.hazard === h ? "all" : h })
                    }
                  >
                    <span aria-hidden>{meta.emoji}</span>
                    {meta.short}
                    <span className="rs-tabular opacity-70">{hazardCounts.get(h)}</span>
                  </Chip>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1.5 text-[11px] text-ink-3">
                {dict.filters.severity}
                <select
                  value={filters.severity}
                  onChange={(e) =>
                    onFiltersChange({ ...filters, severity: e.target.value as FeedFilters["severity"] })
                  }
                  className="rounded-[var(--r-xs)] border border-line bg-white px-1.5 py-1 text-[11.5px] text-ink"
                >
                  <option value="all">{dict.filters.all}</option>
                  <option value="minor">{dict.severity.minor}</option>
                  <option value="moderate">{dict.severity.moderate}</option>
                  <option value="severe">{dict.severity.severe}</option>
                  <option value="extreme">{dict.severity.extreme}</option>
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-[11px] text-ink-3">
                {dict.filters.source}
                <select
                  value={filters.sourceId}
                  onChange={(e) => onFiltersChange({ ...filters, sourceId: e.target.value })}
                  className="max-w-[170px] rounded-[var(--r-xs)] border border-line bg-white px-1.5 py-1 text-[11.5px] text-ink"
                >
                  <option value="all">{dict.filters.all}</option>
                  {sources.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => onFiltersChange(DEFAULT_FEED_FILTERS)}
                  className="text-[11px] font-medium text-navy-3 underline underline-offset-2 hover:text-ink"
                >
                  {dict.filters.reset}
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {!collapsed && tab === "reports" && (
        <div className="rs-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="border-b border-line bg-warn-soft/50 px-3.5 py-2">
            <p className="text-[11px] leading-relaxed text-[#7c4a03]">
              {dict.feed.reportsNotice}
            </p>
          </div>
          {reports.length === 0 ? (
            <EmptyState
              title={dict.feed.noReports}
              hint={dict.feed.noReportsHint}
              icon={<InfoIcon size={22} />}
            />
          ) : (
            <ul className="divide-y divide-line">
              {reports.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => onSelectReport?.(r)}
                    aria-current={r.id === selectedReportId}
                    className={cx(
                      "flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors",
                      r.id === selectedReportId ? "bg-paper-2" : "hover:bg-paper-2/60",
                    )}
                  >
                    <span
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-emergency bg-white text-[13px]"
                      aria-hidden
                    >
                      📍
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[12.5px] font-medium text-ink">
                          {REPORT_CATEGORY_LABEL[r.category]}
                        </span>
                        <Badge color="#9a3412" soft="#feeedf">
                          {r.status}
                        </Badge>
                      </span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-ink-2">
                        {r.description}
                      </span>
                      <span className="rs-tabular mt-0.5 block text-[10.5px] text-ink-3">
                        {formatDateTime(r.createdAt)}
                        {r.place ? ` · ${r.place}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!collapsed && tab === "events" && (
        <div className="rs-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {loading && !data && (
            <div className="px-4 py-6">
              <Spinner label={dict.feed.loading} />
            </div>
          )}

          {error && !data && (
            <div className="px-4 py-6">
              <EmptyState
                title={dict.feed.error}
                hint={error}
                icon={<AlertIcon size={22} />}
              />
              <div className="text-center">
                <button
                  onClick={onRetry}
                  className="rounded-[var(--r-sm)] border border-line bg-white px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-paper-2"
                >
                  {dict.feed.retry}
                </button>
              </div>
            </div>
          )}

          {data && events.length === 0 && (
            <EmptyState
              title={dict.feed.empty}
              hint={dict.feed.emptyHint}
              icon={<InfoIcon size={22} />}
            />
          )}

          <ul className="divide-y divide-line">
            {events.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                selected={event.id === selectedId}
                onSelect={() => onSelect(event)}
                dict={dict}
              />
            ))}
          </ul>

          {data && events.length > 0 && (
            <p className="px-3.5 py-3 text-[11px] leading-relaxed text-ink-3">
              {events.length} {events.length === 1 ? dict.common.event : dict.common.events}{" "}
              {dict.feed.shown}. {dict.common.disclaimer}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function EventRow({
  event,
  selected,
  onSelect,
  dict,
}: {
  event: HazardEvent;
  selected: boolean;
  onSelect: () => void;
  dict: Dict;
}) {
  const meta = hazardMeta(event.hazard);
  const severityTone =
    event.severity.level === "extreme"
      ? { color: "#991b1b", soft: "#fdeaea" }
      : event.severity.level === "severe"
        ? { color: "#9a3412", soft: "#feeedf" }
        : event.severity.level === "moderate"
          ? { color: "#854d0e", soft: "#faf1d6" }
          : { color: "#475569", soft: "#eef1f5" };

  return (
    <li>
      <button
        onClick={onSelect}
        aria-current={selected}
        className={cx(
          "group flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors",
          selected ? "bg-paper-2" : "hover:bg-paper",
        )}
      >
        <span
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] leading-none shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55)]"
          style={{ background: legendSwatch(meta.color, meta.glow) }}
          title={meta.label}
          aria-hidden
        >
          {meta.emoji}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="line-clamp-2 text-[12.5px] font-medium leading-snug text-ink">
              {event.title}
            </span>
            <span className="rs-tabular shrink-0 text-[11px] text-ink-3">
              {humanAge((Date.now() - new Date(event.detectedAt).getTime()) / 60_000)}
            </span>
          </span>

          <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-ink-2">
            <span className="truncate">{event.place ?? `${event.lat.toFixed(1)}, ${event.lon.toFixed(1)}`}</span>
          </span>

          <span className="mt-1.5 flex flex-wrap items-center gap-1">
            <Badge color={severityTone.color} soft={severityTone.soft}>
              {dict.severity[event.severity.level]}
            </Badge>
            <Badge>{dict.status[event.status]}</Badge>
            {event.isDetection && (
              <Badge color="#9a3412" soft="#fff1e6">
                {dict.details.detectionNotice.split(" — ")[0]}
              </Badge>
            )}
            <span className="ml-auto truncate text-[10.5px] text-ink-3">{event.source.name}</span>
          </span>
        </span>
      </button>
    </li>
  );
}
