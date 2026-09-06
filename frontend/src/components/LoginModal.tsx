import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, LogOut, X } from "lucide-react";
import { LoginCharacter } from "./LoginCharacter";
import { login, register, setSession } from "../api";
import type { SessionUser } from "../types";

type LoginModalProps = {
  user: SessionUser;
  onSignIn: (user: NonNullable<SessionUser>) => void;
  onSignOut: () => void;
  onClose: () => void;
};

export function LoginModal({ user, onSignIn, onSignOut, onClose }: LoginModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [field, setField] = useState<"none" | "username" | "password">("none");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [authError, setAuthError] = useState("");
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (mode !== "register") return;
    const t = setTimeout(() => submitBtnRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 60);
    return () => clearTimeout(t);
  }, [mode]);

  function resetForm() {
    setName("");
    setEmail("");
    setPassword("");
    setConfirm("");
    setAuthError("");
    setStatus("idle");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    if (mode === "register" && password !== confirm) {
      setAuthError("Passwords do not match.");
      return;
    }
    if (mode === "register" && password.length < 6) {
      setAuthError("Password must be at least 6 characters.");
      return;
    }
    setStatus("loading");
    setAuthError("");
    try {
      const result =
        mode === "login"
          ? await login(email.trim(), password)
          : await register(name.trim(), email.trim(), password);
      setSession(result.token, result.user);
      setStatus("success");
      setTimeout(() => onSignIn(result.user), 400);
    } catch (err) {
      setStatus("error");
      setAuthError(err instanceof Error ? err.message : "Sign in failed.");
    }
  }

  const focusedName = field === "none" ? (mode === "register" ? "username" : "none") : field;

  return (
    <motion.div
      className="modal-backdrop"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="settings-modal login-modal surface"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={user ? "Account" : "Sign in"}
        initial={{ scale: 0.96, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 8 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">Account</span>
            <h2>{user ? "Signed in" : mode === "login" ? "Sign in to QuizForge AI" : "Create your account"}</h2>
          </div>
          <button className="icon-button" aria-label="Close" onClick={onClose}><X size={16} /></button>
        </div>

        {user ? (
          <motion.div className="settings-section" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <div className="login-profile">
              <span className="account-avatar large">{user.name.trim().charAt(0).toUpperCase()}</span>
              <div>
                <strong>{user.name}</strong>
                <span className="field-hint">{user.email}</span>
              </div>
            </div>
            <button className="btn-3d btn-ghost btn-md btn-full" onClick={onSignOut}><LogOut size={15} /> Sign out</button>
            <p className="login-note">Your quizzes and results are stored on this account's server database.</p>
          </motion.div>
        ) : (
          <motion.div className="login-body" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <LoginCharacter field={focusedName} passwordVisible={showPassword} status={status} size="md" />

            <div className="login-greeting">
              <span className="eyebrow">Meet Milo</span>
              <p className="login-note">I'll keep an eye on things while you type — and look away the moment you focus the password field. 🤝</p>
            </div>

            <div className="auth-tabs" role="tablist" aria-label="Auth mode">
              <button className={mode === "login" ? "auth-tab active" : "auth-tab"} onClick={() => { setMode("login"); resetForm(); }}>Sign in</button>
              <button className={mode === "register" ? "auth-tab active" : "auth-tab"} onClick={() => { setMode("register"); resetForm(); }}>Create account</button>
            </div>

            <form className="login-form" onSubmit={submit} noValidate>
              {mode === "register" && (
                <label className="input-field">
                  <span className="field-label">Name</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={() => setField("username")}
                    onBlur={() => setField((f) => (f === "username" ? "none" : f))}
                    placeholder="e.g. Prof. Sharma"
                    autoComplete="name"
                  />
                </label>
              )}
              <label className="input-field">
                <span className="field-label">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setField("username")}
                  onBlur={() => setField((f) => f === "username" ? "none" : f)}
                  placeholder="you@institute.edu"
                  autoComplete="email"
                />
              </label>
              <label className="input-field">
                <span className="field-label">Password</span>
                <div className="password-wrap">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setField("password")}
                    onBlur={() => setField((f) => (f === "password" ? "none" : f))}
                    placeholder="••••••••"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    className="show-toggle"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((s) => !s)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
              {mode === "register" && (
                <label className="input-field">
                  <span className="field-label">Confirm password</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    onFocus={() => setField("password")}
                    onBlur={() => setField((f) => (f === "password" ? "none" : f))}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </label>
              )}

              {authError && <div className="auth-error">{authError}</div>}

              <motion.button ref={submitBtnRef} className="btn-3d btn-auth-submit btn-lg btn-full" type="submit" disabled={status === "loading"} whileTap={{ scale: 0.97 }}>
                {status === "loading" ? <Loader2 size={15} className="spin" /> : null}
                {status === "loading" ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
              </motion.button>
            </form>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
