import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path";

// No manual vendor chunking. React 19 internals share state via cross-module
// references that break when react / react-dom are split across chunks. We
// rely on:
//   1. Route-level React.lazy() in App.jsx — one chunk per page.
//   2. Dynamic import() for heavy on-demand libs (e.g. xlsx in LeadsUploadPage).
//   3. Rollup's default vendor chunking, which keeps React intact.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    // 5502 for this dialer (5500/5501 belong to the other dialer on this machine).
    port: 5501,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
})
