import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" makes the build use relative asset paths, so it works on any
// static host (Netlify, Vercel, GitHub Pages project sites, a subfolder, ...).
export default defineConfig({
  plugins: [react()],
  base: "./",
});
