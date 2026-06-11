import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@streetcheck/shared': resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
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
        'vitest.config.ts',
        '**/*.test.ts',
        '**/*.test.tsx',
        'src/index.ts',
        'src/jobs/**',
        'src/db/**',
        'src/services/routingService.ts',
        'src/services/aiClient.ts',
        'src/routes/ai.ts',
        'src/routes/routes.ts',
        'src/routes/stats.ts',
        'src/env.ts',
      ],
    },
  },
})
