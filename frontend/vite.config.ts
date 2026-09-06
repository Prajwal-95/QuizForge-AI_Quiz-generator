import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Bind to 0.0.0.0 so the running instance is reachable from the
    // deployed/public hostname (not just this machine's localhost).
    host: true,
    port: 5173,
  },
});