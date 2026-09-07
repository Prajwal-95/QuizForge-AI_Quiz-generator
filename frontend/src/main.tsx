import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, motion } from "framer-motion";
import { usePrefersReducedMotion } from "./motion";
import { BrowserRouter, Route, Routes, useMatch, useLocation, useNavigate } from "react-router-dom";

import "./styles.css";
import "./premium.css";

import type { Metrics, SessionUser, View } from "./types";
import { checkHealth, clearSession, getMetrics, getRuntime, getStoredUser } from "./api";

import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { Dashboard } from "./components/Dashboard";
import { LoadingScreen } from "./components/LoadingScreen";
import { LoginModal } from "./components/LoginModal";
import { QuizCreator } from "./components/QuizCreator";
import { QuizWorkspace } from "./components/QuizWorkspace";
import { QuizResults } from "./components/QuizResults";
import { QuizAnalyticsPanel } from "./components/QuizAnalytics";
import { AttemptDetailPanel } from "./components/AttemptDetail";
import { StudentQuiz } from "./components/StudentQuiz";
import { SimplePage } from "./components/SimplePage";
import { ToastProvider } from "./components/Toast";

/* ── App shell: sidebar + topbar + routed pages ──────────────── */

/* ── Ambient floating light particles (global cinematic layer) ─ */
function CinematicParticles() {
  const reduced = usePrefersReducedMotion();
  if (reduced || typeof window === "undefined") return null;
  const count = window.innerWidth < 700 ? 16 : 26;
  return (
    <div className="cinematic-particles" aria-hidden>
      {Array.from({ length: count }).map((_, i) => {
        const left = Math.random() * 100;
        const duration = 14 + Math.random() * 14;
        const delay = -Math.random() * 30;
        const dx = (Math.random() - 0.5) * 60;
        return (
          <i
            key={i}
            style={{
              left: `${left}%`,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
              ["--dx" as string]: `${dx}px`,
            }}
          />
        );
      })}
    </div>
  );
}

