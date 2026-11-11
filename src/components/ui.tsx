import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, CheckCircle2, Info, Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
const base = "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50";
const variants: Record<Variant, string> = {
  primary: "bg-brand text-white shadow-sm hover:bg-brand-navy hover:shadow-md",
  secondary: "border border-[var(--line)] bg-white text-brand-ink hover:border-brand/40 hover:bg-[var(--surface)]",
  ghost: "text-brand-ink hover:bg-[var(--surface)]",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

export function Button({ variant = "primary", loading, className, children, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button {...p} disabled={p.disabled || loading} className={clsx(base, variants[variant], className)}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function LinkButton({ href, variant = "primary", className, children }: { href: string; variant?: Variant; className?: string; children: ReactNode }) {
  return <Link href={href} className={clsx(base, variants[variant], className)}>{children}</Link>;
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={clsx("rounded-2xl border border-[var(--line)] bg-white shadow-card", className)}>{children}</section>;
}

export function CardHeader({ title, action, subtitle }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-6 py-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const sev: Record<string, string> = {
  critical: "bg-red-600 text-white",
  high: "bg-orange-100 text-orange-900 ring-1 ring-orange-300",
  medium: "bg-brand-yellow/40 text-brand-ink ring-1 ring-brand-yellow",
  low: "bg-slate-100 text-slate-700",
};
export function SeverityBadge({ severity }: { severity: string }) {
  return <span className={clsx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", sev[severity] ?? sev.low)}>{severity}</span>;
}

const tone: Record<string, string> = {
  blue: "bg-brand/10 text-brand", navy: "bg-brand-navy text-white", yellow: "bg-brand-yellow text-brand-ink", gray: "bg-slate-100 text-slate-700",
  green: "bg-emerald-100 text-emerald-800", red: "bg-red-100 text-red-800",
};
export function Badge({ tone: t = "gray", children }: { tone?: keyof typeof tone; children: ReactNode }) {
  return <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", tone[t])}>{children}</span>;
}
export const DemoBadge = () => <Badge tone="yellow">Demo data</Badge>;

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, keyof typeof tone> = { draft: "gray", active: "green", completed: "blue", archived: "gray", applied: "green", approved: "blue", rejected: "red", failed: "red" };
  return <Badge tone={map[status] ?? "gray"}>{status}</Badge>;
}

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function Alert({ tone: t = "info", children }: { tone?: "info" | "error" | "success" | "warn"; children: ReactNode }) {
  const styles = { info: "border-brand/30 bg-brand/5", error: "border-red-300 bg-red-50 text-red-900", success: "border-emerald-300 bg-emerald-50 text-emerald-900", warn: "border-brand-yellow bg-brand-yellow/20" };
  const Icon = t === "error" || t === "warn" ? AlertTriangle : t === "success" ? CheckCircle2 : Info;
  return (
    <div role={t === "error" ? "alert" : "status"} className={clsx("flex gap-3 rounded-xl border p-3.5 text-sm", styles[t])}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="px-6 py-14 text-center">
      <div aria-hidden className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-yellow"><span className="block h-3 w-3 rounded-full bg-brand" /></div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{body}</p>
      {action && <div className="mt-5 flex justify-center gap-2">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, tone: t }: { label: string; value: ReactNode; hint?: string; tone?: "red" }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white px-5 py-4 shadow-card">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={clsx("mt-1 text-3xl font-bold tabular-nums", t === "red" && "text-red-600")}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return <div role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />{label}…</div>;
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
