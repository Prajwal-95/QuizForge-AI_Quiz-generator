import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Copy,
  Link2,
  Loader2,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
import { ErrorBanner } from "./shared";
import { useToast } from "./Toast";
import { createQuiz, generateQuizAI, publishQuiz, shareUrl } from "../api";
import type { Quiz } from "../types";

type QuizCreatorProps = {
  onDone: (quiz: Quiz) => void;
};

/* ── ShareModal ────────────────────────────────────────────────── */

export function ShareModal({ quiz, onClose }: { quiz: Quiz; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [link, setLink] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    shareUrl(quiz.share_code ?? "")
      .then((url) => {
        if (!cancelled) setLink(url);
      })
      .catch(() => {
        if (!cancelled) setLink(`${window.location.origin}/quiz/${quiz.share_code ?? ""}`);
      });
    return () => {
      cancelled = true;
    };
  }, [quiz.share_code]);

  function copy(text: string, key: string) {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 1800);
  }

  async function nativeShare() {
    if (!navigator.share) return;
    try {
      await navigator.share({ title: quiz.title, text: `Take this quiz: ${quiz.title}`, url: link });
    } catch {
      /* user cancelled */
    }
  }

  function downloadQr() {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${quiz.share_code}-qrcode.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
    };
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(link)}`;
  }

  return (
    <motion.div className="modal-backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        className="share-modal surface"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Share quiz"
        initial={{ scale: 0.96, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 8 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">Published</span>
            <h2 className="share-title">{quiz.title}</h2>
          </div>
          <button className="icon-button" aria-label="Close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="share-body">
          <span className="field-label">Quiz code</span>
          <button className="share-code" onClick={() => copy(quiz.share_code ?? "", "code")}>
            <strong>{quiz.share_code}</strong>
            {copied === "code" ? <Check size={15} /> : <Copy size={15} />}
          </button>

          <span className="field-label">Share link</span>
          <div className="share-link-row">
            <span className="share-link-text">{link || "Resolving your share link…"}</span>
            <button className="btn-3d btn-ghost btn-sm" onClick={() => copy(link, "link")}>
              {copied === "link" ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </div>

          <div className="share-actions">
            <motion.button className="btn-3d btn-primary btn-md" onClick={() => copy(link, "link")} whileTap={{ scale: 0.96 }}>
              <Link2 size={15} /> Copy link
            </motion.button>
            <motion.button className="btn-3d btn-ghost btn-md" onClick={() => copy(quiz.share_code ?? "", "code")} whileTap={{ scale: 0.96 }}>
              <Copy size={15} /> Copy code
            </motion.button>
            {"share" in navigator && (
              <motion.button className="btn-3d btn-ghost btn-md" onClick={nativeShare} whileTap={{ scale: 0.96 }}>
                <Share2 size={15} /> Share
              </motion.button>
            )}
            <motion.button className="btn-3d btn-ghost btn-md" onClick={downloadQr} whileTap={{ scale: 0.96 }}>
              <Share2 size={15} /> QR code
            </motion.button>
          </div>

          <AnimatePresence>
            {copied && (
              <motion.div
                className="share-copied"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <Check size={14} /> {copied === "link" ? "Quiz link copied!" : "Quiz code copied!"}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
/* ── QuizCreator (AI generation only) ─────────────────────────── */

export function QuizCreator({ onDone }: QuizCreatorProps) {
  const toast = useToast();
  const [meta, setMeta] = useState({
    title: "",
    description: "",
    subject: "",
    difficulty: "medium",
    time_limit: 0,
  });
  const [aiTopic, setAiTopic] = useState("");
  const [aiCount, setAiCount] = useState(5);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sharedQuiz, setSharedQuiz] = useState<Quiz | null>(null);

  async function handleGenerateAndPublish() {
    if (!aiTopic.trim()) {
      setError("Enter a topic to generate your quiz.");
      toast.warning("Enter a topic to generate your quiz");
      return;
    }
    setAiLoading(true);
    setError("");
    setSuccess("");
    try {
      // 1) Generate questions with AI
      const generated = await generateQuizAI(
        aiTopic.trim(),
        meta.description.trim(),
        {
          count: aiCount,
          difficulty: meta.difficulty,
          question_types: ["mcq"],
          cognitive_level: "mixed",
          time_limit: meta.time_limit,
          shuffle_questions: false,
          shuffle_options: true,
        }
      );

      // 2) Fill metadata the AI didn't provide from the form
      const title = meta.title.trim() || generated.title || aiTopic.trim();
      const subject = meta.subject.trim() || generated.subject || aiTopic.trim();

      // 3) Save the quiz with its generated questions
      const saved = await createQuiz({
        title,
        description: meta.description.trim() || (generated.description ?? ""),
        subject,
        difficulty: meta.difficulty,
        time_limit: meta.time_limit,
        questions: (generated.questions ?? []).map((q) => ({
          question_text: q.question_text,
          explanation: q.explanation ?? "",
          points: q.points ?? 1,
          options: q.options.map((o) => ({ option_text: o.option_text, is_correct: o.is_correct })),
        })),
      });

      // 4) Publish it to get a share code
      const published = await publishQuiz(saved.id);
      setSharedQuiz(published);
      setSuccess(`AI quiz created and published — ${published.questions?.length ?? generated.questions?.length ?? 0} questions ✓`);
      toast.success("Quiz created & published ✨");
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI generation failed");
      toast.error(err instanceof Error ? err.message : "AI generation failed");
    } finally {
      setAiLoading(false);
    }
  }
return (
    <motion.div
      className="page create-page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="creator-heading">
        <div>
          <span className="eyebrow">Quiz creator</span>
          <h2 className="page-title">Build a quiz with AI</h2>
        </div>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}
      {success && (
        <motion.div className="success-banner" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
          <Check size={16} /> {success}
        </motion.div>
      )}

      <motion.section className="surface ai-panel ai-panel-open" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <span className="eyebrow">AI assistant</span>
        <p className="field-hint">
          Enter a topic and QuizForge generates a full question set for you. Your quiz is
          created, validated, and published automatically — then you can share the link with students.
        </p>
        <div className="ai-controls">
          <label className="input-field">
            <span className="field-label">Topic</span>
            <input
              type="text"
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !aiLoading && handleGenerateAndPublish()}
              placeholder="e.g. Database normalization"
            />
          </label>
          <label className="input-field ai-count">
            <span className="field-label">Questions</span>
            <input
              type="number"
              min={1}
              max={25}
              value={aiCount}
              onChange={(e) => setAiCount(Math.max(1, Math.min(25, Number(e.target.value) || 1)))}
            />
          </label>
          <motion.button
            className="btn-3d btn-primary"
            disabled={aiLoading}
            onClick={handleGenerateAndPublish}
            whileTap={{ scale: 0.96 }}
          >
            {aiLoading ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />}
            {aiLoading ? "Generating & publishing…" : "Generate & publish quiz"}
          </motion.button>
        </div>
      </motion.section>

      <motion.section className="surface meta-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <span className="eyebrow">Quiz details (optional)</span>
        <div className="meta-grid">
          <label className="input-field meta-title">
            <span className="field-label">Quiz title</span>
            <input
              type="text"
              value={meta.title}
              onChange={(e) => setMeta({ ...meta, title: e.target.value })}
              placeholder="Auto-filled from topic if left blank"
            />
          </label>
          <label className="input-field">
            <span className="field-label">Subject / category</span>
            <input
              type="text"
              value={meta.subject}
              onChange={(e) => setMeta({ ...meta, subject: e.target.value })}
              placeholder="e.g. Computer Science"
            />
          </label>
          <label className="input-field">
            <span className="field-label">Difficulty</span>
            <select value={meta.difficulty} onChange={(e) => setMeta({ ...meta, difficulty: e.target.value })}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="mixed">Mixed</option>
            </select>
          </label>
          <label className="input-field">
            <span className="field-label">Time limit (minutes, 0 = none)</span>
            <input
              type="number"
              min={0}
              max={360}
              value={meta.time_limit}
              onChange={(e) => setMeta({ ...meta, time_limit: Math.max(0, Number(e.target.value) || 0) })}
            />
          </label>
          <label className="input-field meta-desc">
            <span className="field-label">Description</span>
            <textarea
              rows={2}
              value={meta.description}
              onChange={(e) => setMeta({ ...meta, description: e.target.value })}
              placeholder="What will students learn? Shown on the quiz landing page."
            />
          </label>
        </div>
      </motion.section>

      <AnimatePresence>
        {sharedQuiz && <ShareModal quiz={sharedQuiz} onClose={() => { setSharedQuiz(null); onDone(sharedQuiz); }} />}
      </AnimatePresence>
    </motion.div>
  );
}