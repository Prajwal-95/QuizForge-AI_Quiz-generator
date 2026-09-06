import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, X, Minus } from "lucide-react";
import { getAttemptDetail } from "../api";
import type { AttemptDetail as AttemptDetailData } from "../types";
import { formatTime } from "../api";

export function AttemptDetailPanel({
  quizId,
  attemptId,
  onBack,
}: {
  quizId: number;
  attemptId: number;
  onBack: () => void;
}) {
  const [data, setData] = useState<AttemptDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    getAttemptDetail(quizId, attemptId)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load result."))
      .finally(() => setLoading(false));
  }, [quizId, attemptId]);

  if (loading) {
    return <p className="field-hint" style={{ padding: "24px 4px" }}>Loading result…</p>;
  }

  if (error || !data) {
    return (
      <div className="page">
        <div className="error-banner" role="alert"><span>{error || "Result not found."}</span></div>
        <button className="btn-3d btn-ghost btn-md" onClick={onBack}><ArrowLeft size={15} /> Back</button>
      </div>
    );
  }

  return (
    <motion.div className="page" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="results-head">
        <div>
          <span className="eyebrow">Student result</span>
          <h2 className="page-title">{data.student_name}</h2>
        </div>
        <button className="btn-3d btn-ghost btn-md" onClick={onBack}><ArrowLeft size={15} /> Back to results</button>
      </div>

      <div className="detail-hero surface">
        <div className="detail-big">
          <strong>{data.score}</strong>
          <span>/ {data.total_points} points</span>
        </div>
        <div className="detail-big">
          <strong>{data.percentage}%</strong>
          <span>percentage</span>
        </div>
        <div className="detail-meta">
          <span><Check size={14} /> Correct: {data.correct}</span>
          <span><X size={14} /> Incorrect: {data.incorrect}</span>
          <span><Minus size={14} /> Unanswered: {data.unanswered}</span>
          <span>Time: {formatTime(data.time_taken)}</span>
        </div>
      </div>

      <div className="detail-info surface">
        <div className="detail-info-row"><span>Student ID</span><strong>{data.student_identifier || "—"}</strong></div>
        <div className="detail-info-row"><span>Quiz</span><strong>{data.quiz_title}</strong></div>
        <div className="detail-info-row">
          <span>Started</span>
          <strong>{data.started_at ? new Date(data.started_at).toLocaleString() : "—"}</strong>
        </div>
        <div className="detail-info-row">
          <span>Submitted</span>
          <strong>{data.submitted_at ? new Date(data.submitted_at).toLocaleString() : "—"}</strong>
        </div>
      </div>

      <section className="detail-questions">
        <h3 className="section-title">Question-by-question performance</h3>
        <div className="detail-questions-list">
          {data.questions.map((q) => (
            <motion.div
              className={`detail-question ${q.is_correct ? "correct" : q.answered ? "incorrect" : "unanswered"}`}
              key={q.question_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: q.order_index * 0.04 }}
            >
              <span className="detail-q-icon">
                {q.is_correct ? <Check size={14} /> : q.answered ? <X size={14} /> : <Minus size={14} />}
              </span>
              <div className="detail-q-body">
                <p><strong>Q{q.order_index + 1}</strong> · {q.question_text}</p>
                <span className="detail-tag">
                  {q.is_correct ? "Correct" : q.answered ? "Incorrect" : "Unanswered"} · +{q.points_awarded} point{q.points_awarded === 1 ? "" : "s"}
                </span>
                {q.selected_option_text && (
                  <span className="detail-answer-text">Student: {q.selected_option_text}</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}
