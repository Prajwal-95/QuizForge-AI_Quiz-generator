import { useMemo } from "react";

/* Lightweight dependency-free SVG charts for the analytics views. */

const PALETTE = ["#10B981", "#0D9488", "#F0FDF4", "#046307", "#14B8A6", "#064E3B"];

export function BarChart({
  items,
  color = "#046307",
  horizontal = false,
  height = 180,
}: {
  items: Array<{ label: string; value: number }>;
  color?: string;
  horizontal?: boolean;
  height?: number;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const maxLabel = Math.max(...items.map((i) => i.label.length));

  if (horizontal) {
    return (
      <div className="chart chart-horizontal" style={{ height }}>
        {items.map((item, idx) => (
          <div className="chart-row" key={idx}>
            <span className="chart-row-label" title={item.label}>{item.label}</span>
            <div className="chart-track">
              <div
                className="chart-bar-h"
                style={{ width: `${Math.max(2, (item.value / max) * 100)}%`, background: Array.isArray(color) ? color[idx % color.length] : color }}
              />
            </div>
            <span className="chart-row-value">{item.value}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="chart chart-vertical" style={{ height }}>
      <div className="chart-bars">
        {items.map((item, idx) => (
          <div className="chart-col" key={idx}>
            <span className="chart-col-value">{item.value}</span>
            <div
              className="chart-bar-v"
              style={{
                height: `${Math.max(4, (item.value / max) * 100)}%`,
                background: Array.isArray(color) ? color[idx % color.length] : color,
              }}
              title={`${item.label}: ${item.value}`}
            />
            <span className="chart-col-label" title={item.label}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LineChart({
  items,
  color = "#046307",
  height = 160,
}: {
  items: Array<{ date: string; count: number }>;
  color?: string;
  height?: number;
}) {
  const paths = useMemo(() => {
    if (!items.length) return null;
    const w = Math.max(220, items.length * 44);
    const h = height - 26;
    const max = Math.max(1, ...items.map((i) => i.count));
    const stepX = items.length > 1 ? w / (items.length - 1) : w;
    const points = items.map((d, i) => ({
      x: i * stepX,
      y: h - (d.count / max) * (h - 8) - 4,
    }));
    const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    const area = `${line} L${points[points.length - 1].x},${h} L${points[0].x},${h} Z`;
    return { points, line, area, w, h };
  }, [items, height]);

  if (!items.length || !paths) {
    return <div className="chart-empty">No submissions yet</div>;
  }

  return (
    <div className="chart chart-line">
      <svg viewBox={`0 0 ${paths.w} ${height}`} preserveAspectRatio="none" style={{ width: "100%", height }}>
        <defs>
          <linearGradient id="linefill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={paths.area} fill="url(#linefill)" />
        <path d={paths.line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {paths.points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke={color} strokeWidth="2" />
        ))}
      </svg>
      <div className="chart-line-labels">
        {items.map((d, i) => (
          <span key={i}>{new Date(d.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
        ))}
      </div>
    </div>
  );
}

export function DonutChart({
  value,
  size = 120,
  color = "#046307",
  label = "",
}: {
  value: number;
  size?: number;
  color?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const circumference = 2 * Math.PI * (size / 2 - 8);
  const offset = circumference - (pct / 100) * circumference;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut-chart">
      <circle cx={size / 2} cy={size / 2} r={size / 2 - 8} fill="none" stroke="var(--border)" strokeWidth="9" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2 - 8}
        fill="none"
        stroke={color}
        strokeWidth="9"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="donut-value">
        {pct}%
      </text>
      {label && (
        <text x="50%" y="66%" textAnchor="middle" dominantBaseline="central" className="donut-label">
          {label}
        </text>
      )}
    </svg>
  );
}

export const chartColors = PALETTE;
