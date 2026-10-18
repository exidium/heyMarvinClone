import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Served from https://exidium.github.io/heyMarvinClone/
export default defineConfig({
  base: "/heyMarvinClone/",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@lib": new URL("../src/lib", import.meta.url).pathname } },
});
