import { useEffect, useState } from "react";
import { motion, staggerContainer, staggerItem, springSoft } from "../motion";
import { Metric } from "./shared";
import { StatCard, Skeleton } from "./ui";
import Hero3D from "../Scene3D";
import type { Metrics, QuizSummary, SessionUser } from "../types";
import { listMyQuizzes } from "../api";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Clock3,
  Library,
  Gauge,
  Activity,
  Users,
  Zap,
  UploadCloud,
  Link2,
  LogIn,
  Sparkles,
  PlusCircle,
  Target,
  TrendingUp,
} from "lucide-react";

/* â”€â”€ Pipeline status (dashboard) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function Pipeline({ live, online }: { live: boolean; online: boolean }) {
  const items = [
    { label: "Source material", value: "Ready" },
    { label: "AI generator", value: !online ? "Offline" : live ? "Online" : "Demo" },
    { label: "Validation", value: !online ? "Paused" : live ? "Strict" : "Simulated" },
    { label: "Answer keys", value: "Exact match" },
  ];
  return (
    <div className="pipeline-card surface">
      <h4>Pipeline status</h4>
      <div className="pipeline-row">
        {items.map((item) => (
          <div className="pipeline-item" key={item.label}>
            <span className="metric-icon"><Activity size={16} /></span>
            <div>
              <span className="metric-detail">{item.label}</span>
              <span className="metric-value small">{item.value}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="stacking-note">All stages run in sequence: extraction â†’ generation â†’ validation â†’ delivery.</p>
    </div>
  );
}

/* â”€â”€ Knowledge chain â€” signature emerald visual â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function KnowledgeChain() {
  const steps = [
    { key: "?", label: "Question" },
    { key: "â—ˆ", label: "Knowledge" },
    { key: "Q", label: "Quiz" },
    { key: "âœ“", label: "Assessment" },
    { key: "â—†", label: "Insight" },
  ];
  return (
    <motion.section
      className="knowledge-chain-wrap surface"
      initial="hidden"
      animate="show"
      variants={staggerContainer}
      aria-label="How QuizForge AI works"
    >
      <div className="section-head">
        <div>
          <span className="eyebrow">Pipeline</span>
          <h3 className="section-title">From knowledge to insight</h3>
        </div>
      </div>
      <div className="knowledge-chain">
        {steps.map((s, i) => (
          <motion.div
            key={s.key}
            variants={staggerItem}
            className="chain-item"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            {i > 0 && <span className="chain-link" aria-hidden />}
            <div className="chain-node">
              <span className="chain-ring">{s.key}</span>
              <label>{s.label}</label>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

/* â”€â”€ Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export function Dashboard({
  metrics,
  live,
  online,
  dark,
  user,
  onCreateQuiz,
  onOpenBank,
  onOpenQuizzes,
  onOpenQuiz,
  onAuth,
  refreshKey,
}: {
  metrics: Metrics;
  live: boolean;
  online: boolean;
  dark: boolean;
  user: SessionUser;
  onCreateQuiz: () => void;
  onOpenBank: () => void;
  onOpenQuizzes: () => void;
  onOpenQuiz: (id: number) => void;
  onAuth: () => void;
  refreshKey: number;
}) {
  const [quizzes, setQuizzes] = useState<QuizSummary[] | null>(null);

  useEffect(() => {
    if (!user) {
      setQuizzes([]);
      return;
    }
    let cancelled = false;
    listMyQuizzes()
      .then((qs) => {
        if (!cancelled) setQuizzes(qs);
      })
      .catch(() => {
        if (!cancelled) setQuizzes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user, refreshKey]);
  const sources = [
    { icon: <Zap size={18} />, label: "Topic" },
    { icon: <UploadCloud size={18} />, label: "Document" },
    { icon: <Link2 size={18} />, label: "Website" },
  ];
  const items = [
    { label: "Source material", value: "Ready" },
    { label: "AI generator", value: !online ? "Offline" : live ? "Online" : "Demo" },
    { label: "Validation", value: !online ? "Paused" : live ? "Strict" : "Simulated" },
    { label: "Answer keys", value: "Exact match" },
  ];



  return (
    <div className="page dashboard-page">
      <motion.section
        className="site-brand-banner"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springSoft }}
      >
        <div className="site-brand-title">
          <span className="sb-quiz">Quiz</span>
          <span className="sb-forge">forge</span>
          <span className="sb-ai">AI</span>
        </div>
        <p className="site-brand-tagline">Turn any material into a smarter quiz.</p>
      </motion.section>

      <section className="dashboard-hero surface">
        <div className="hero3d-shell">
          <Hero3D dark={dark} />
        </div>

        <div className="hero-content">
          <motion.span
            className="eyebrow"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springSoft }}
          >
            AI-powered assessment generation
          </motion.span>
          <motion.h2
            className="hero-title"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06, ...springSoft }}
          >
            Turn any material into a{" "}
            <span className="gradient-text">smarter quiz.</span>
          </motion.h2>
          <motion.p
            className="hero-sub"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, ...springSoft }}
          >
            QuizForge AI turns topics, documents, and web pages into
            curriculum-aligned assessments in seconds.
          </motion.p>
          <motion.div
            className="hero-actions"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, ...springSoft }}
          >
            <button className="btn-3d btn-primary btn-lg" onClick={onCreateQuiz}>
              <span className="btn-leading"><Zap size={17} /></span>
              <span className="btn-label">Get started</span>
            </button>
            <button className="btn-3d btn-ghost btn-lg" onClick={onOpenBank}>
              <span className="btn-label">View question bank</span>
              <span className="btn-leading"><ArrowRight size={16} /></span>
            </button>
          </motion.div>
        </div>

        <div className="hero-sources">
          <span className="hero-sources-label">From</span>
          {sources.map((s, i) => (
            <motion.span
              className="hero-source-chip"
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 + i * 0.05, ...springSoft }}
            >
              {s.icon} {s.label}
            </motion.span>
          ))}
        </div>
      </section>

      <motion.section className="dashboard-greeting" initial="hidden" animate="show" variants={staggerContainer}>
        <motion.div variants={staggerItem} className="greeting-head">
          <div>
            <span className="eyebrow">Dashboard</span>
            <h1 className="greeting-title">
              {user ? <>Welcome back, <span className="gradient-text">{user.name.split(" ")[0]}</span></> : <>Welcome to <span className="gradient-text">QuizForge AI</span></>}
            </h1>
            <p className="greeting-sub">Here's what's happening with your quizzes.</p>
          </div>
        </motion.div>

        <motion.div variants={staggerItem} className="greeting-actions">
          <motion.button className="btn-3d btn-primary btn-lg" onClick={onCreateQuiz} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
            <span className="btn-leading"><PlusCircle size={17} /></span>
            <span className="btn-label">Create New Quiz</span>
          </motion.button>
          <motion.button className="btn-3d btn-success btn-lg" onClick={onCreateQuiz} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
            <span className="btn-leading"><Sparkles size={17} /></span>
            <span className="btn-label">Generate with AI</span>
          </motion.button>
        </motion.div>

        <motion.div variants={staggerItem} className="metrics-grid">
          <StatCard
            icon={<Library size={20} />}
            value={metrics.total_quizzes ?? 0}
            label="Total Quizzes"
            detail="Created by you"
            trend={{ dir: "up", text: "live" }}
          />
          <StatCard
            icon={<Users size={20} />}
            value={metrics.total_students ?? 0}
            label="Students Reached"
            detail="Across all attempts"
            tone="accent"
          />
          <StatCard
            icon={<Activity size={20} />}
            value={metrics.total_attempts ?? 0}
            label="Total Attempts"
            detail="Completed submissions"
            tone="gold"
          />
          <StatCard
            icon={<Gauge size={20} />}
            value={Math.round(metrics.average_score ?? 0)}
            suffix="%"
            label="Average Score"
            detail="Across all attempts"
            tone="accent"
          />
        </motion.div>
      </motion.section>

      <motion.section className="dashboard-two-col" initial="hidden" animate="show" variants={staggerContainer}>
        <motion.div variants={staggerItem} className="insights-strip">
          <div className="insights-card">
            <span className="insights-icon"><Target size={18} /></span>
            <div>
              <span className="metric-label">Focus area</span>
              <span className="insights-value">{metrics.weakest_topic ?? "No data yet"}</span>
              <span className="metric-detail">
                {metrics.weakest_topic
                  ? "Lowest-accuracy topic. Focus here to raise your average."
                  : "Generate and complete a quiz to highlight your weakest topic."}
              </span>
            </div>
          </div>
          <div className="insights-card">
            <span className="insights-icon accent"><TrendingUp size={18} /></span>
            <div>
              <span className="metric-label">Pipeline status</span>
              <span className="insights-value">{!online ? "Service offline" : live ? "All systems online" : "Demo mode"}</span>
              <span className="metric-detail">Extraction â†’ generation â†’ validation â†’ delivery.</span>
            </div>
          </div>
        </motion.div>

        <motion.div variants={staggerItem} className="pipeline-card">
          <h4 className="metric-label" style={{ marginBottom: 12 }}>Pipeline status</h4>
          <div className="pipeline-row">
            {items.map((item) => (
              <div className="pipeline-item" key={item.label}>
                <span className="metric-icon"><Activity size={16} /></span>
                <div>
                  <span className="metric-detail">{item.label}</span>
                  <span className="metric-value small">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.section>

      <motion.section
        className="dashboard-quizzes"
        initial="hidden"
        animate="show"
        variants={staggerContainer}
      >
        <div className="section-head">
          <div>
            <span className="eyebrow">Your quizzes</span>
            <h3 className="section-title">Live quizzes</h3>
          </div>
          <button className="btn-3d btn-ghost btn-sm" onClick={onOpenQuizzes}>
            View all <ArrowRight size={14} />
          </button>
        </div>

        {!user ? (
          <div className="surface dashboard-empty">
            <p className="field-hint">
              Sign in to view and manage your quizzes.
            </p>
            <button className="btn-3d btn-primary btn-md" onClick={onAuth}>
              <span className="btn-leading"><LogIn size={16} /></span>
              <span className="btn-label">Sign in</span>
            </button>
          </div>
        ) : quizzes === null ? (
          <div className="quiz-card-grid skeleton-grid" role="status" aria-label="Loading quizzes">
            {[0, 1, 2].map((i) => (
              <div className="quiz-card skeleton-card" key={i}>
                <Skeleton style={{ height: 22, width: "55%", marginBottom: 10 }} />
                <Skeleton style={{ height: 16, width: "88%", marginBottom: 8 }} />
                <Skeleton style={{ height: 16, width: "70%" }} />
              </div>
            ))}
          </div>
        ) : quizzes.length === 0 ? (
          <div className="surface dashboard-empty">
            <p className="field-hint">
              No quizzes yet. Create your first quiz â€” it only takes a minute.
            </p>
            <button className="btn-3d btn-primary btn-md" onClick={onCreateQuiz}>
              <span className="btn-leading"><Zap size={16} /></span>
              <span className="btn-label">Create a quiz</span>
            </button>
          </div>
        ) : (
          <div className="quiz-card-grid">
            {quizzes.slice(0, 6).map((q) => (
              <motion.div
                key={q.id}
                className="quiz-card surface"
                variants={staggerItem}
                whileHover={{ y: -3 }}
              >
                <div className="quiz-card-top">
                  <span className="chip">{q.subject || "General"}</span>
                  <span className={`chip ${q.status === "published" ? "ok" : ""}`}>{q.status}</span>
                </div>
                <h4 className="quiz-card-title">{q.title}</h4>
                <div className="quiz-card-meta">
                  <span><BookOpen size={14} /> {q.question_count ?? 0} questions</span>
                  <span><Users size={14} /> {q.attempts ?? 0} attempts</span>
                  {q.average_score != null && <span><Gauge size={14} /> {q.average_score}% avg</span>}
                </div>
                <div className="quiz-card-actions">
                  <button className="btn-3d btn-ghost btn-sm" onClick={() => onOpenQuiz(q.id)}>
                    View results <ArrowUpRight size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.section>

      <KnowledgeChain />
    </div>
  );
}
