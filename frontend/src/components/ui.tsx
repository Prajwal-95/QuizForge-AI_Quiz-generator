import { motion, usePrefersReducedMotion, springTap, CountUp } from "../motion";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/* ════════════════════════════════════════════════════════════════
   Shared UI primitives — premium design-system building blocks.
   Compose these across every screen for a consistent, polished look.
   ════════════════════════════════════════════════════════════════ */

/* ── 3D Button (extended variants) ────────────────────────────── */

type Variant = "primary" | "secondary" | "success" | "warning" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

interface Button3DProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  leading?: ReactNode;
}

export function Button3D({
  variant = "primary",
  size = "md",
  full = false,
  leading,
  className = "",
  children,
  ...props
}: Button3DProps) {
  const cls = ["btn-3d", `btn-${variant}`, `btn-${size}`, full ? "btn-full" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <motion.button
      className={cls}
      whileTap={{ scale: 0.97, y: 1 }}
      transition={springTap}
      {...(props as object)}
    >
      {leading && <span className="btn-leading">{leading}</span>}
      <span className="btn-label">{children}</span>
    </motion.button>
  );
}

/* ── Icon 3D button ───────────────────────────────────────────── */

interface Icon3DProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

export function Icon3D({ label, className = "", children, ...props }: Icon3DProps) {
  return (
    <motion.button
      aria-label={label}
      title={label}
      className={`icon-3d ${className}`.trim()}
      whileTap={{ scale: 0.93 }}
      transition={springTap}
      {...(props as object)}
    >
      {children}
    </motion.button>
  );
}

/* ── Glass card ───────────────────────────────────────────────── */

export function GlassCard({
  className = "",
  children,
  ...props
}: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`glass-card ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

/* ── Glass panel (larger surface) ─────────────────────────────── */

export function GlassPanel({
  className = "",
  children,
  ...props
}: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`glass-card glass-panel ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

/* ── 3D tilt card — subtle cursor-aware tilt (mouse only) ─────── */

export function TiltCard({
  className = "",
  children,
  ...props
}: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <motion.div
      className={`tilt-card ${className}`.trim()}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      {...(props as object)}
    >
      {children}
    </motion.div>
  );
}

/* ── Badge ────────────────────────────────────────────────────── */

export function Badge({
  tone = "brand",
  children,
}: {
  tone?: "brand" | "accent" | "gold" | "danger" | "muted";
  children: ReactNode;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

/* ── Stat card — premium KPI tile with animated count-up ──────── */

export function StatCard({
  icon,
  value,
  suffix = "",
  label,
  detail,
  trend,
  tone = "brand",
}: {
  icon: ReactNode;
  value: number | string;
  suffix?: string;
  label: string;
  detail: string;
  trend?: { dir: "up" | "down" | "flat"; text: string };
  tone?: "brand" | "accent" | "gold";
}) {
  const numeric = typeof value === "number";
  const reduced = usePrefersReducedMotion();
  return (
    <motion.div
      className={`stat-card stat-${tone}`}
      whileHover={reduced ? undefined : { y: -5 }}
      transition={springTap}
    >
      <span className="stat-icon">{icon}</span>
      <span className="stat-value">
        {numeric ? <CountUp to={value as number} suffix={suffix} /> : `${value}${suffix}`}
      </span>
      <span className="stat-label">{label}</span>
      <span className="stat-foot">
        <span className="stat-detail">{detail}</span>
        {trend && (
          <span className={`stat-trend trend-${trend.dir}`}>
            {trend.dir === "up" ? "▲" : trend.dir === "down" ? "▼" : "•"} {trend.text}
          </span>
        )}
      </span>
    </motion.div>
  );
}

/* ── Skeleton ─────────────────────────────────────────────────── */

export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`skeleton ${className}`.trim()} style={style} aria-hidden />;
}

/* ── Section heading ──────────────────────────────────────────── */

export function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-head">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h3 className="section-title">{title}</h3>
      </div>
      {action}
    </div>
  );
}