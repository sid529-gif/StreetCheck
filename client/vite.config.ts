import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages hosts at /StreetCheck/ — set base in CI via VITE_BASE_URL
// Locally it stays as '/'
export default defineConfig({
  base: process.env.VITE_BASE_URL || '/StreetCheck/',
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
