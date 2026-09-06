import { motion } from "framer-motion";

export function SimplePage({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body?: string;
  children?: React.ReactNode;
}) {
  return (
    <motion.div className="page" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="page-title">{title}</h2>
      {body && <p className="field-hint" style={{ maxWidth: 640 }}>{body}</p>}
      {children}
    </motion.div>
  );
}
