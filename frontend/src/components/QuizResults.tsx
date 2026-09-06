import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Search,
  Users,
} from "lucide-react";
import { getQuizResults } from "../api";
import type { QuizResultRow } from "../types";
import { formatTime } from "../api";

type SortKey = "percentage" | "score" | "time_taken" | "submitted_at";
type FilterKey = "all" | "passed" | "failed";

const PAGE_SIZE = 10;

export function QuizResults({
  quizId,
  onBack,
  onOpenAttempt,
}: {
  quizId: number;
  onBack: () => void;
  onOpenAttempt: (attemptId: number) => void;
}) {
  const [rows, setRows] = useState<QuizResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sortKey, setSortKey] = useState<SortKey>("submitted_at");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    getQuizResults(quizId)
      .then((data) => {
        setRows(data);
        setError("");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load results."))
      .finally(() => setLoading(false));
  }, [quizId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows.filter((r) => {
      const matchQuery =
        !q ||
        r.student_name.toLowerCase().includes(q) ||
        r.student_identifier.toLowerCase().includes(q);
      const matchFilter =
        filter === "all" ||
        (filter === "passed" && r.percentage >= 50) ||
        (filter === "failed" && r.percentage < 50);
      return matchQuery && matchFilter;
    });
    list = [...list].sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      if (sortKey === "submitted_at") {
        av = a.submitted_at ?? "";
        bv = b.submitted_at ?? "";
      } else if (sortKey === "score") {
        av = a.score || 0;
        bv = b.score || 0;
      } else {
        av = a[sortKey] || 0;
        bv = b[sortKey] || 0;
      }
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      return 0;
    });
    return list;
  }, [rows, query, filter, sortKey, sortDir]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setSortDir(-1);
    }
  }

  function SortHeader({ label, k }: { label: string; k: SortKey }) {
    const active = sortKey === k;
    return (
      <th>
        <button className="sort-header" onClick={() => toggleSort(k)}>
          {label}
          {active && (sortDir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
        </button>
      </th>
    );
  }

  if (loading) {
    return <p className="field-hint" style={{ padding: "24px 4px" }}>Loading results…</p>;
  }

  if (error) {
    return (
      <div className="page">
        <div className="error-banner" role="alert"><span>{error}</span></div>
        <button className="btn-3d btn-ghost btn-md" onClick={onBack}>Back to quizzes</button>
      </div>
    );
  }

  return (
    <motion.div className="page" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="results-head">
        <div>
          <span className="eyebrow">Results</span>
          <h2 className="page-title">Student attempts</h2>
        </div>
        <button className="btn-3d btn-ghost btn-md" onClick={onBack}>← Back to quizzes</button>
      </div>

      <div className="results-toolbar surface">
        <div className="search-box">
          <Search size={15} />
          <input
            type="search"
            placeholder="Search by student name or ID…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="filter-tabs" role="tablist" aria-label="Filter results">
          {([["all", "All"], ["passed", "Passed"], ["failed", "Failed"]] as Array<[FilterKey, string]>).map(([value, label]) => (
            <button
              key={value}
              className={filter === value ? "filter-tab active" : "filter-tab"}
              onClick={() => {
                setFilter(value);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="field-hint">{filtered.length} attempt{filtered.length === 1 ? "" : "s"}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <Users size={40} />
          <h2>No student attempts yet</h2>
          <p>Share this quiz with your students to start collecting results.</p>
        </div>
      ) : (
        <>
          <div className="results-table-wrap surface">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>ID</th>
                  <SortHeader label="Score" k="score" />
                  <SortHeader label="Percentage" k="percentage" />
                  <SortHeader label="Time" k="time_taken" />
                  <SortHeader label="Submitted" k="submitted_at" />
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.id} onClick={() => onOpenAttempt(row.id)} className="clickable-row">
                    <td className="student-cell">{row.student_name}</td>
                    <td className="muted-cell">{row.student_identifier || "—"}</td>
                    <td>
                      <strong>{row.score}</strong>/{row.total_points}
                    </td>
                    <td>
                      <span className={`pct-badge ${row.percentage >= 50 ? "pass" : "fail"}`}>
                        {row.percentage}%
                      </span>
                    </td>
                    <td className="muted-cell">{formatTime(row.time_taken)}</td>
                    <td className="muted-cell">
                      {row.submitted_at
                        ? new Date(row.submitted_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
                        : "—"}
                    </td>
                    <td>
                      <span className={`status-badge ${row.percentage >= 50 ? "published" : "closed"}`}>
                        {row.percentage >= 50 ? "Passed" : "Failed"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <button
              className="icon-button"
              aria-label="Previous page"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="field-hint">
              Page {safePage} of {pages}
            </span>
            <button
              className="icon-button"
              aria-label="Next page"
              disabled={safePage >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}
