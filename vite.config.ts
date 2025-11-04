import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { stripConsolePlugin } from "./src/plugins/stripConsole";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: process.env.DEPLOY_ENV === 'GH_PAGES' ? '/pickfirst-firstlook-signup/' : '/',
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    mode === 'production' && stripConsolePlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Additional production optimizations
  build: {
    // Remove console logs in production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // Source maps only in development
    sourcemap: mode === 'development',
  },
}));
