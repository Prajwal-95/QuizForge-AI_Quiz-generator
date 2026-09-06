import { motion, CountUp } from "../motion";
import { CircleHelp, Trophy, X } from "lucide-react";

/* ── Error banner ────────────────────────────────────────────── */

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="error-banner" role="alert">
      <span className="error-icon"><CircleHelp size={16} /></span>
      <span>{message}</span>
      <button className="icon-button" aria-label="Dismiss error" onClick={onDismiss}><X size={16} /></button>
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────────────── */

export function Empty({
  title,
  body,
  ctaLabel,
  onClick,
}: {
  title: string;
  body: string;
  ctaLabel?: string;
  onClick?: () => void;
}) {
  return (
    <div className="empty-state">
      <Trophy size={40} />
      <h2>{title}</h2>
      <p>{body}</p>
      {ctaLabel && onClick && <button className="btn-3d btn-primary btn-md" onClick={onClick}>{ctaLabel}</button>}
    </div>
  );
}

/* ── Metric card ─────────────────────────────────────────────── */

export function Metric({
  icon,
  value,
  label,
  detail,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  detail: string;
}) {
  const numeric = typeof value === "number";
  return (
    <motion.div className="metric-card surface" whileHover={{ y: -3 }} transition={springMediumPreset}>
      <span className="metric-icon">{icon}</span>
      <div>
        <span className="metric-value">{numeric ? <CountUp to={value as number} /> : value}</span>
        <span className="metric-label">{label}</span>
        <span className="metric-detail">{detail}</span>
      </div>
    </motion.div>
  );
}

const springMediumPreset = { type: "spring" as const, stiffness: 300, damping: 22 };
