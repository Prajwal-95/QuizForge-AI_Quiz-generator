import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CountUp } from "../motion";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Home,
  Loader2,
  Play,
  User,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import {
  fetchPublicQuiz,
  startStudentAttempt,
  submitStudentAttempt,
  formatTime,
} from "../api";
import type {
  StudentAttemptStart,
  StudentQuestion,
  StudentSubmissionResult,
  StudentQuizInfo,
} from "../types";

type Phase = "loading" | "error" | "landing" | "intro" | "taking" | "submitting" | "result";

function StudentBrand({ label }: { label?: string }) {
  return (
    <span className="student-brand"><strong>QuizForge</strong>&nbsp;AI{label && <> Â· {label}</>}</span>
  );
}


export function StudentQuiz() {
  const { shareCode } = useParams<{ shareCode: string }>();
  const [phase, setPhase] = useState<Phase>("loading");
  const [quiz, setQuiz] = useState<StudentQuizInfo | null>(null);
  const [error, setError] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [attempt, setAttempt] = useState<StudentAttemptStart | null>(null);
  const [answers, setAnswers] = useState<Record<number, number | null>>({});
  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [result, setResult] = useState<StudentSubmissionResult | null>(null);
  const [subError, setSubError] = useState("");
  const [loadElapsed, setLoadElapsed] = useState(0);
  const submitRef = useRef(false);

  const loadQuiz = useCallback(() => {
    if (!shareCode) {
      setError("No quiz code found in the URL.");
      setPhase("error");
      return;
    }
    setPhase("loading");
    setError("");
    setLoadElapsed(0);
    fetchPublicQuiz(shareCode)
      .then((q) => {
        setQuiz(q);
        setRemaining(q.time_limit * 60);
        setPhase("landing");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Quiz not found.");
        setPhase("error");
      });
  }, [shareCode]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  // Tick a visible timer while the quiz is loading so students see progress.
  useEffect(() => {
    if (phase !== "loading") return;
    setLoadElapsed(0);
    const id = setInterval(() => setLoadElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  function start() {
    if (!studentName.trim()) {
      setError("Enter your name to begin.");
      setPhase("landing");
      return;
    }
    setPhase("loading");
    setError("");
    startStudentAttempt(shareCode!, studentName.trim(), studentId.trim())
      .then((a) => {
        setAttempt(a);
        setRemaining(a.time_limit * 60);
        setAnswers({});
        setCurrent(0);
        submitRef.current = false;
        setPhase("taking");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not start quiz.");
        setPhase("error");
      });
  }

  const submitAttempt = useCallback(async (answersSnapshot: Record<number, number | null>) => {
    if (submitRef.current || !attempt || !shareCode) return;
    submitRef.current = true;
    setPhase("submitting");
    setSubError("");
    try {
      const answerList = attempt.questions.map((q) => ({
        question_id: q.id,
        selected_option_id: answersSnapshot[q.id] ?? null,
      }));
      const res = await submitStudentAttempt(shareCode, attempt.attempt_id, answerList);
      setResult(res);
      setPhase("result");
    } catch (err) {
      setSubError(err instanceof Error ? err.message : "Submission failed. Check your connection and try again.");
      setPhase("taking");
      submitRef.current = false;
    }
  }, [attempt, shareCode]);

  /* Server-authoritative timer: counts down from server started_at +
     time_limit. If it hits zero, the attempt auto-submits. The backend also
     enforces the limit regardless of what this client does. */
  useEffect(() => {
    if (phase !== "taking" || !attempt || attempt.time_limit <= 0) return;
    const started = attempt.started_at ? new Date(attempt.started_at).getTime() : Date.now();
    const serverDeadline = started + attempt.time_limit * 1000;
    const tick = () => {
      const left = Math.max(0, Math.round((serverDeadline - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        setAnswers((curr) => {
          submitAttempt(curr);
          return curr;
        });
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [phase, attempt, submitAttempt]);

  function select(questionId: number, optionId: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: prev[questionId] === optionId ? null : optionId }));
  }

  const question = attempt?.questions[current];
  const answered = attempt ? attempt.questions.filter((q) => answers[q.id] != null).length : 0;
  const progress = attempt ? (answered / attempt.questions.length) * 100 : 0;

  /* â”€â”€ Loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  if (phase === "loading") {
    return (
      <div className="student-shell">
        <div className="student-loading">
          <div className="qf-loader" role="status" aria-label="Loading quiz">
            <div className="qf-loader-stage">
              <motion.span
                className="qf-loader-mark"
                animate={{ scale: [1, 1.15, 1], rotate: [0, 8, -8, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              >
                Q
              </motion.span>
              <span className="qf-loader-ring" />
              <span className="qf-loader-ring qf-loader-ring-2" />
            </div>
            <div className="qf-loader-wordmark">
              <span className="lw-quiz">Quiz</span><span className="lw-forge">forge</span>&nbsp;<span className="lw-ai">AI</span>
            </div>
            <motion.p
              className="qf-loader-tag"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            >
              {loadElapsed < 5
                ? "Opening your quiz\u2026"
                : loadElapsed < 15
                  ? "Server is waking up\u2026"
                  : loadElapsed < 30
                    ? "Almost there\u2026 (cold start)"
                    : "Still connecting\u2026 hang tight"}
            </motion.p>
            <div className="qf-loader-bar">
              <motion.span
                className="qf-loader-bar-fill"
                animate={{ x: ["-100%", "220%"] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
            <p className="qf-loader-hint">
              {loadElapsed > 5
                ? `${loadElapsed}s elapsed \u2014 free servers need a moment to wake up`
                : "Tip: free servers may take 30\u201360 s on first load"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* â”€â”€ Error â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  if (phase === "error") {
    const isNetwork =
      error.includes("too long") ||
      error.includes("Failed to fetch") ||
      error.includes("NetworkError") ||
      error.includes("network");
    const isClosed = error.includes("accepting");
    const isNotFound = error.includes("not") || error.includes("404");

    return (
      <div className="student-shell">
        <div className="student-error surface">
          <div className="student-error-icon">
            {isNetwork ? <WifiOff size={44} strokeWidth={1.5} /> : <span className="eyebrow">Quiz unavailable</span>}
          </div>
          <h1>{isNotFound ? error : isNetwork ? "Can't reach the quiz server" : "Something went wrong"}</h1>
          <p>
            {isNotFound || isClosed
              ? error
              : isNetwork
                ? "The quiz server may be starting up (Render free tier can take 30-60 seconds on cold start). Check your connection and try again."
                : "We couldn't load the quiz. Check your connection and try again."}
          </p>
          {isClosed && (
            <p className="field-hint">The quiz has been closed by the creator.</p>
          )}
          <div className="student-error-actions">
            <motion.button
              className="btn-3d btn-primary btn-md"
              onClick={() => loadQuiz()}
              whileTap={{ scale: 0.95 }}
            >
              <RefreshCw size={15} /> Try again
            </motion.button>
            <Link className="btn-3d btn-ghost btn-md" to="/"><Home size={15} /> Back to home</Link>
          </div>
        </div>
      </div>
    );
  }

  /* â”€â”€ Landing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  if (phase === "landing" && quiz) {
    return (
      <div className="student-shell">
        <div className="student-topbar">
          <StudentBrand />
          <span className="chip muted">{quiz.subject || "Quiz"}</span>
        </div>
        <motion.div className="student-landing" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 22 }}>
          <div className="student-landing-head">
            <span className="eyebrow">You're invited to take</span>
            <h1>{quiz.title}</h1>
            {quiz.description && <p className="student-desc">{quiz.description}</p>}
            <div className="student-chip-row">
              <span className="chip"><Sparkles size={13} /> By {quiz.creator_name}</span>
              <span className="chip muted">{quiz.question_count} questions</span>
              {quiz.time_limit > 0 ? (
                <span className="chip muted"><Clock3 size={13} /> {quiz.time_limit} min</span>
              ) : (
                <span className="chip muted">No time limit</span>
              )}
              <span className="chip muted">{quiz.total_points} points</span>
            </div>
          </div>

          <form
            className="student-form"
            onSubmit={(e) => {
              e.preventDefault();
              start();
            }}
          >
            <label className="input-field">
              <span className="field-label">Your name *</span>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Prajwal"
                autoComplete="name"
              />
            </label>
            <label className="input-field">
              <span className="field-label">Student ID / Roll number</span>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="e.g. 2AG23CS077"
                autoComplete="off"
              />
            </label>
            {error && <div className="auth-error">{error}</div>}
            <motion.button className="btn-3d btn-primary btn-lg btn-full" type="submit" whileTap={{ scale: 0.97 }}>
              <span className="btn-leading"><Play size={16} /></span>
              <span className="btn-label">Start quiz</span>
            </motion.button>
            <p className="field-hint" style={{ textAlign: "center" }}>
              <ShieldCheck size={13} style={{ verticalAlign: -2 }} /> No account needed â€” answers are scored automatically when you submit.
            </p>
          </form>
        </motion.div>
      </div>
    );
  }

  /* â”€â”€ Taking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  if ((phase === "taking" || phase === "submitting") && attempt && question) {
    return (
      <div className="student-shell quiz-taking">
        <div className="student-topbar">
          <StudentBrand />
          <div className="student-taking-meta">
            {attempt.time_limit > 0 && (
              <span className={`timer-pill ${remaining <= 60 ? "danger" : ""}`}>
                <Clock3 size={15} /> {formatTime(remaining)}
              </span>
            )}
            <span className="chip muted">
              {answered}/{attempt.questions.length} answered
            </span>
          </div>
        </div>

        <div className="student-progress-wrap">
          <div className="student-progress-label">
            <span>Question {current + 1} of {attempt.questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="student-progress-track">
            <motion.div
              className="student-progress-fill"
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>
        </div>

        {subError && (
          <div className="error-banner" role="alert">
            <span>{subError}</span>
            <button className="icon-button" onClick={() => setSubError("")}>Ã—</button>
          </div>
        )}

        <motion.div
          className="student-question"
          key={question.id}
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="student-q-meta">
            <span className="chip">{question.type === "true_false" ? "True / False" : question.type === "short_answer" ? "Fill in the blanks" : "MCQ"}</span>
            <span className="chip muted">{question.points} {question.points === 1 ? "point" : "points"}</span>
          </div>
          <h2 className="student-q-text">{question.question_text}</h2>

          <div className="student-options">
            {question.options.map((opt, idx) => {
              const selected = answers[question.id] === opt.id;
              return (
                <motion.button
                  key={opt.id}
                  className={`student-option ${selected ? "selected" : ""}`}
                  onClick={() => select(question.id, opt.id)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 + idx * 0.04 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                  <span className="student-option-text">{opt.option_text}</span>
                  <span className={`student-option-check ${selected ? "shown" : ""}`}>
                    <CheckCircle2 size={18} />
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        <div className="student-nav">
          <motion.button
            className="btn-3d btn-ghost btn-md"
            disabled={current === 0}
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronLeft size={15} /> Previous
          </motion.button>

          <div className="student-dots">
            {attempt.questions.map((q, idx) => (
              <button
                key={q.id}
                className={`student-dot ${idx === current ? "active" : ""} ${answers[q.id] != null ? "answered" : ""}`}
                onClick={() => setCurrent(idx)}
                aria-label={`Go to question ${idx + 1}`}
              />
            ))}
          </div>

          {current < attempt.questions.length - 1 ? (
            <motion.button
              className="btn-3d btn-primary"
              onClick={() => setCurrent((c) => Math.min(attempt.questions.length - 1, c + 1))}
              whileTap={{ scale: 0.95 }}
            >
              <span className="btn-label">Next <ChevronRight size={15} /></span>
            </motion.button>
          ) : (
            <motion.button
              className="btn-3d btn-success"
              disabled={phase === "submitting"}
              onClick={() => submitAttempt(answers)}
              whileTap={{ scale: 0.95 }}
            >
              <span className="btn-label">
                {phase === "submitting" ? <Loader2 size={15} className="spin" /> : null}
                {phase === "submitting" ? "Submittingâ€¦" : "Submit quiz"}
              </span>
            </motion.button>
          )}
        </div>
      </div>
    );
  }

  /* â”€â”€ Result â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  if (phase === "result" && result && quiz) {
    const wrong = result.incorrect + result.unanswered;
    const grade =
      result.percentage >= 90 ? "Outstanding!" :
      result.percentage >= 75 ? "Great work!" :
      result.percentage >= 60 ? "Good effort" :
      result.percentage >= 40 ? "Keep practicing" : "Review the material";

    return (
      <div className="student-shell">
        <div className="student-topbar">
          <StudentBrand />
          <span className="chip muted">Completed</span>
        </div>

        <motion.div className="student-result" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 180, damping: 20 }}>
          <span className="eyebrow">Quiz Completed</span>
          <h1 className="student-result-name">{result.student_name ?? studentName}</h1>

          <div className="result-score-ring" style={{ "--score": `${Math.min(100, result.percentage) * 3.6}deg` } as React.CSSProperties}>
            <div className="result-score-inner">
              <strong><CountUp to={result.percentage} suffix="%" /></strong>
              <span>{grade}</span>
            </div>
          </div>

          <div className="student-result-score">
            <strong>{result.score}</strong> / {result.total_points} points
          </div>

          <div className="student-result-grid">
            <div className="result-stat"><CheckCircle2 size={17} /><span><strong>{result.correct}</strong> Correct</span></div>
            <div className="result-stat wrong"><ChevronRight size={17} /><span><strong>{result.incorrect}</strong> Incorrect</span></div>
            {result.unanswered > 0 && (
              <div className="result-stat neutral"><><strong>{result.unanswered}</strong> Unanswered</></div>
            )}
            <div className="result-stat"><Clock3 size={17} /><span><strong>{formatTime(result.time_taken)}</strong> Time taken</span></div>
          </div>

          <div className="student-result-actions">
            <Link className="btn-3d btn-ghost btn-md" to="/"><Home size={15} /> Back to Home</Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return <div className="student-shell"><p className="field-hint">Something went wrong.</p></div>;
}
