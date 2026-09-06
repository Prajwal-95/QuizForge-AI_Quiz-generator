import { motion } from "../motion";
import type { View, SessionUser } from "../types";
import { Menu, LogIn, Moon, Sun, Settings, Sparkles } from "lucide-react";

/* ── Topbar — page title, live status, theme + account actions ── */

const TITLES: Record<View, { kicker: string; title: string }> = {
  dashboard: { kicker: "Workspace", title: "Assessment control center" },
  create: { kicker: "Create", title: "Build a sharper quiz" },
  quiz: { kicker: "In progress", title: "Take the assessment" },
  result: { kicker: "Complete", title: "Result breakdown" },
  bank: { kicker: "Library", title: "Question bank" },
  history: { kicker: "Sessions", title: "Quiz history" },
  help: { kicker: "Guide", title: "Help & quick start" },
  about: { kicker: "Product", title: "About QuizForge AI" },
  "my-quizzes": { kicker: "Workspace", title: "Your quizzes" },
  quizzes: { kicker: "Workspace", title: "Your quizzes" },
  results: { kicker: "Sessions", title: "Results & attempts" },
  attempt: { kicker: "Sessions", title: "Attempt detail" },
  "attempt-detail": { kicker: "Sessions", title: "Attempt detail" },
  analytics: { kicker: "Insights", title: "Analytics" },
};

export function Topbar({
  view,
  live,
  dark,
  user,
  onTheme,
  onSettings,
  onAuth,
  onMenu,
}: {
  view: View;
  live: boolean;
  dark: boolean;
  user: SessionUser;
  onTheme: () => void;
  onSettings: () => void;
  onAuth: () => void;
  onMenu: () => void;
}) {
  const { kicker, title } = TITLES[view];
  return (
    <header className="topbar">
      <div className="topbar-left">
        <motion.button className="icon-button mobile-toggle" aria-label="Open navigation" onClick={onMenu} whileTap={{ scale: 0.94 }}>
          <Menu size={18} />
        </motion.button>
        <div className="topbar-title">
          <span className="eyebrow">
            {view === "dashboard" ? (
              <span className="topbar-eyebrow-inline"><Sparkles size={11} /> {kicker}</span>
            ) : (
              kicker
            )}
          </span>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="topbar-actions">
        <span className={live ? "status-chip live" : "status-chip"}><span />{live ? "Live" : "Demo"}</span>
        <motion.button className="icon-button" aria-label="Toggle theme" onClick={onTheme} whileTap={{ scale: 0.94 }}>
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </motion.button>
        <motion.button className="icon-button" aria-label="Settings" onClick={onSettings} whileTap={{ scale: 0.94 }}>
          <Settings size={16} />
        </motion.button>
        {user ? (
          <motion.button className="topbar-account" onClick={onAuth} aria-label="Account" whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>
            <span className="account-avatar small">{user.name.trim().charAt(0).toUpperCase() || "U"}</span>
            <span>{user.name.split(" ")[0]}</span>
          </motion.button>
        ) : (
          <motion.button className="topbar-signin" onClick={onAuth} aria-label="Sign in" whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>
            <LogIn size={15} /> Sign in
          </motion.button>
        )}
      </div>
    </header>
  );
}
