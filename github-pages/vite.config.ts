import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "github-pages",
  base: "/pmi-drc-kmaj-exam-platform/",
  publicDir: "../public",
  plugins: [react()],
  build: {
    outDir: "../gh-pages",
    emptyOutDir: true,
  },
});
