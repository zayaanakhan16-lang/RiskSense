"use client";

import { useEffect, useRef, useState } from "react";
import { LocateIcon, SearchIcon } from "@/components/Icons";
import { cx } from "@/components/ui/Primitives";
import type { Dict } from "@/lib/i18n";

export interface GeoPlace {
  name: string;
  admin?: string;
  country?: string;
  countryCode?: string;
  lat: number;
  lon: number;
  displayName?: string;
}

interface Props {
  onPick: (place: GeoPlace) => void;
  onMyLocation: () => void;
  locating: boolean;
  locationError: string | null;
  dict: Dict;
  className?: string;
}

/** Floating search control: city, region or country, plus a My Location action. */
export default function SearchBar({
  onPick,
  onMyLocation,
  locating,
  locationError,
  dict,
  className,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoPlace[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(dict.search.failed);
        const data = (await res.json()) as { results?: GeoPlace[] };
        setResults(data.results ?? []);
        setError((data.results ?? []).length === 0 ? dict.search.noResults : null);
        setOpen(true);
      } catch {
        if (controller.signal.aborted) return;
        setError(dict.search.failed);
      } finally {
        setBusy(false);
      }
    }, 280);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, dict.search.failed, dict.search.noResults]);

  const pick = (place: GeoPlace) => {
    onPick(place);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={boxRef} className={cx("pointer-events-auto relative w-full", className)}>
      <div className="flex items-stretch gap-1.5">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3">
            <SearchIcon size={15} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) pick(results[0]);
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder={dict.search.placeholder}
            aria-label={dict.search.placeholder}
            className="h-10 w-full rounded-[var(--r-md)] border border-line bg-white/97 pl-8 pr-3 text-[13px] text-ink shadow-[var(--sh-2)] backdrop-blur-md placeholder:text-ink-3 focus:border-navy-3"
          />
          {busy && (
            <span className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-line-strong border-t-navy" />
          )}
        </div>
        <button
          onClick={onMyLocation}
          disabled={locating}
          title={dict.search.myLocation}
          aria-label={dict.search.myLocation}
          className="inline-flex h-10 items-center gap-1.5 rounded-[var(--r-md)] border border-line bg-white/97 px-3 text-[12.5px] font-medium text-ink shadow-[var(--sh-2)] backdrop-blur-md transition-colors hover:bg-paper-2 disabled:opacity-60"
        >
          <LocateIcon size={15} />
          <span className="hidden sm:inline">
            {locating ? dict.search.locating : dict.search.myLocation}
          </span>
        </button>
      </div>

      {open && (
        <ul className="rs-rise absolute left-0 right-0 top-[46px] z-30 max-h-72 overflow-y-auto rounded-[var(--r-md)] border border-line bg-white shadow-[var(--sh-3)]">
          {error && <li className="px-3 py-2.5 text-[12px] text-ink-3">{error}</li>}
          {results.map((r) => (
            <li key={`${r.lat},${r.lon},${r.name}`}>
              <button
                onClick={() => pick(r)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-paper"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-ink">{r.name}</span>
                  <span className="block truncate text-[11.5px] text-ink-3">
                    {[r.admin, r.country].filter(Boolean).join(", ")}
                  </span>
                </span>
                <span className="rs-tabular shrink-0 font-mono text-[10.5px] text-ink-3">
                  {r.lat.toFixed(2)}, {r.lon.toFixed(2)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {(locationError || error) && !open && (
        <p className="mt-1.5 rounded-[var(--r-sm)] bg-white/95 px-2.5 py-1.5 text-[11.5px] text-ink-2 shadow-[var(--sh-1)]">
          {locationError ?? error}
        </p>
      )}
    </div>
  );
}
