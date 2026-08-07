import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages project site: https://<user>.github.io/<repo>/
// Override with VITE_BASE=/ for user/org pages or custom domain.
const base = process.env.VITE_BASE || "/parallel-corpus/";

export default defineConfig({
  plugins: [react()],
  base,
});
