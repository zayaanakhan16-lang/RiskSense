"use client";

import { FRESHNESS_COLORS, computeFreshness, hazardMeta, type EventsResponse } from "@risksense/shared";
import { ExternalIcon, InfoIcon } from "@/components/Icons";
import { Modal, Notice, cx } from "@/components/ui/Primitives";
import type { Dict } from "@/lib/i18n";

interface Props {
  open: boolean;
  onClose: () => void;
  dict: Dict;
  data: EventsResponse | null;
}

const STATE_LABEL: Record<string, string> = {
  ok: "Reporting",
  degraded: "Degraded",
  unavailable: "Unavailable",
  "not-configured": "Not configured",
};

/** Source health and license directory — the transparency surface for the feed. */
export default function SourcesModal({ open, onClose, dict, data }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={dict.nav.sources}
      subtitle="Every feed RiskSense reads, its cadence, its current state and its license."
      wide
    >
      <div className="space-y-3">
        {data && data.warnings.length > 0 && (
          <Notice tone="warn">
            <p className="font-semibold">Active source warnings</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {data.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </Notice>
        )}

        <div className="overflow-hidden rounded-[var(--r-md)] border border-line">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-paper-2 text-[10.5px] uppercase tracking-wide text-ink-3">
                <th className="px-3 py-2 font-semibold">Source</th>
                <th className="px-3 py-2 font-semibold">Hazards</th>
                <th className="hidden px-3 py-2 font-semibold sm:table-cell">Cadence</th>
                <th className="px-3 py-2 font-semibold">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(data?.sources ?? []).map((s) => {
                const freshness = computeFreshness(s.lastSuccessAt, s.expectedRefreshMinutes);
                const stateColor =
                  s.state === "ok" ? FRESHNESS_COLORS.fresh : s.state === "degraded" ? FRESHNESS_COLORS.aging : FRESHNESS_COLORS.expired;
                return (
                  <tr key={s.id} className="align-top">
                    <td className="px-3 py-2.5">
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ink hover:text-navy-3"
                      >
                        {s.name}
                        <ExternalIcon size={11} />
                      </a>
                      <p className="mt-0.5 text-[10.5px] leading-snug text-ink-3">{s.license}</p>
                      {s.message && (
                        <p className="mt-0.5 text-[10.5px] leading-snug text-warn">{s.message}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {s.hazards.slice(0, 4).map((h) => (
                          <span
                            key={h}
                            className="rounded-[var(--r-xs)] px-1.5 py-0.5 text-[10px] font-medium"
                            style={{
                              backgroundColor: hazardMeta(h).soft,
                              color: hazardMeta(h).color,
                            }}
                          >
                            {hazardMeta(h).short}
                          </span>
                        ))}
                        {s.hazards.length > 4 && (
                          <span className="text-[10px] text-ink-3">+{s.hazards.length - 4}</span>
                        )}
                      </div>
                    </td>
                    <td className="hidden px-3 py-2.5 text-[11.5px] text-ink-2 sm:table-cell">
                      ~{s.expectedRefreshMinutes} min
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: stateColor }}
                        />
                        <span className="text-[11.5px] text-ink-2">
                          {STATE_LABEL[s.state] ?? s.state}
                        </span>
                      </span>
                      <p className="rs-tabular mt-0.5 text-[10.5px] text-ink-3">
                        {freshness.label}
                      </p>
                    </td>
                  </tr>
                );
              })}
              {!data && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-[12.5px] text-ink-3">
                    {dict.common.loading}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={cx("flex items-start gap-2 rounded-[var(--r-sm)] bg-paper px-3 py-2.5 text-[11.5px] leading-relaxed text-ink-2")}>
          <InfoIcon size={14} className="mt-0.5 shrink-0 text-ink-3" />
          <p>
            RiskSense shows source data as published. Where a publisher revises records, the
            newest revision is used. Where a feed is delayed or unavailable, that state is shown
            here rather than hidden — a quiet map may simply mean a quiet feed.
          </p>
        </div>
      </div>
    </Modal>
  );
}