function AppShell() {
  const [live, setLive] = useState(true);
  const [online, setOnline] = useState(true);
  const [dark, setDark] = useState(false);
  const [user, setUser] = useState<SessionUser>(getStoredUser);
  const [showingAuth, setShowingAuth] = useState(false);
  const [view, setView] = useState<View>("dashboard");
  const [metrics, setMetrics] = useState<Metrics>({});
  const [activeQuizId, setActiveQuizId] = useState<number | null>(null);
  const [activeAttemptId, setActiveAttemptId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Two independent signals decide the status badge:
    //  - online  → /health reachable (backend woke up, not cold-starting)
    //  - live    → /health/runtime reports the Groq provider is configured.
    // "Demo mode" only appears when the backend is UP but has no GROQ_API_KEY;
    // a sleeping/cold-starting backend shows "Offline", and a live provider
    // shows "Connected". Re-check on an interval so a transient 503 on load
    // never permanently locks the UI into a stale status.
    let cancelled = false;
    const probe = async () => {
      const up = await checkHealth();
      if (cancelled) return;
      setOnline(up);
      const rt = await getRuntime();
      if (cancelled) return;
      if (rt) setLive(rt.live);
      else setLive(false); // stale backend (no /runtime) or demo provider
    };
    probe();
    const id = window.setInterval(probe, 30_000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  useEffect(() => {
    if (!user || view !== "dashboard") return;
    let cancelled = false;
    getMetrics()
      .then((m) => { if (!cancelled) setMetrics(m); })
      .catch(() => setUser(getStoredUser));
    return () => { cancelled = true; };
  }, [user, view, refreshKey]);

  useEffect(() => {
    // When any guarded request comes back 401, the session is wiped —
    // bounce the user to the sign-in modal instead of leaving a dead dashboard.
    const onUnauthorized = () => {
      setUser(null);
      setShowingAuth(true);
    };
    window.addEventListener("quizforge:unauthorized", onUnauthorized);
    return () => window.removeEventListener("quizforge:unauthorized", onUnauthorized);
  }, []);

  function navigateTo(next: View) {
    setView(next);
    setMenuOpen(false);
  }

  function signOut() {
    clearSession();
    setUser(null);
    setMetrics({});
  }

  function renderContent() {
    switch (view) {
      case "dashboard":
        return (
          <Dashboard
            metrics={metrics}
            user={user}
            live={live}
            online={online}
            dark={dark}
            onCreateQuiz={() => navigateTo("create")}
            onOpenBank={() => navigateTo("bank")}
            onOpenQuizzes={() => navigateTo("quizzes")}
            onOpenQuiz={(id) => { setActiveQuizId(id); navigateTo("results"); }}
            onAuth={() => setShowingAuth(true)}
            refreshKey={refreshKey}
          />
        );
      case "quizzes":
        return (
          <QuizWorkspace
            refreshKey={refreshKey}
            onNew={() => { setActiveQuizId(null); navigateTo("create"); }}
            user={user}
            onResults={(id) => { setActiveQuizId(id); setActiveAttemptId(null); navigateTo("results"); }}
            onAnalytics={(id) => { setActiveQuizId(id); navigateTo("analytics"); }}
            onAuth={() => setShowingAuth(true)}
          />
        );
      case "create":
        return (
          <QuizCreator
            onDone={() => { setActiveQuizId(null); setRefreshKey((k) => k + 1); navigateTo("quizzes"); }}
          />
        );
      case "bank":
        return (
          <SimplePage
            eyebrow="Library"
            title="Question bank"
            body="The shared question bank is not part of the public quiz flow. Create a quiz to build a question set and share it with students."
          />
        );
      case "history":
        return (
          <SimplePage
            eyebrow="Sessions"
            title="Quiz history"
            body="Open a quiz and choose Results to see every student attempt and its score."
          />
        );
      case "help":
        return (
          <SimplePage
            eyebrow="Guide"
            title="Help & quick start"
            body="QuizForge AI turns a topic into a shareable quiz in minutes. Build a quiz, publish it for a unique link, and send it to students — they can take it immediately without making an account."
          >
            <div className="help-steps" style={{ marginTop: 20, marginBottom: 26 }}>
              <div className="surface help-step">
                <span className="help-step-num">1</span>
                <h3>Generate</h3>
                <p>Enter a topic (or paste text / a URL / a document) and QuizForge AI builds the question set, with explanations and per-question difficulty.</p>
              </div>
              <div className="surface help-step">
                <span className="help-step-num">2</span>
                <h3>Publish</h3>
                <p>Review and edit the questions, then publish. QuizForge validates the quiz and creates a unique share code and public link.</p>
              </div>
              <div className="surface help-step">
                <span className="help-step-num">3</span>
                <h3>Share</h3>
                <p>Send the link or share code to your students. They open it in any browser and start immediately — no account or setup needed.</p>
              </div>
              <div className="surface help-step">
                <span className="help-step-num">4</span>
                <h3>Review</h3>
                <p>The server scores every attempt automatically and stores it, so you can review results, per-question analytics, and individual attempts live.</p>
              </div>
            </div>

            <div className="surface help-faq">
              <h3 style={{ fontSize: 16, marginBottom: 6 }}>Frequently asked questions</h3>
              <div className="faq-item">
                <details>
                  <summary>Do students need an account?</summary>
                  <p>No. Anyone with the share link can take the quiz without signing up. They just enter their name and start — the attempt is recorded automatically.</p>
                </details>
              </div>
              <div className="faq-item">
                <details>
                  <summary>What question types can I generate?</summary>
                  <p>QuizForge AI creates multiple-choice questions (with four options) and true/false questions, each with an answer explanation.</p>
                </details>
              </div>
              <div className="faq-item">
                <details>
                  <summary>Can I control difficulty or timing?</summary>
                  <p>Yes. When generating, you can set the difficulty and cognitive level, and you can attach a time limit — the server enforces it even if a student's clock drifts.</p>
                </details>
              </div>
              <div className="faq-item">
                <details>
                  <summary>How are scores calculated?</summary>
                  <p>The server scores each attempt authoritatively as it's submitted, so results are consistent no matter what the student's device reports.</p>
                </details>
              </div>
              <div className="faq-item">
                <details>
                  <summary>Can I edit a quiz after generating it?</summary>
                  <p>Yes. Quizzes stay in your workspace as drafts until you publish, and you can reopen any quiz to review or adjust its questions before sharing.</p>
                </details>
              </div>
            </div>
          </SimplePage>
        );
      case "about":
        return (
          <SimplePage eyebrow="Product" title="About QuizForge AI">
            <div className="surface about-hero" style={{ marginTop: 20 }}>
              <span className="brand-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </span>
              <h2>QuizForge AI</h2>
              <p>
                A full-stack assessment platform that turns any topic into a polished quiz in seconds.
                Create with AI, publish a share link, collect student attempts, and review real scoring analytics —
                all in one place.
              </p>
            </div>

            <div className="about-grid">
              <div className="surface about-feature">
                <h3>AI question generation</h3>
                <p>Generate high-quality, varied questions from a topic, pasted text, a URL, or an uploaded document.</p>
              </div>
              <div className="surface about-feature">
                <h3>Instant publishing</h3>
                <p>Publish any quiz to get a unique share code and public link for students in one click.</p>
              </div>
              <div className="surface about-feature">
                <h3>Account-free students</h3>
                <p>Students take quizzes in any browser with no sign-up — ideal for classrooms and quick assessments.</p>
              </div>
              <div className="surface about-feature">
                <h3>Scoring & analytics</h3>
                <p>Server-authoritative scoring with live results, per-question analytics, and full attempt review.</p>
              </div>
            </div>

            <div className="surface tech-card">
              <div>
                <span className="eyebrow">Under the hood</span>
                <h3>Built on a modern full-stack stack</h3>
                <p className="field-hint" style={{ marginTop: 6, marginBottom: 0 }}>
                  React, TypeScript and Vite on the front end; FastAPI, SQLAlchemy and SQLite on the back end — with
                  document processing and LLM-powered generation for the question engine.
                </p>
              </div>
            </div>

            <div className="surface tech-card" style={{ marginTop: 18 }}>
              <div>
                <span className="eyebrow">Creator</span>
                <h3>Built by Prajwal Benare</h3>
                <p className="field-hint" style={{ marginTop: 6, marginBottom: 0 }}>
                  QuizForge AI was designed, built and maintained by Prajwal Benare as a full-stack learning and
                  assessment project.
                </p>
              </div>
            </div>
          </SimplePage>
        );
          case "results":
        return activeQuizId != null ? (
          <QuizResults
            quizId={activeQuizId}
            onBack={() => navigateTo("quizzes")}
            onOpenAttempt={(attemptId) => { setActiveAttemptId(attemptId); navigateTo("attempt"); }}
          />
        ) : null;
      case "attempt":
        return activeQuizId != null && activeAttemptId != null ? (
          <AttemptDetailPanel
            quizId={activeQuizId}
            attemptId={activeAttemptId}
            onBack={() => navigateTo("results")}
          />
        ) : null;
      case "analytics":
        return activeQuizId != null ? (
          <QuizAnalyticsPanel quizId={activeQuizId} onBack={() => navigateTo("quizzes")} />
        ) : null;
    }
  }

  return (
    <div className="app-shell">
      <CinematicParticles />
      <Sidebar
        view={view}
        live={live}
        online={online}
        user={user}
        onNavigate={navigateTo}
        onOpenSettings={() => setShowingAuth(true)}
        onOpenAnalytics={() => (activeQuizId != null ? navigateTo("analytics") : navigateTo("quizzes"))}
        onAuth={() => setShowingAuth(true)}
      />
      {menuOpen && <div className="mobile-backdrop" onClick={() => setMenuOpen(false)} aria-hidden />}
      <main className="main-column">
        <Topbar
          view={view}
          live={live}
          dark={dark}
          user={user}
          onTheme={() => setDark((d) => !d)}
          onSettings={() => setShowingAuth(true)}
          onAuth={() => setShowingAuth(true)}
          onMenu={() => setMenuOpen(true)}
        />
        <div className="content-area">
          <AnimatePresence mode="wait">
            <div className="content-inner" key={view}>
              {renderContent()}
            </div>
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {showingAuth && (
          <LoginModal
            user={user}
            onSignIn={(u) => { setUser(u); setShowingAuth(false); setRefreshKey((k) => k + 1); }}
            onSignOut={() => { signOut(); setShowingAuth(false); }}
            onClose={() => setShowingAuth(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="notfound-page">
      <motion.div
        className="notfound-card"
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 24 }}
      >
        <span className="notfound-code">4<span className="gradient-text">0</span>4</span>
        <h1>Looks like this question doesn't exist.</h1>
        <p>
          The page you're looking for may have moved, or the quiz link may be
          incorrect. Double-check the share link and try again.
        </p>
        <motion.button
          className="btn-3d btn-primary btn-lg"
          onClick={() => navigate("/")}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
        >
          <span className="btn-label">Back to QuizForge</span>
        </motion.button>
      </motion.div>
    </div>
  );
}

function App() {
  const match = useMatch("/quiz/:shareCode");
  const location = useLocation();
  if (match) {
    return (
      <StudentQuiz />
    );
  }
  if (location.pathname !== "/") {
    return <NotFound />;
  }
  return <AppShell />;
}

export function QuizApp() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route path="/*" element={<App />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <QuizApp />
    </StrictMode>
  );
}
