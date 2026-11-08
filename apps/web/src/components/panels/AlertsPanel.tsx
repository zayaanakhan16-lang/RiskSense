"use client";

import { useState } from "react";
import { HAZARD_ORDER, hazardMeta, humanAge, type HazardType, type SeverityLevel } from "@risksense/shared";
import type { AlertMatch } from "@risksense/hazard-engine";
import {
  BellIcon,
  CloseIcon,
  HazardIcon,
  LocateIcon,
  PlusIcon,
  ShieldIcon,
} from "@/components/Icons";
import { Button, Chip, Field, Input, Notice, cx } from "@/components/ui/Primitives";
import type { Dict } from "@/lib/i18n";
import type { useAlerts } from "@/hooks/useAlerts";

type AlertsApi = ReturnType<typeof useAlerts>;

interface Props {
  dict: Dict;
  alerts: AlertsApi;
  onClose: () => void;
  /** Current map centre, offered as a new monitoring area. */
  mapCenter: { lat: number; lon: number } | null;
  onFocusEvent: (lat: number, lon: number) => void;
}

/**
 * Personal risk alert configuration and current matches.
 *
 * Areas never leave the browser, thresholds are explicit, and the panel states
 * plainly that a lack of matches is not a safety guarantee.
 */
export default function AlertsPanel({ dict, alerts, onClose, mapCenter, onFocusEvent }: Props) {
  const [newAreaName, setNewAreaName] = useState("");
  const [radius, setRadius] = useState(100);
  const [adding, setAdding] = useState(false);

  const t = dict.alerts;

  const addCurrentView = () => {
    if (!mapCenter) return;
    alerts.addArea({
      label: newAreaName.trim() || `${mapCenter.lat.toFixed(1)}, ${mapCenter.lon.toFixed(1)}`,
      lat: mapCenter.lat,
      lon: mapCenter.lon,
      radiusKm: radius,
    });
    setNewAreaName("");
    setAdding(false);
  };

  return (
    <section
      aria-label={t.title}
      className="rs-rise pointer-events-auto flex max-h-full w-full flex-col overflow-hidden rounded-[var(--r-lg)] border border-line bg-white/97 shadow-[var(--sh-4)] backdrop-blur-md"
    >
      <header className="flex items-start justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <h2 className="flex items-center gap-1.5 text-[15px] font-semibold tracking-[-0.01em] text-ink">
            <BellIcon size={15} />
            {t.title}
          </h2>
          <p className="mt-0.5 text-[11.5px] leading-snug text-ink-2">{t.subtitle}</p>
        </div>
        <button
          onClick={onClose}
          aria-label={dict.common.close}
          className="rounded-[var(--r-sm)] p-1.5 text-ink-3 hover:bg-paper-2 hover:text-ink"
        >
          <CloseIcon size={17} />
        </button>
      </header>

      <div className="rs-scroll min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-3.5">
        {/* Matches */}
        <div>
          <div className="flex items-center justify-between">
            <p className="rs-overline text-ink-3">{t.matches}</p>
            {alerts.matches.length > 0 && (
              <span className="rs-tabular rounded-full bg-emergency px-2 py-0.5 text-[10.5px] font-semibold text-white">
                {alerts.matches.length}
              </span>
            )}
          </div>
          {alerts.matches.length === 0 ? (
            <Notice tone="info" className="mt-1.5">
              <p className="font-medium">{t.noMatches}</p>
              <p className="mt-0.5">{t.quietNotice}</p>
            </Notice>
          ) : (
            <ul className="mt-1.5 space-y-1.5">
              {alerts.matches.slice(0, 12).map((m: AlertMatch) => {
                const meta = hazardMeta(m.event.hazard);
                return (
                  <li key={`${m.event.id}:${m.area.id}`}>
                    <button
                      onClick={() => onFocusEvent(m.event.lat, m.event.lon)}
                      className="w-full rounded-[var(--r-sm)] border border-line bg-white px-3 py-2 text-left transition-colors hover:bg-paper"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="flex h-5 w-5 items-center justify-center rounded-full"
                          style={{ backgroundColor: meta.soft, color: meta.color }}
                          aria-hidden
                        >
                          <HazardIcon hazard={m.event.hazard} size={11} />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink">
                          {m.event.title}
                        </span>
                        <span className="rs-tabular shrink-0 text-[10.5px] text-ink-3">
                          {humanAge((Date.now() - new Date(m.event.detectedAt).getTime()) / 60_000)}
                        </span>
                      </span>
                      <span className="mt-1 block text-[11px] leading-snug text-ink-3">
                        {m.reason}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Areas */}
        <div>
          <div className="flex items-center justify-between">
            <p className="rs-overline text-ink-3">{t.myAreas}</p>
            <button
              onClick={() => setAdding((v) => !v)}
              className="inline-flex items-center gap-1 text-[11.5px] font-medium text-navy-3 hover:text-ink"
            >
              <PlusIcon size={12} />
              {t.addArea}
            </button>
          </div>

          {adding && (
            <div className="mt-2 space-y-2 rounded-[var(--r-sm)] border border-line bg-paper px-3 py-2.5">
              <Field label={t.name} htmlFor="area-name">
                <Input
                  id="area-name"
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                  placeholder={mapCenter ? `${mapCenter.lat.toFixed(2)}, ${mapCenter.lon.toFixed(2)}` : ""}
                />
              </Field>
              <div>
                <div className="flex items-center justify-between">
                  <span className="rs-overline text-ink-3">{t.radius}</span>
                  <span className="rs-tabular text-[11.5px] font-medium text-ink">{radius} km</span>
                </div>
                <input
                  type="range"
                  min={25}
                  max={500}
                  step={25}
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="rs-range mt-2 w-full"
                  aria-label={t.radius}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="primary" onClick={addCurrentView} disabled={!mapCenter}>
                  <LocateIcon size={12} />
                  {t.save}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
                  {t.cancel}
                </Button>
              </div>
              {!mapCenter && (
                <p className="text-[11px] text-ink-3">Move the map, then add the current view.</p>
              )}
            </div>
          )}

          {alerts.state.areas.length === 0 ? (
            <p className="mt-1.5 text-[11.5px] text-ink-3">
              {t.localNotice}
            </p>
          ) : (
            <ul className="mt-1.5 space-y-1">
              {alerts.state.areas.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-2 rounded-[var(--r-sm)] border border-line bg-white px-2.5 py-1.5"
                >
                  <ShieldIcon size={13} className="shrink-0 text-navy-3" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-medium text-ink">{a.label}</span>
                    <span className="rs-tabular block font-mono text-[10.5px] text-ink-3">
                      {a.lat.toFixed(2)}, {a.lon.toFixed(2)} · {a.radiusKm} km
                    </span>
                  </span>
                  <button
                    onClick={() => alerts.removeArea(a.id)}
                    className="text-[11px] text-ink-3 hover:text-alert"
                  >
                    {t.remove}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Hazards */}
        <div>
          <div className="flex items-center justify-between">
            <p className="rs-overline text-ink-3">{t.hazards}</p>
            <div className="flex gap-2 text-[11px] font-medium">
              <button onClick={() => alerts.setAllHazards(true)} className="text-navy-3 hover:text-ink">
                {dict.layers.all}
              </button>
              <button onClick={() => alerts.setAllHazards(false)} className="text-navy-3 hover:text-ink">
                {dict.layers.none}
              </button>
            </div>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {HAZARD_ORDER.map((h: HazardType) => {
              const meta = hazardMeta(h);
              return (
                <Chip
                  key={h}
                  active={alerts.state.hazards.includes(h)}
                  color={meta.color}
                  onClick={() => alerts.toggleHazard(h)}
                >
                  <HazardIcon hazard={h} size={11} />
                  {meta.short}
                </Chip>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11px] text-ink-3">
            {alerts.state.hazards.length === 0
              ? "No categories selected — all hazards are matched."
              : `${alerts.state.hazards.length} selected.`}
          </p>
        </div>

        {/* Threshold */}
        <Field label={t.threshold}>
          <div className="flex flex-wrap gap-1.5">
            {(["minor", "moderate", "severe", "extreme"] as SeverityLevel[]).map((level) => (
              <Chip
                key={level}
                active={alerts.state.minSeverity === level}
                onClick={() => alerts.setMinSeverity(level)}
              >
                {dict.severity[level]}
              </Chip>
            ))}
          </div>
        </Field>

        {/* Notifications */}
        <div className="rounded-[var(--r-sm)] border border-line bg-paper px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[12.5px] font-medium text-ink">{t.permission}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-ink-3">
                {alerts.permission === "granted"
                  ? t.enabled
                  : alerts.permission === "denied"
                    ? t.blocked
                    : alerts.permission === "unsupported"
                      ? t.unsupported
                      : "Notifications are opt-in and never enabled automatically."}
              </p>
            </div>
            {alerts.permission === "granted" ? (
              <Button
                size="sm"
                variant={alerts.state.notify ? "primary" : "secondary"}
                onClick={() =>
                  alerts.state.notify ? alerts.disableNotifications() : alerts.requestNotifications()
                }
              >
                {alerts.state.notify ? dict.alerts.disable : dict.alerts.enable}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="primary"
                onClick={() => alerts.requestNotifications()}
                disabled={alerts.permission === "unsupported"}
              >
                {t.enable}
              </Button>
            )}
          </div>
        </div>

        <Notice tone="info">{t.localNotice}</Notice>
      </div>

      <footer className="flex items-center justify-between gap-2 border-t border-line px-4 py-2.5">
        <label className={cx("flex items-center gap-2 text-[12px] text-ink-2")}>
          <input
            type="checkbox"
            checked={alerts.state.enabled}
            onChange={(e) => alerts.setEnabled(e.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--emergency)]"
          />
          Alerts active
        </label>
        <Button size="sm" variant="ghost" onClick={onClose}>
          {dict.common.close}
        </Button>
      </footer>
    </section>
  );
}
