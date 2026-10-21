import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base relative : l'admin peut être servie depuis n'importe quel sous-dossier.
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { port: 5173 },
});
