import { motion } from "../motion";
import type { View, SessionUser } from "../types";
import {
  LayoutDashboard,
  Plus,
  Library,
  BarChart3,
  Settings,
  CircleHelp,
  Info,
  LogIn,
  Sparkles,
  FolderOpen,
} from "lucide-react";

/* ── Brand mark — consistent "QuizForge AI" wordmark ────────── */

export function BrandMark({ onClick, size = "md" }: { onClick?: () => void; size?: "sm" | "md" }) {
  return (
    <div
      className={`brand brand-${size}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      <span className="brand-mark">Q</span>
      <span className="brand-name">
        <strong>
          <span className="sb-quiz">Quiz</span><span className="sb-forge">forge</span>&nbsp;<span className="sb-ai">AI</span>
        </strong>
        <span className="brand-tag">Assessment suite</span>
      </span>
    </div>
  );
}

/* ── Nav item with animated active indicator ────────────────── */

function NavItem({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      className={active ? "nav-item active" : "nav-item"}
      onClick={onClick}
      whileHover={{ x: 3 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 26 }}
      layout
    >
      <span className="nav-item-icon">{icon}</span>
      <span className="nav-item-label">{label}</span>
      {active && <motion.span layoutId="nav-active-pill" className="nav-active-pill" />}
    </motion.button>
  );
}

/* ── Sectioned navigation ───────────────────────────────────── */

export function SidebarLinks({
  view,
  onNavigate,
  onOpenSettings,
  onOpenAnalytics,
}: {
  view: View;
  onNavigate: (view: View) => void;
  onOpenSettings: () => void;
  onOpenAnalytics: () => void;
}) {
  return (
    <div className="sidebar-scroll">
      <div className="sidebar-group">
        <span className="sidebar-kicker">Overview</span>
        <NavItem label="Dashboard" icon={<LayoutDashboard size={18} />} active={view === "dashboard"} onClick={() => onNavigate("dashboard")} />
        <NavItem label="My Quizzes" icon={<FolderOpen size={18} />} active={view === "quizzes" || view === "my-quizzes"} onClick={() => onNavigate("quizzes")} />
        <NavItem label="Analytics" icon={<BarChart3 size={18} />} active={view === "analytics"} onClick={onOpenAnalytics} />
      </div>
      <div className="sidebar-group">
        <span className="sidebar-kicker">Create</span>
        <NavItem label="Create Quiz" icon={<Plus size={18} />} active={view === "create"} onClick={() => onNavigate("create")} />
        <NavItem label="Question Bank" icon={<Library size={18} />} active={view === "bank"} onClick={() => onNavigate("bank")} />
      </div>
      <div className="sidebar-group">
        <span className="sidebar-kicker">Manage</span>
        <NavItem label="AI Suite" icon={<Sparkles size={18} />} active={view === "create" || view === "bank"} onClick={() => onNavigate("create")} />
        <NavItem label="History" icon={<BarChart3 size={18} />} active={view === "history"} onClick={() => onNavigate("history")} />
        <NavItem label="Settings" icon={<Settings size={18} />} active={false} onClick={onOpenSettings} />
      </div>
      <div className="sidebar-group">
        <span className="sidebar-kicker">Learn</span>
        <NavItem label="Help" icon={<CircleHelp size={18} />} active={view === "help"} onClick={() => onNavigate("help")} />
        <NavItem label="About" icon={<Info size={18} />} active={view === "about"} onClick={() => onNavigate("about")} />
      </div>
    </div>
  );
}

export function Sidebar({
  view,
  live,
  user,
  onNavigate,
  onOpenSettings,
  onOpenAnalytics,
  onAuth,
}: {
  view: View;
  live: boolean;
  user: SessionUser;
  onNavigate: (view: View) => void;
  onOpenSettings: () => void;
  onOpenAnalytics: () => void;
  onAuth: () => void;
}) {
  return (
    <motion.aside
      className="sidebar"
      initial={{ x: -16, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 26 }}
    >
      <BrandMark onClick={() => onNavigate("dashboard")} />
      <motion.div
        className="brand-account"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, type: "spring", stiffness: 260, damping: 22 }}
      >
        {user ? (
          <motion.button className="account-chip signed" onClick={onAuth} aria-label="Account" whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
            <span className="account-avatar">{user.name.trim().charAt(0).toUpperCase() || "U"}</span>
            <span className="account-meta">
              <strong>{user.name}</strong>
              <small>{user.provider} · signed in</small>
            </span>
          </motion.button>
        ) : (
          <motion.button className="account-chip" onClick={onAuth} aria-label="Sign in to QuizForge AI" whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
            <LogIn size={15} />
            <span className="account-meta">
              <strong>Sign in</strong>
              <small>Connect an account</small>
            </span>
          </motion.button>
        )}
      </motion.div>
      <SidebarLinks view={view} onNavigate={onNavigate} onOpenSettings={onOpenSettings} onOpenAnalytics={onOpenAnalytics} />
      <motion.div className="sidebar-footer" layout>
        <span className={live ? "signal live" : "signal"}><span /> {live ? "Connected" : "Demo mode"}</span>
        <span className="version-text">local environment</span>
      </motion.div>
    </motion.aside>
  );
}
