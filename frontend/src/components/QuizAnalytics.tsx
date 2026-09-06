import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { getQuizAnalytics } from "../api";
import type { QuizAnalytics as QuizAnalyticsData } from "../types";
import { BarChart, LineChart, DonutChart, chartColors } from "./Charts";

export function QuizAnalyticsPanel({
  quizId,
  onBack,
}: {
  quizId: number;
  onBack: () => void;
}) {
  const [data, setData] = useState<QuizAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    getQuizAnalytics(quizId)
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load analytics."))
      .finally(() => setLoading(false));
  }, [quizId]);

  if (loading) {
    return <p className="field-hint" style={{ padding: "24px 4px" }}>Loading analytics…</p>;
  }

  if (error || !data) {
    return (
      <div className="page">
        <div className="error-banner" role="alert"><span>{error || "No analytics available."}</span></div>
        <button className="btn-3d btn-ghost btn-md" onClick={onBack}>Back to quizzes</button>
      </div>
    );
  }

  const distItems = Object.entries(data.distribution || {}).map(([label, value]) => ({ label, value }));

  return (
    <motion.div className="page" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="results-head">
        <div>
          <span className="eyebrow">Analytics</span>
          <h2 className="page-title">{data.title}</h2>
        </div>
        <button className="btn-3d btn-ghost btn-md" onClick={onBack}>← Back to quizzes</button>
      </div>

      <div className="analytics-cards">
        <div className="analytics-card surface">
          <span className="metric-icon"><BarChart3 size={17} /></span>
          <div>
            <span className="metric-value">{data.total_attempts}</span>
            <span className="metric-label">Total attempts</span>
          </div>
        </div>
        <div className="analytics-card surface">
          <span className="metric-icon"><BarChart3 size={17} /></span>
          <div>
            <span className="metric-value">{data.average_score}%</span>
            <span className="metric-label">Average score</span>
          </div>
        </div>
        <div className="analytics-card surface">
          <span className="metric-icon"><BarChart3 size={17} /></span>
          <div>
            <span className="metric-value">{data.highest_score}%</span>
            <span className="metric-label">Highest score</span>
          </div>
        </div>
        <div className="analytics-card surface">
          <span className="metric-icon"><BarChart3 size={17} /></span>
          <div>
            <span className="metric-value">{data.pass_rate}%</span>
            <span className="metric-label">Pass rate</span>
          </div>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="analytics-panel surface">
          <h3 className="section-title">Score distribution</h3>
          <BarChart items={distItems} height={190} />
        </div>
        <div className="analytics-panel surface">
          <h3 className="section-title">Pass vs fail</h3>
          <div className="donut-wrap">
            <DonutChart value={data.pass_rate} label="pass rate" color="#10b981" />
            <div className="donut-legend">
              <span><i className="dot pass" /> Passed: {data.passed}</span>
              <span><i className="dot fail" /> Failed: {data.failed}</span>
            </div>
          </div>
        </div>
        <div className="analytics-panel surface analytics-full">
          <h3 className="section-title">Attempts over time</h3>
          <LineChart items={data.attempts_over_time || []} />
        </div>
        <div className="analytics-panel surface analytics-full">
          <h3 className="section-title">Question accuracy</h3>
          {data.question_accuracy && data.question_accuracy.length > 0 ? (
            <div className="question-accuracy-list">
              {data.question_accuracy.map((qa) => (
                <div className="accuracy-row" key={qa.question_id}>
                  <span className="accuracy-q">Q{qa.order_index + 1}</span>
                  <div className="accuracy-track">
                    <div
                      className="accuracy-fill"
                      style={{ width: `${qa.accuracy}%`, background: qa.accuracy >= 70 ? "#10b981" : qa.accuracy >= 40 ? "#f59f00" : "#e64980" }}
                    />
                  </div>
                  <span className="accuracy-pct">{qa.accuracy}%</span>
                  <span className="accuracy-counts">
                    {qa.correct_attempts} correct · {qa.incorrect_attempts} incorrect
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="field-hint">No question data yet.</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
