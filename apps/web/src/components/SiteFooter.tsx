"use client";

import Link from "next/link";
import { cx } from "@/components/ui/Primitives";
import type { Dict } from "@/lib/i18n";

interface Props {
  dict: Dict;
  /** Compact variant sits under the map; full variant is used on content pages. */
  compact?: boolean;
}

/** Persistent honesty footer: what RiskSense is, and what it is not. */
export default function SiteFooter({ dict, compact }: Props) {
  return (
    <footer
      className={cx(
        "relative z-10 border-t border-line bg-paper/95 backdrop-blur-md",
        compact ? "px-3 py-1.5" : "px-4 py-10",
      )}
    >
      {compact ? (
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2 text-[10.5px] text-ink-3">
          <p>{dict.common.disclaimer}</p>
          <p className="flex items-center gap-2">
            <span>{dict.footer.openSource}</span>
            <span aria-hidden>·</span>
            <Link href="/sources" className="underline underline-offset-2 hover:text-ink">
              {dict.nav.sources}
            </Link>
            <span aria-hidden>·</span>
            <Link href="/methodology" className="underline underline-offset-2 hover:text-ink">
              {dict.nav.methodology}
            </Link>
          </p>
        </div>
      ) : (
        <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-[15px] font-semibold tracking-[-0.02em] text-ink">RiskSense</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">{dict.tagline}</p>
            <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">{dict.common.disclaimer}</p>
          </div>
          <FooterCol
            title="Product"
            links={[
              { href: "/how-it-works", label: dict.nav.howItWorks },
              { href: "/observatory", label: dict.nav.observatory },
              { href: "/archive", label: dict.nav.archive },
              { href: "/faq", label: dict.nav.faq },
            ]}
          />
          <FooterCol
            title="Transparency"
            links={[
              { href: "/sources", label: dict.nav.sources },
              { href: "/methodology", label: dict.nav.methodology },
              { href: "/about", label: dict.nav.about },
              { href: "/api-docs", label: dict.nav.api },
            ]}
          />
          <FooterCol
            title="Contribute"
            links={[
              { href: "/contribute", label: dict.nav.contribute },
              { href: "/emergency", label: dict.nav.emergency },
            ]}
          />
        </div>
      )}
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="rs-overline text-ink-3">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="text-[12.5px] text-ink-2 transition-colors hover:text-ink"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
