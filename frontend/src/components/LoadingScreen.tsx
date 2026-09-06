import { motion, AnimatePresence, tweenMedium, EASE } from "../motion";
import { useEffect, useState } from "react";

/* ────────────────────────────────────────────────────────────────
   QuizForge AI — premium loading / entry experience.

   Sequence (≈1.6s total, or near-instant with reduced motion):
     1. Clean dark background
     2. "QuizForge AI" wordmark enters (fade + rise)
     3. "Built by Prajwal" fades in
     4. "CSE Student" fades in with a subtle letter-spacing ease
     5. Thin progress bar fills
     6. The whole screen dissolves into the app
   ──────────────────────────────────────────────────────────────── */

export function LoadingScreen({ onDone }: { onDone: () => void }) {
  const reduced =
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const [show, setShow] = useState(true);

  /* Sequence timings */
  const wordmarkDelay = reduced ? 0 : 0.1;
  const barDelay = reduced ? 0 : 0.3;
  const subtitleDelay = reduced ? 0 : 0.48;
  const studentDelay = reduced ? 0 : 0.6;
  const total = reduced ? 300 : 1300;

  /* After the sequence completes, fade the screen out, then call onDone
     once the exit transition finishes. */
  useEffect(() => {
    const t = setTimeout(() => setShow(false), total);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AnimatePresence onExitComplete={onDone}>
      {show && (
        <motion.div
          className="loading-screen"
          exit={{ opacity: 0, transition: { duration: 0.35, ease: EASE } }}
          aria-hidden="true"
        >
          <div className="loading-inner">
            <motion.div
              className="loading-brand"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: wordmarkDelay, ...tweenMedium }}
            >
              <span className="loading-mark">Q</span>
              <span className="loading-wordmark">
                <span className="lw-quiz">Quiz</span><span className="lw-forge">forge</span>&nbsp;<span className="lw-ai">AI</span>
              </span>
            </motion.div>

            <motion.div
              className="loading-progress"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: barDelay, duration: 0.3 }}
            >
              <motion.div
                className="loading-progress-fill"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: barDelay, duration: 0.65, ease: EASE }}
              />
            </motion.div>

            <motion.div
              className="loading-tagline"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: subtitleDelay, duration: 0.4, ease: EASE }}
            >
              Loading your learning&nbsp;workspace…
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
