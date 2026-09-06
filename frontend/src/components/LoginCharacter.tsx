/* ════════════════════════════════════════════════════════════════
   QuizForge AI — animated login mascot.

   A friendly SVG character that reacts to the sign-in form. Its mood
   is driven by (field, passwordVisible, status) and expresses through:

     • iris/pupil tracking (they "look" toward the password field)
     • open / closed / happy eyes + natural blinking
     • animated eyebrows and head pose (tilt / lean / turn)
     • crossfaded mouth shapes (relax, smirk, "o", frown, smile, …)

   Moods: default, username, password, passwordVisible, error, success,
   loading. All motion is Framer Motion springs and honours
   prefers-reduced-motion via usePrefersReducedMotion from ../motion.

   Colours come from CSS custom properties (--char-*) so the mascot
   adapts to the light & dark themes automatically.
   ════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { motion, usePrefersReducedMotion } from "../motion";

export type CharacterMood =
  | "default"
  | "username"
  | "password"
  | "passwordVisible"
  | "error"
  | "success"
  | "loading";

type EyeSide = "left" | "right";

type EyeSpec = {
  closed: boolean;
  happy: boolean;
  lookX: number; // pupil offset (eye-local units)
  lookY: number;
  eyeScale: number;
  pupilScale: number;
};

/* Per-mood eye specs — pupils converge inward & downward to "track"
   the password field sitting below the character. */
const EYE_SPEC: Record<CharacterMood, (side: EyeSide) => EyeSpec> = {
  default: () => ({ closed: false, happy: false, lookX: 0, lookY: 0, eyeScale: 1, pupilScale: 1 }),
  username: () => ({ closed: true, happy: false, lookX: 0, lookY: 0, eyeScale: 1, pupilScale: 1 }),
  password: (side) => ({ closed: false, happy: false, lookX: side === "left" ? 1.5 : -1.5, lookY: 3.2, eyeScale: 1.02, pupilScale: 1 }),
  passwordVisible: (side) => ({ closed: false, happy: false, lookX: side === "left" ? 1.8 : -1.8, lookY: 3.6, eyeScale: 1.16, pupilScale: 0.86 }),
  error: (side) => ({ closed: false, happy: false, lookX: side === "left" ? 2.7 : -2.7, lookY: 0.4, eyeScale: 1, pupilScale: 0.82 }),
  success: () => ({ closed: true, happy: true, lookX: 0, lookY: 0, eyeScale: 1, pupilScale: 1 }),
  loading: (side) => ({ closed: false, happy: false, lookX: side === "left" ? 1 : -1, lookY: 2.6, eyeScale: 1, pupilScale: 1 }),
};

/* Brow pose per mood: rotate (deg, clockwise+) & vertical shift (up = -) */
const BROW_POSE: Record<CharacterMood, { lr: number; rr: number; y: number }> = {
  default: { lr: 0, rr: 0, y: 0 },
  username: { lr: -5, rr: -11, y: -2 },          // both half-raised — "promise, not looking"
  password: { lr: -10, rr: -1, y: -1.6 },        // one brow up — playful curiosity
  passwordVisible: { lr: -12, rr: -12, y: -3.4 },// both raised — surprise
  error: { lr: -8, rr: 8, y: 0.6 },              // one up, one knit — confused
  success: { lr: -6, rr: -6, y: -2.2 },          // relaxed happy lift
  loading: { lr: 3, rr: -3, y: 0.2 },            // slight focus
};

/* Head pose per mood */
const HEAD_POSE: Record<CharacterMood, { r: number; y: number; s: number }> = {
  default: { r: 0, y: 0, s: 1 },
  username: { r: 7, y: 0, s: 1 },              // turns away — "not peeking"
  password: { r: -2, y: 0, s: 1 },             // leans in
  passwordVisible: { r: 1, y: -3, s: 1.02 },   // leans back, surprised
  error: { r: -5, y: 1.5, s: 1 },
  success: { r: -2, y: -1, s: 1 },
  loading: { r: -1, y: 0, s: 1 },
};

