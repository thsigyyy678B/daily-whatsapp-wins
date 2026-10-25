import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Inbox, AlertTriangle, RotateCcw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------- Layout ---------- */

export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative min-h-screen overflow-x-clip", className)}>
      <div className="aurora-bg" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] grid-fade" aria-hidden />
      <div className="relative">{children}</div>
    </div>
  );
}

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-7xl px-5 sm:px-8", className)}>{children}</div>;
}

export function PageHeading({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:flex-wrap sm:justify-between">
      <div className="min-w-0 animate-fade-up">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-xl text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function SectionHeading({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 mt-12 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:flex-wrap sm:justify-between">
      <div className="min-w-0">
        <h2 className="font-display text-xl font-bold sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Card({
  children,
  className,
  hover = true,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div className={cn("glass rounded-3xl", hover && "card-lift", className)}>{children}</div>
  );
}

/* ---------- Stats ---------- */

export function useCountUp(target: number, duration = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!Number.isFinite(target)) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

export function StatCard({
  icon,
  label,
  value,
  hint,
  prefix = "",
  decimals = 0,
}: {
  icon?: ReactNode;
  label: string;
  value: number;
  hint?: string;
  prefix?: string;
  decimals?: number;
}) {
  const v = useCountUp(value);
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 font-display text-3xl font-bold tabular-nums">
            {prefix}
            {v.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
          </div>
          {hint && <div className="mt-1 truncate text-xs text-muted-foreground">{hint}</div>}
        </div>
        {icon && <div className="icon-tile">{icon}</div>}
      </div>
    </Card>
  );
}

/* ---------- Forms ---------- */

export const inputCls = "field-input";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

/* ---------- Feedback ---------- */

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warn" | "danger";
}) {
  return (
    <span
      className={cn(
        "badge",
        tone === "success" && "badge-success",
        tone === "warn" && "badge-warn",
        tone === "danger" && "badge-danger",
      )}
    >
      {children}
    </span>
  );
}

export function statusTone(status?: string): "neutral" | "success" | "warn" | "danger" {
  switch (status) {
    case "approved":
    case "done":
      return "success";
    case "rejected":
      return "danger";
    case "submitted":
    case "pending":
    case "assigned":
      return "warn";
    default:
      return "neutral";
  }
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton h-4 w-full", className)} aria-hidden />;
}

export function CardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass rounded-3xl p-5">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="mt-4 h-4 w-2/3" />
          <Skeleton className="mt-2 h-3 w-1/3" />
          <Skeleton className="mt-5 h-10 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="glass col-span-full flex flex-col items-center rounded-3xl px-6 py-14 text-center">
      <div className="relative grid h-16 w-16 place-items-center rounded-2xl border border-border bg-primary/5 text-primary">
        <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl" aria-hidden />
        <span className="relative">{icon ?? <Inbox className="h-7 w-7" />}</span>
      </div>
      <h3 className="mt-5 font-display text-lg font-semibold">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="glass col-span-full flex flex-col items-center rounded-3xl px-6 py-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive-foreground">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">Something went wrong</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost-emerald mt-6">
          <RotateCcw className="h-4 w-4" /> Retry
        </button>
      )}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} />;
}

/* ---------- Overlay ---------- */

export function Modal({
  children,
  onClose,
  title,
  description,
  size = "md",
}: {
  children: ReactNode;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: "md" | "lg";
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid animate-fade-in place-items-center overflow-y-auto bg-black/80 p-4 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          "glass my-auto w-full animate-scale-in rounded-3xl p-6 sm:p-7",
          size === "lg" ? "max-w-2xl" : "max-w-md",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || description) && (
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              {title && <h3 className="font-display text-xl font-bold">{title}</h3>}
              {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}

/* ---------- Tables ---------- */

export function TableShell({
  children,
  toolbar,
  className,
}: {
  children: ReactNode;
  toolbar?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("glass overflow-hidden rounded-3xl", className)}>
      {toolbar && <div className="border-b border-border p-4">{toolbar}</div>}
      <div className="max-h-[70vh] overflow-auto">
        <table className="table-premium">{children}</table>
      </div>
    </div>
  );
}
