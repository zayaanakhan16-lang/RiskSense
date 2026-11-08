"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { CloseIcon } from "@/components/Icons";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "emergency";
  size?: "sm" | "md" | "lg";
};

const VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-navy text-white hover:bg-navy-2 border border-transparent",
  secondary: "bg-white text-ink border border-line hover:border-line-strong hover:bg-paper-2",
  ghost: "bg-transparent text-ink-2 hover:bg-paper-2 hover:text-ink border border-transparent",
  danger: "bg-alert text-white hover:brightness-95 border border-transparent",
  emergency: "bg-emergency text-white hover:bg-emergency-strong border border-transparent shadow-[var(--sh-1)]",
};

const SIZES: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-8 px-2.5 text-[12px] gap-1.5 rounded-[var(--r-sm)]",
  md: "h-9 px-3.5 text-[13px] gap-2 rounded-[var(--r-sm)]",
  lg: "h-11 px-4 text-[14px] gap-2 rounded-[var(--r-md)]",
};

export function Button({ variant = "secondary", size = "md", className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex select-none items-center justify-center font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    />
  );
}

export function Panel({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "aside";
}) {
  return (
    <Tag
      className={cx(
        "rounded-[var(--r-lg)] border border-line bg-white/95 backdrop-blur-md shadow-[var(--sh-3)]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function Chip({
  active,
  children,
  onClick,
  title,
  color,
  className,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  title?: string;
  color?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cx(
        "inline-flex h-7 items-center gap-1.5 rounded-[var(--r-pill)] border px-2.5",
        "whitespace-nowrap text-[11.5px] font-medium transition-colors",
        active
          ? "border-transparent text-white"
          : "border-line bg-white text-ink-2 hover:border-line-strong hover:text-ink",
        className,
      )}
      style={active ? { backgroundColor: color ?? "var(--navy)" } : undefined}
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  color,
  soft,
  className,
}: {
  children: ReactNode;
  color?: string;
  soft?: string;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-[var(--r-xs)] px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide",
        className,
      )}
      style={{ color: color ?? "var(--ink-2)", backgroundColor: soft ?? "var(--paper-2)" }}
    >
      {children}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-navy/35 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cx(
          "rs-rise my-4 w-full rounded-[var(--r-xl)] border border-line bg-white shadow-[var(--sh-4)]",
          wide ? "max-w-3xl" : "max-w-xl",
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-2">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-[var(--r-sm)] p-1.5 text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink"
          >
            <CloseIcon size={18} />
          </button>
        </header>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="rs-overline text-ink-3">{label}</span>
      {hint && <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-3">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cx(
        "w-full rounded-[var(--r-sm)] border border-line bg-white px-3 py-2 text-[13px] text-ink",
        "placeholder:text-ink-3 focus:border-navy-3",
        props.className,
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cx(
        "w-full resize-y rounded-[var(--r-sm)] border border-line bg-white px-3 py-2 text-[13px] leading-relaxed text-ink",
        "placeholder:text-ink-3 focus:border-navy-3",
        props.className,
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cx(
        "w-full appearance-none rounded-[var(--r-sm)] border border-line bg-white px-3 py-2 text-[13px] text-ink",
        "focus:border-navy-3",
        props.className,
      )}
    />
  );
}

export function Notice({
  tone = "info",
  children,
  className,
}: {
  tone?: "info" | "warn" | "danger" | "safe";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    info: "border-water/25 bg-water-soft text-[#075985]",
    warn: "border-warn/30 bg-warn-soft text-[#854d0e]",
    danger: "border-alert/25 bg-alert-soft text-[#991b1b]",
    safe: "border-safe/25 bg-safe-soft text-[#166534]",
  } as const;
  return (
    <div
      className={cx(
        "rounded-[var(--r-sm)] border px-3 py-2 text-[12px] leading-relaxed",
        tones[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[12.5px] text-ink-2">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line-strong border-t-navy" />
      {label}
    </span>
  );
}

export function EmptyState({
  title,
  hint,
  icon,
}: {
  title: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-5 py-10 text-center">
      {icon && <div className="mb-1 text-ink-3">{icon}</div>}
      <p className="text-[13px] font-medium text-ink">{title}</p>
      {hint && <p className="max-w-xs text-[12px] leading-relaxed text-ink-3">{hint}</p>}
    </div>
  );
}
