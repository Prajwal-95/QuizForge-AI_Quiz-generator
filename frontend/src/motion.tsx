import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";

/* ────────────────────────────────────────────────────────────────
   QuizForge AI — centralized motion system.
   Every animation in the app derives from these shared values so
   timing, easing, and springs stay consistent across the product.
   ──────────────────────────────────────────────────────────────── */

/* Preferred reduced motion — drives `useReducedMotion`-style behavior
   by disabling springs/delays at the source. */
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced] = useState(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false
  );
  return prefersReduced;
}

/* Easing curve used across the product (ease-out-quint-like). */
export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* Shared transition configs */
export const springFast = { type: "spring" as const, stiffness: 400, damping: 26 };
export const springMedium = { type: "spring" as const, stiffness: 260, damping: 24 };
export const springSoft = { type: "spring" as const, stiffness: 180, damping: 22 };
export const springTap = { type: "spring" as const, stiffness: 500, damping: 30 };
export const tweenFast = { duration: 0.18, ease: EASE };
export const tweenMedium = { duration: 0.28, ease: EASE };
export const tweenSlow = { duration: 0.4, ease: EASE };

/* ── Page / view transitions ─────────────────────────────────── */

export const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

/* Wraps the view container so each view change fades/slides smoothly.
   keyed by `view` in App. */
export function AnimatedPage({ children }: { children: ReactNode }) {
  return (
    <motion.div
      className="page-anim"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={tweenMedium}
    >
      {children}
    </motion.div>
  );
}

/* ── Stagger containers ──────────────────────────────────────── */

export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, ...springMedium },
};

/* ── Entry variants (single elements) ────────────────────────── */

export const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, ...springSoft },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, ...tweenMedium },
};

/* ── CountUp — number springs from 0 to `value` ─────────────── */

export function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const reduced = usePrefersReducedMotion();
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 90, damping: 22 });
  const display = useTransform(spring, (v) => `${Math.round(v)}${suffix}`);
  useEffect(() => {
    if (reduced) {
      mv.set(to);
      return;
    }
    mv.set(to);
  }, [mv, to, reduced]);
  return <motion.span>{display}</motion.span>;
}

/* ── Modal presets ───────────────────────────────────────────── */

export const modalBackdrop = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: tweenFast,
};

export const modalPanel = {
  initial: { scale: 0.96, opacity: 0, y: 8 },
  animate: { scale: 1, opacity: 1, y: 0 },
  exit: { scale: 0.96, opacity: 0, y: 8 },
  transition: springMedium,
};

/* Re-export common motion pieces so consumers import from one place. */
export { motion, AnimatePresence };
