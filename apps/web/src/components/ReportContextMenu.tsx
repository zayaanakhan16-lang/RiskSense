"use client";

import { useEffect, useRef } from "react";
import { AlertIcon, CloseIcon, PhoneIcon } from "@/components/Icons";
import type { Dict } from "@/lib/i18n";

interface Props {
  /** Where the user pointed, and where to draw the menu. */
  at: { lat: number; lon: number; x: number; y: number };
  dict: Dict;
  onReportHere: () => void;
  onAlertArea: () => void;
  onEmergencyHere: () => void;
  onDismiss: () => void;
}

/**
 * The "report on this area" menu, opened by right-click or long-press on the
 * map. It is anchored to the exact coordinate the user pointed at, so the
 * report, the alert area or the emergency lookup is tied to a place they chose
 * rather than to the map centre — which may be nowhere near what they meant.
 */
export default function ReportContextMenu({
  at,
  dict,
  onReportHere,
  onAlertArea,
  onEmergencyHere,
  onDismiss,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const t = dict.map;

  // Any click outside, or Escape, closes the menu. Capture phase so a click on
  // the map closes it before the map's own handlers run.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onDismiss();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [onDismiss]);

  return (
    <div
      ref={ref}
      className="rs-rise pointer-events-auto absolute z-40 w-[228px] rounded-[var(--r-md)] border border-line bg-white/98 p-1.5 shadow-[var(--sh-3)] backdrop-blur-md"
      style={{ left: at.x, top: at.y, transform: "translate(-6px, -6px)" }}
      role="menu"
    >
      <div className="flex items-center justify-between px-1.5 pb-1 pt-0.5">
        <span className="rs-tabular font-mono text-[10.5px] text-ink-3">
          {at.lat.toFixed(3)}, {at.lon.toFixed(3)}
        </span>
        <button
          onClick={onDismiss}
          aria-label={dict.common.close}
          className="rounded-[var(--r-xs)] p-0.5 text-ink-3 hover:bg-paper-2 hover:text-ink"
        >
          <CloseIcon size={13} />
        </button>
      </div>

      <button
        role="menuitem"
        onClick={onReportHere}
        className="flex w-full items-center gap-2 rounded-[var(--r-sm)] px-2 py-2 text-left text-[12.5px] font-medium text-ink transition-colors hover:bg-paper-2"
      >
        <AlertIcon size={14} className="shrink-0 text-emergency" />
        {t.reportHere}
      </button>

      <button
        role="menuitem"
        onClick={onEmergencyHere}
        className="flex w-full items-center gap-2 rounded-[var(--r-sm)] px-2 py-2 text-left text-[12.5px] font-medium text-ink transition-colors hover:bg-paper-2"
      >
        <PhoneIcon size={14} className="shrink-0 text-emergency-strong" />
        {t.emergencyHere}
      </button>

      <button
        role="menuitem"
        onClick={onAlertArea}
        className="flex w-full items-center gap-2 rounded-[var(--r-sm)] px-2 py-2 text-left text-[12.5px] font-medium text-ink transition-colors hover:bg-paper-2"
      >
        <span className="flex h-[14px] w-[14px] shrink-0 items-center justify-center">
          <span className="h-2 w-2 rounded-full border-2 border-navy-3" />
        </span>
        {t.alertHere}
      </button>
    </div>
  );
}
