import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@streetcheck/shared': resolve(__dirname, '../shared/src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      thresholds: {
        statements: 80,
        lines: 80,
      },
    },
  },
})
