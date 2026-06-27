import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Base path:
//   GitHub Pages → VITE_BASE_URL=/StreetCheck/   (set in GitHub Actions secret)
//   GitLab Pages → VITE_BASE_URL=/               (GitLab Pages uses root for project pages)
//   Local dev    → '/' (default)
export default defineConfig({
  base: process.env.VITE_BASE_URL ?? '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@streetcheck/shared': resolve(__dirname, '../shared/src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