/* Mouth variants, crossfaded per mood */
type MouthSpec = {
  key: string;
  ellipse?: { cx: number; cy: number; rx: number; ry: number };
  d?: string;
  fill?: string;
  stroke?: string;
  sw?: number;
};

const MOUTH_SPECS: MouthSpec[] = [
  { key: "relax", d: "M 98 107 Q 110 114 122 107", sw: 3 },
  { key: "smirk", d: "M 97 107 Q 110 116 121 107.5", sw: 3 },
  { key: "o", ellipse: { cx: 110, cy: 109, rx: 5, ry: 6 }, fill: "#0a1510" },
  { key: "obig", ellipse: { cx: 110, cy: 110, rx: 6.6, ry: 8.4 }, fill: "#0a1510" },
  { key: "frown", d: "M 97 110 Q 103 106 110 109 Q 117 112 123 107", sw: 3 },
  { key: "smile", d: "M 95 105 Q 110 121 125 105 Q 110 112 95 105 Z", fill: "#4a2f35" },
];

const MOOD_MOUTH: Record<CharacterMood, string> = {
  default: "relax",
  username: "smirk",
  password: "o",
  passwordVisible: "obig",
  error: "frown",
  success: "smile",
  loading: "relax",
};


/* ── Springs (snappy but smooth) ───────────────────────────────── */
const SPRING_LOOK = { type: "spring" as const, stiffness: 240, damping: 20 };
const SPRING_SNAP = { type: "spring" as const, stiffness: 380, damping: 28 };
const SPRING_POSE = { type: "spring" as const, stiffness: 260, damping: 20 };
const SPRING_PORT = { type: "spring" as const, stiffness: 320, damping: 22 };

/* ── One eye: sclera + tracked iris/pupil + lid arc ────────────── */
function Eye({ side, spec, blink, reduced }: { side: EyeSide; spec: EyeSpec; blink: boolean; reduced: boolean }) {
  const cx = side === "left" ? 88 : 132;
  const cy = 78;
  const closed = spec.closed || (blink && !spec.happy);
  const happyArc = closed && spec.happy;
  const smooth = reduced ? { duration: 0 } : SPRING_SNAP;

  return (
    <g>
      {/* Eyeball (squints / fades when closing) */}
      <motion.g
        animate={{ scaleY: happyArc ? 0.6 : closed ? 0.16 : 1, opacity: closed ? 0.06 : 1 }}
        transition={smooth}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      >
        <ellipse
          cx={cx}
          cy={cy}
          rx={13.5 * spec.eyeScale}
          ry={14 * spec.eyeScale}
          fill="#ffffff"
          stroke="var(--char-line)"
          strokeWidth="1.2"
        />
        {/* Iris + pupil + glints — the pupil "tracks" via spring translate */}
        <motion.g
          animate={{ x: spec.lookX, y: spec.lookY }}
          transition={reduced ? { duration: 0 } : SPRING_LOOK}
          style={{ transformBox: "fill-box" }}
        >
          <circle cx={cx} cy={cy} r={7} fill="var(--char-iris, #14B8A6)" />
          <circle cx={cx} cy={cy} r={3.7 * spec.pupilScale} fill="var(--char-ink)" />
          <circle cx={cx + 2.7} cy={cy - 2.9} r={2} fill="#ffffff" />
          <circle cx={cx - 1.7} cy={cy - 1.1} r={0.9} fill="#ffffff" opacity="0.75" />
        </motion.g>
      </motion.g>
      {/* Closed / happy lid arc */}
      <motion.path
        d={
          happyArc
            ? `M ${cx - 11} ${cy + 1} Q ${cx} ${cy - 6.5} ${cx + 11} ${cy + 1}`
            : `M ${cx - 11.5} ${cy + 1} Q ${cx} ${cy + 6.5} ${cx + 11.5} ${cy + 1}`
        }
        fill="none"
        stroke="var(--char-ink)"
        strokeWidth="3.4"
        strokeLinecap="round"
        initial={false}
        animate={{ opacity: closed ? 1 : 0, scale: closed ? 1 : 0.7 }}
        transition={smooth}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      />
    </g>
  );
}

