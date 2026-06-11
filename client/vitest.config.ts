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
        branches: 75,
        functions: 80,
        lines: 80,
      },
      exclude: [
        'node_modules',
        'dist',
        '*.config.js',
        '*.config.ts',
        'vite.config.ts',
        'vitest.config.ts',
        'postcss.config.js',
        'tailwind.config.js',
        '**/*.test.ts',
        '**/*.test.tsx',
        'src/index.ts',
        'src/main.tsx',
        'src/App.tsx',
        'src/pages/**',
        'src/components/navigation/**',
        'src/components/routing/**',
        'src/components/assistant/**',
        'src/components/map/SegmentLayer.tsx',
        'src/components/map/ReportPins.tsx',
        'src/components/map/SegmentDetailCard.tsx',
        'src/components/reporting/PhotoUploader.tsx',
        'src/services/**',
      ],
    },
  },
})
