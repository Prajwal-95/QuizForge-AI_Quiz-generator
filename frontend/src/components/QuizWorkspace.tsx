import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  PauseCircle,
  Play,
  Plus,
  Share2,
  Trash2,
  Users,
  Star,
  Clock3,
  LogIn,
} from "lucide-react";
import { listMyQuizzes, closeQuiz, reopenQuiz, publishQuiz, deleteQuiz } from "../api";
import { ShareModal } from "./QuizCreator";
import { useToast } from "./Toast";
import type { Quiz, QuizSummary, SessionUser } from "../types";

type QuizWorkspaceProps = {
  refreshKey?: number;
  user: SessionUser;
  onNew: () => void;
  onResults: (quizId: number) => void;
  onAnalytics: (quizId: number) => void;
  onAuth: () => void;
};

function statusLabel(status: string): string {
  if (status === "published") return "Published";
  if (status === "closed") return "Closed";
  return "Draft";
}

export function QuizWorkspace({
  refreshKey = 0,
  user,
  onNew,
  onResults,
  onAnalytics,
  onAuth,
}: QuizWorkspaceProps) {
  const toast = useToast();
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [sharedQuiz, setSharedQuiz] = useState<QuizSummary | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setQuizzes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const list = await listMyQuizzes();
      setQuizzes(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load quizzes.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function handleAction(id: number, action: () => Promise<unknown>) {
    setBusyId(id);
    setError("");
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(quiz: QuizSummary) {
    if (!window.confirm(`Delete "${quiz.title}"? Existing attempts will be removed.`)) return;
    await handleAction(quiz.id, () => deleteQuiz(quiz.id));
    toast.success(`"${quiz.title}" deleted`);
  }

  if (!user) {
    return (
      <div className="empty-state">
        <LogIn size={40} />
        <h2>Sign in to view your quizzes</h2>
        <p>Your quizzes live in your workspace. Sign in to create, publish, and review them.</p>
        <button className="btn-3d btn-primary btn-md" onClick={onAuth}>
          <LogIn size={15} /> Sign in
        </button>
      </div>
    );
  }

  if (loading && !quizzes.length) {
    return <p className="field-hint" style={{ padding: "24px 4px" }}>Loading your quizzes…</p>;
  }

  if (!loading && !quizzes.length) {
    return (
      <div className="empty-state">
        <Users size={40} />
        <h2>No quizzes yet</h2>
        <p>Create your first quiz and share it with students to start collecting results.</p>
        <motion.button className="btn-3d btn-primary btn-md" onClick={onNew} whileTap={{ scale: 0.96 }}>
          <Plus size={15} /> Create your first quiz
        </motion.button>
      </div>
    );
  }

  return (
    <div className="quiz-workspace">
      {error && (
        <div className="error-banner" role="alert" onClick={() => setError("")}>
          <span>{error}</span>
          <button className="icon-button" aria-label="Dismiss">×</button>
        </div>
      )}

      <div className="workspace-grid">
        {quizzes.map((quiz, idx) => (
          <motion.div
            className={`quiz-card surface status-${quiz.status}`}
            key={quiz.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.3 }}
            whileHover={{ y: -4 }}
          >
            <div className="quiz-card-head">
              <div className="quiz-card-titles">
                <span className={`status-badge ${quiz.status}`}>{statusLabel(quiz.status)}</span>
                <h3>{quiz.title}</h3>
                {quiz.subject && <span className="field-hint">{quiz.subject}</span>}
              </div>
              {quiz.share_code && quiz.status === "published" && (
                <button
                  className="share-chip"
                  title="Copy share code"
                  onClick={() => { navigator.clipboard?.writeText(quiz.share_code ?? ""); toast.success("Share code copied"); }}
                >
                  {quiz.share_code}
                </button>
              )}
            </div>

            <div className="quiz-card-stats">
              <span className="stat-item"><Star size={13} /> {quiz.question_count} questions</span>
              <span className="stat-item"><Users size={13} /> {quiz.attempts} attempts</span>
              <span className="stat-item"><Activity size={13} /> Avg {quiz.average_score}%</span>
              <span className="stat-item"><BarChart3 size={13} /> Best {quiz.highest_score}%</span>
            </div>

            <div className="quiz-card-actions">
              {quiz.status === "draft" && (
                <button
                  className="btn-3d btn-primary btn-sm"
                  disabled={busyId === quiz.id}
                  onClick={async () => {
                    await handleAction(quiz.id, () => publishQuiz(quiz.id));
                    toast.success("Quiz published — share it with students");
                  }}
                >
                  <Share2 size={14} /> Publish
                </button>
              )}
              {quiz.status === "published" && (
                <>
                  <button className="btn-3d btn-primary btn-sm share-button" disabled={busyId === quiz.id} onClick={() => setSharedQuiz(quiz)}>
                    <Share2 size={14} /> Share
                  </button>
                  <button className="btn-3d btn-ghost btn-sm" disabled={busyId === quiz.id} onClick={() => onResults(quiz.id)}>
                    <Users size={14} /> Results
                  </button>
                  <button className="btn-3d btn-ghost btn-sm" disabled={busyId === quiz.id} onClick={() => onAnalytics(quiz.id)}>
                    <BarChart3 size={14} /> Analytics
                  </button>
                  <button
                    className="btn-3d btn-ghost btn-sm"
                    disabled={busyId === quiz.id}
                    onClick={() => handleAction(quiz.id, () => closeQuiz(quiz.id))}
                  >
                    <PauseCircle size={14} /> Close
                  </button>
                </>
              )}
              {quiz.status === "closed" && (
                <>
                  <button className="btn-3d btn-ghost btn-sm" disabled={busyId === quiz.id} onClick={() => onResults(quiz.id)}>
                    <Users size={14} /> Results
                  </button>
                  <button className="btn-3d btn-ghost btn-sm" disabled={busyId === quiz.id} onClick={() => onAnalytics(quiz.id)}>
                    <BarChart3 size={14} /> Analytics
                  </button>
                  <button
                    className="btn-3d btn-primary btn-sm"
                    disabled={busyId === quiz.id}
                    onClick={() => handleAction(quiz.id, () => reopenQuiz(quiz.id))}
                  >
                    <Play size={14} /> Reopen
                  </button>
                </>
              )}
              <button
                className="icon-button danger"
                aria-label={`Delete ${quiz.title}`}
                disabled={busyId === quiz.id}
                onClick={() => handleDelete(quiz)}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {sharedQuiz && (
          <ShareModal
            quiz={toQuiz(sharedQuiz)}
            onClose={() => setSharedQuiz(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function toQuiz(summary: QuizSummary): Quiz {
  return {
    id: summary.id,
    title: summary.title,
    description: "",
    subject: summary.subject,
    difficulty: summary.difficulty,
    time_limit: 0,
    status: summary.status,
    share_code: summary.share_code,
  };
}