/* ── Eyebrows ─────────────────────────────────────────────────── */
function Brows({ mood, reduced }: { mood: CharacterMood; reduced: boolean }) {
  const cfg = BROW_POSE[mood];
  const t = reduced ? { duration: 0 } : SPRING_POSE;
  return (
    <g>
      <motion.g animate={{ rotate: cfg.lr, y: cfg.y }} transition={t} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
        <path d="M 75 58 Q 88 52.5 100 58" fill="none" stroke="var(--char-ink)" strokeWidth="3.6" strokeLinecap="round" />
      </motion.g>
      <motion.g animate={{ rotate: cfg.rr, y: cfg.y }} transition={t} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
        <path d="M 120 58 Q 132 52.5 145 58" fill="none" stroke="var(--char-ink)" strokeWidth="3.6" strokeLinecap="round" />
      </motion.g>
    </g>
  );
}

/* ── Mouth (crossfaded variants) ──────────────────────────────── */
function Mouth({ mood, reduced }: { mood: CharacterMood; reduced: boolean }) {
  const active = MOOD_MOUTH[mood];
  return (
    <g>
      {MOUTH_SPECS.map((s) => (
        <motion.g
          key={s.key}
          initial={false}
          animate={{ opacity: s.key === active ? 1 : 0, scale: s.key === active ? 1 : 0.8 }}
          transition={reduced ? { duration: 0 } : SPRING_PORT}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        >
          {s.ellipse ? (
            <ellipse cx={s.ellipse.cx} cy={s.ellipse.cy} rx={s.ellipse.rx} ry={s.ellipse.ry} fill={s.fill} />
          ) : (
            <path d={s.d} fill={s.fill} stroke={s.stroke ?? "var(--char-ink)"} strokeWidth={s.sw} strokeLinecap="round" />
          )}
        </motion.g>
      ))}
    </g>
  );
}


