import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base absolue : indispensable pour ouvrir directement une URL profonde
// (/clients/…) avec la navigation par chemins. Si l'admin est servie dans un
// sous-dossier, définir VITE_BASE (ex. VITE_BASE=/admin/).
// Les bibliothèques sont isolées dans des fichiers séparés, mis en cache par le
// navigateur d'une version à l'autre (chargements suivants plus rapides).
export default defineConfig({
  base: process.env.VITE_BASE || "/",
  plugins: [react()],
  server: { port: 5173 },
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-antd": ["antd", "@ant-design/icons"],
          "vendor-refine": ["@refinedev/core", "@refinedev/supabase", "@refinedev/react-router-v6", "@supabase/supabase-js"],
          "vendor-charts": ["recharts"],
        },
      },
    },
  },
});
