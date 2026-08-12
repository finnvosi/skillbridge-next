import type { ReactNode } from "react";
import { FadeUp } from "@/components/motion";
import { cn } from "@/lib/utils";

/** Dashboard page header: eyebrow + title + subtitle + optional actions. */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <FadeUp
      className={cn(
        "flex flex-wrap items-end justify-between gap-4 border-b border-card-border pb-6",
        className
      )}
    >
      <div>
        {eyebrow && <p className="label-mono">{eyebrow}</p>}
        <h1 className="display mt-2 text-3xl sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 text-gray-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </FadeUp>
  );
}

/** Editorial section header — mono eyebrow + display title. */
export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <FadeUp
      className={cn(
        "mb-5 flex items-end justify-between gap-4",
        className
      )}
    >
      <div>
        {eyebrow && <p className="label-mono-muted">{eyebrow}</p>}
        <h2 className="display mt-1.5 text-2xl font-semibold text-gray-900">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </FadeUp>
  );
}

/** Compact stat tile with an icon — agency glass with a soft purple signal. */
export function StatCard({
  icon: Icon,
  label,
  value,
  accent = "text-primary",
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
  accent?: string;
  className?: string;
}) {
  const numeric = typeof value === "number" ? value : null;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-card-border bg-white/70 p-5 shadow-soft backdrop-blur-xl transition-all duration-300 hover:shadow-soft-lg",
        className
      )}
    >
      {/* sheen hairline on the glass edge */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
      {/* faint purple aura that blooms on hover (signal only) */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10",
            accent
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className={cn("display mt-3 text-3xl", accent)}>
        {numeric !== null ? (
          <CountUpValue value={numeric} />
        ) : (
          value
        )}
      </p>
    </div>
  );
}

/** Small client wrapper so the count-up only animates in a browser. */
import { CountUp } from "@/components/motion";
function CountUpValue({ value }: { value: number }) {
  return <CountUp value={value} />;
}