/* ── The character ────────────────────────────────────────────── */
export function LoginCharacter({
  field,
  passwordVisible,
  status,
  size = "md",
}: {
  field: "none" | "username" | "password";
  passwordVisible: boolean;
  status: "idle" | "loading" | "success" | "error";
  size?: "sm" | "md" | "lg";
}) {
  const reduced = usePrefersReducedMotion();

  /* Mood precedence: auth state > focused field > default */
  const mood: CharacterMood =
    status === "success"
      ? "success"
      : status === "error"
        ? "error"
        : status === "loading"
          ? "loading"
          : field === "username"
            ? "username"
            : field === "password"
              ? passwordVisible
                ? "passwordVisible"
                : "password"
              : "default";

  /* Natural blinking in idle — skipped when reduced motion */
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    if (reduced || mood !== "default") return;
    let t = 0;
    let c = 0;
    const loop = () => {
      t = window.setTimeout(() => {
        setBlink(true);
        c = window.setTimeout(() => setBlink(false), 150);
        loop();
      }, 2600 + Math.random() * 2600);
    };
    loop();
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(c);
    };
  }, [reduced, mood]);

  const eyeSpec = EYE_SPEC[mood];
  const head = HEAD_POSE[mood];
  const idleT = { duration: 5.5, repeat: Infinity, ease: "easeInOut" as const };
  const poseT = reduced ? { duration: 0 } : SPRING_POSE;

  return (
    <div className={`login-char login-char-${size}`} aria-hidden="true">
      <svg viewBox="0 0 220 210" role="presentation" focusable="false">
        {/* Gentle idle float + breathing */}
        <motion.g
          animate={reduced ? { y: 0, rotate: 0 } : { y: [0, -2.6, 0], rotate: [0, 0.9, 0] }}
          transition={reduced ? { duration: 0 } : idleT}
        >
          {/* Torso — teal hoodie */}
          <path
            d="M 74 142 Q 74 130 110 130 Q 146 130 146 142 L 151 200 Q 152 207 145 207 L 75 207 Q 68 207 69 200 Z"
            fill="var(--char-shirt)"
          />
          <path d="M 110 132 L 110 204" stroke="var(--char-shirt-deep)" strokeWidth="2.4" opacity="0.5" />
          <path d="M 92 140 Q 110 152 128 140" fill="none" stroke="var(--char-shirt-deep)" strokeWidth="2.6" opacity="0.55" />
          <path d="M 84 160 L 84 190" stroke="var(--char-shirt-deep)" strokeWidth="2.2" opacity="0.4" strokeLinecap="round" />
          <path d="M 136 160 L 136 190" stroke="var(--char-shirt-deep)" strokeWidth="2.2" opacity="0.4" strokeLinecap="round" />

          {/* Arms */}
          <path
            d="M 76 148 Q 52 158 52 177 Q 52 193 64 193 Q 78 192 80 170 Q 80 158 76 148 Z"
            fill="var(--char-skin)"
            stroke="var(--char-line)"
            strokeWidth="1.4"
          />
          <path
            d="M 144 148 Q 168 158 168 177 Q 168 193 156 193 Q 142 192 140 170 Q 140 158 144 148 Z"
            fill="var(--char-skin)"
            stroke="var(--char-line)"
            strokeWidth="1.4"
          />

          {/* Neck + ears (behind face) */}
          <rect x="96" y="118" width="28" height="30" rx="9" fill="var(--char-skin)" stroke="var(--char-line)" strokeWidth="1.2" />
          <circle cx="61" cy="98" r="8.5" fill="var(--char-skin)" stroke="var(--char-line)" strokeWidth="1.2" />
          <circle cx="159" cy="98" r="8.5" fill="var(--char-skin)" stroke="var(--char-line)" strokeWidth="1.2" />

          {/* Head (pose group: tilt / lean / turn) */}
          <motion.g
            animate={{ rotate: head.r, y: head.y, scale: head.s }}
            transition={poseT}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          >
            {/* Back hair silhouette */}
            <path
              d="M 60 74 Q 58 26 110 24 Q 162 26 160 74 Q 162 102 148 110 Q 136 118 110 118 Q 84 118 72 110 Q 58 102 60 74 Z"
              fill="var(--char-hair-deep)"
            />
            {/* Face */}
            <ellipse cx="110" cy="92" rx="46" ry="50" fill="var(--char-skin)" stroke="var(--char-line)" strokeWidth="1.2" />

            {/* Front fringe */}
            <path
              d="M 62 88 Q 60 56 66 50 Q 74 42 96 46 Q 108 44 116 50 Q 134 44 152 48 Q 162 56 158 88 Q 152 90 150 78 Q 148 60 144 54 Q 140 66 132 54 Q 126 60 120 54 Q 110 60 102 52 Q 94 60 88 54 Q 80 60 74 54 Q 70 66 66 60 Q 62 68 62 88 Z"
              fill="var(--char-hair)"
            />
            <path d="M 78 48 Q 92 38 110 36 Q 96 44 80 58 Z" fill="#ffffff" opacity="0.25" />

            <Brows mood={mood} reduced={reduced} />
            <Eye side="left" spec={eyeSpec("left")} blink={mood === "default" && blink} reduced={reduced} />
            <Eye side="right" spec={eyeSpec("right")} blink={mood === "default" && blink} reduced={reduced} />

            {/* Blush + nose */}
            <ellipse cx="73" cy="101" rx="6" ry="3" fill="#ff9d7a" opacity="0.32" />
            <ellipse cx="147" cy="101" rx="6" ry="3" fill="#ff9d7a" opacity="0.32" />
            <path d="M 108 88 Q 108 97 114 94" fill="none" stroke="var(--char-skin-deep)" strokeWidth="2.6" strokeLinecap="round" />

            <Mouth mood={mood} reduced={reduced} />
          </motion.g>
        </motion.g>
      </svg>
    </div>
  );
}

