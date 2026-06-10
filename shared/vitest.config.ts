import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      thresholds: {
        statements: 80,
        lines: 80,
      },
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
    },
  },
})
