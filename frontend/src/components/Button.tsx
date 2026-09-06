import { forwardRef } from "react";

/* ────────────────────────────────────────────────────────────────
   Shared Button — premium 3D/depth interaction via CSS box-shadow
   layers.

   Depth system (styles.css):
     .btn-3d applies layered box-shadows that simulate elevation.
     :hover raises the button and deepens the shadow.
     :active (press) drops it down and flattens the shadow.
   ──────────────────────────────────────────────────────────────── */

type Variant = "primary" | "ghost" | "danger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  full?: boolean;
  leading?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", full = false, leading, className = "", children, ...props },
  ref
) {
  const cls = ["btn-3d", `btn-${variant}`, `btn-${size}`, full ? "btn-full" : ""]
    .filter(Boolean)
    .concat(className)
    .join(" ");

  return (
    <button ref={ref} className={cls} {...props}>
      {leading && <span className="btn-leading">{leading}</span>}
      <span className="btn-label">{children}</span>
    </button>
  );
});
