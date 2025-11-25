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
    // Temporarily disabled: mode === 'production' && stripConsolePlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Additional production optimizations
  build: {
    // Remove console logs in production builds (Terser will strip all console.* statements)
    minify: mode === 'production' ? 'terser' : false,
    terserOptions: mode === 'production' ? {
      compress: {
        drop_console: true, // Removes ALL console.log, console.warn, console.info, console.debug
        drop_debugger: true, // Removes debugger statements
        pure_funcs: ['console.log', 'console.debug', 'console.info', 'console.warn'], // Additional safety
      },
    } : undefined,
    // Source maps only in development
    sourcemap: mode === 'development',
  },
}));
