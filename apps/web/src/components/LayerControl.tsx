"use client";

import { HAZARD_ORDER, hazardMeta, type HazardType } from "@risksense/shared";
import { cx } from "@/components/ui/Primitives";
import { legendSwatch } from "@/lib/mapIcons";
import type { Dict } from "@/lib/i18n";

interface Props {
  dict: Dict;
  active: HazardType[];
  counts: Partial<Record<HazardType, number>>;
  onChange: (active: HazardType[]) => void;
  onClose: () => void;
}

/** Hazard layer control: which families are drawn on the map. */
export default function LayerControl({ dict, active, counts, onChange, onClose }: Props) {
  const toggle = (h: HazardType) => {
    onChange(active.includes(h) ? active.filter((x) => x !== h) : [...active, h]);
  };

  return (
    <div className="rs-rise pointer-events-auto w-64 overflow-hidden rounded-[var(--r-md)] border border-line bg-white/97 shadow-[var(--sh-3)] backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
        <p className="rs-overline text-ink-3">{dict.layers.label}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChange([])}
            className="text-[11px] font-medium text-navy-3 hover:text-ink"
          >
            {dict.layers.all}
          </button>
          <button
            onClick={() => onChange([...HAZARD_ORDER])}
            className="text-[11px] font-medium text-navy-3 hover:text-ink"
          >
            {dict.layers.showAll}
          </button>
          <button
            onClick={onClose}
            aria-label={dict.common.close}
            className="text-[11px] text-ink-3 hover:text-ink"
          >
            ✕
          </button>
        </div>
      </div>
      <ul className="max-h-[320px] overflow-y-auto py-1">
        {HAZARD_ORDER.map((h) => {
          const meta = hazardMeta(h);
          const on = active.length === 0 || active.includes(h);
          const count = counts[h] ?? 0;
          return (
            <li key={h}>
              <button
                onClick={() => toggle(h)}
                aria-pressed={on}
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors hover:bg-paper"
              >
                <span
                  className={cx(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[11px] leading-none transition-opacity",
                    !on && "opacity-35",
                  )}
                  style={{ background: legendSwatch(meta.color, meta.glow) }}
                  aria-hidden
                >
                  {meta.emoji}
                </span>
                <span className={cx("flex-1 text-[12.5px]", on ? "text-ink" : "text-ink-3")}>
                  {meta.label}
                </span>
                <span className="rs-tabular text-[11px] text-ink-3">{count}</span>
                <span
                  className={cx(
                    "h-3.5 w-3.5 rounded-[4px] border transition-colors",
                    on ? "border-transparent" : "border-line-strong",
                  )}
                  style={on ? { backgroundColor: meta.color } : undefined}
                  aria-hidden
                />
              </button>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-line px-3 py-2 text-[10.5px] leading-snug text-ink-3">
        {dict.map.markers} · {active.length === 0 ? dict.layers.all : active.length}
      </p>
    </div>
  );
}
