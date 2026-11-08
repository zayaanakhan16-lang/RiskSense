"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AlertIcon,
  BellIcon,
  ChevronDownIcon,
  CloseIcon,
  MenuIcon,
  RiskSenseLogo,
} from "@/components/Icons";
import { cx } from "@/components/ui/Primitives";
import { LOCALE_NAMES, LOCALES, type Dict, type Locale } from "@/lib/i18n";

interface Props {
  dict: Dict;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  onEmergency: () => void;
  onAlerts: () => void;
  onReport: () => void;
  alertMatchCount: number;
}

const EXPLORE_LINKS = [
  { href: "/observatory", key: "observatory" as const },
  { href: "/sources", key: "sources" as const },
  { href: "/methodology", key: "methodology" as const },
  { href: "/archive", key: "archive" as const },
  { href: "/api-docs", key: "api" as const },
];

/** Compact top navigation: identity, information pages, language, assistance. */
export default function TopBar({
  dict,
  locale,
  onLocaleChange,
  onEmergency,
  onAlerts,
  onReport,
  alertMatchCount,
}: Props) {
  const [exploreOpen, setExploreOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setExploreOpen(false);
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const navLink =
    "rounded-[var(--r-sm)] px-2.5 py-1.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink";

  return (
    <header className="pointer-events-auto relative z-40 border-b border-line bg-paper/92 backdrop-blur-md">
      <div ref={wrapRef} className="mx-auto flex h-[var(--header-h)] max-w-[1600px] items-center gap-2 px-3 sm:px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="RiskSense home">
          <RiskSenseLogo size={24} />
          <span className="flex flex-col leading-none">
            <span className="text-[15px] font-semibold tracking-[-0.02em] text-ink">
              RiskSense
            </span>
            <span className="hidden text-[10px] font-medium tracking-[0.02em] text-ink-3 sm:block">
              {dict.tagline}
            </span>
          </span>
        </Link>

        <nav className="ml-2 hidden items-center gap-0.5 lg:flex" aria-label="Primary">
          <Link href="/how-it-works" className={navLink}>
            {dict.nav.howItWorks}
          </Link>
          <Link href="/about" className={navLink}>
            {dict.nav.about}
          </Link>
          <Link href="/faq" className={navLink}>
            {dict.nav.faq}
          </Link>

          <div className="relative">
            <button
              onClick={() => {
                setExploreOpen((v) => !v);
                setLangOpen(false);
              }}
              aria-expanded={exploreOpen}
              className={cx(navLink, "inline-flex items-center gap-1")}
            >
              {dict.nav.explore}
              <ChevronDownIcon size={13} />
            </button>
            {exploreOpen && (
              <div className="rs-rise absolute left-0 top-[38px] z-50 w-52 overflow-hidden rounded-[var(--r-md)] border border-line bg-white shadow-[var(--sh-3)]">
                {EXPLORE_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setExploreOpen(false)}
                    className="block px-3 py-2 text-[12.5px] text-ink-2 transition-colors hover:bg-paper hover:text-ink"
                  >
                    {dict.nav[l.key]}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <button onClick={onReport} className={navLink}>
            {dict.nav.contribute}
          </button>
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <div className="relative hidden sm:block">
            <button
              onClick={() => {
                setLangOpen((v) => !v);
                setExploreOpen(false);
              }}
              aria-expanded={langOpen}
              aria-label="Language"
              className={cx(navLink, "inline-flex items-center gap-1")}
            >
              {locale.toUpperCase()}
              <ChevronDownIcon size={12} />
            </button>
            {langOpen && (
              <div className="rs-rise absolute right-0 top-[38px] z-50 w-40 overflow-hidden rounded-[var(--r-md)] border border-line bg-white shadow-[var(--sh-3)]">
                {LOCALES.map((l) => (
                  <button
                    key={l}
                    onClick={() => {
                      onLocaleChange(l);
                      setLangOpen(false);
                    }}
                    className={cx(
                      "block w-full px-3 py-2 text-left text-[12.5px] transition-colors hover:bg-paper",
                      l === locale ? "font-semibold text-ink" : "text-ink-2",
                    )}
                  >
                    {LOCALE_NAMES[l]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onAlerts}
            className={cx(navLink, "relative hidden items-center gap-1.5 sm:inline-flex")}
          >
            <BellIcon size={14} />
            <span className="hidden md:inline">{dict.nav.alerts}</span>
            {alertMatchCount > 0 && (
              <span className="rs-tabular rounded-full bg-emergency px-1.5 text-[10px] font-semibold text-white">
                {alertMatchCount}
              </span>
            )}
          </button>

          <button
            onClick={onEmergency}
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--r-md)] bg-emergency px-3 text-[12.5px] font-semibold text-white shadow-[var(--sh-1)] transition-colors hover:bg-emergency-strong"
          >
            <AlertIcon size={14} />
            <span className="hidden sm:inline">{dict.nav.emergency}</span>
            <span className="sm:hidden">SOS</span>
          </button>

          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={mobileOpen}
            className="rounded-[var(--r-sm)] p-2 text-ink-2 transition-colors hover:bg-paper-2 lg:hidden"
          >
            {mobileOpen ? <CloseIcon size={18} /> : <MenuIcon size={18} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="rs-rise border-t border-line bg-white px-3 py-2 lg:hidden" aria-label="Mobile">
          <div className="grid grid-cols-2 gap-1">
            {[
              { href: "/how-it-works", label: dict.nav.howItWorks },
              { href: "/about", label: dict.nav.about },
              { href: "/faq", label: dict.nav.faq },
              { href: "/observatory", label: dict.nav.observatory },
              { href: "/sources", label: dict.nav.sources },
              { href: "/methodology", label: dict.nav.methodology },
              { href: "/archive", label: dict.nav.archive },
              { href: "/api-docs", label: dict.nav.api },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-[var(--r-sm)] px-3 py-2 text-[13px] text-ink-2 transition-colors hover:bg-paper hover:text-ink"
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 border-t border-line pt-2">
            {LOCALES.map((l) => (
              <button
                key={l}
                onClick={() => onLocaleChange(l)}
                className={cx(
                  "rounded-[var(--r-pill)] border px-2.5 py-1 text-[11.5px]",
                  l === locale
                    ? "border-transparent bg-navy text-white"
                    : "border-line bg-white text-ink-2",
                )}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setMobileOpen(false);
              onReport();
            }}
            className="mt-2 w-full rounded-[var(--r-sm)] border border-line px-3 py-2 text-[13px] font-medium text-ink"
          >
            {dict.nav.contribute}
          </button>
        </nav>
      )}
    </header>
  );
}
