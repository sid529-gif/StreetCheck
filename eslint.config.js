import js from '@eslint/js'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import reactPlugin from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  js.configs.recommended,

  // TypeScript — shared and server
  {
    files: ['shared/src/**/*.ts', 'server/src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { project: true },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      ...tsPlugin.configs['recommended-type-checked'].rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    },
  },

  // TypeScript + React — client
  {
    files: ['client/src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { project: true },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
      'react-hooks': reactHooks,
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...tsPlugin.configs['recommended-type-checked'].rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },

  // Ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.specify/**',
      '**/.speckit/**',
      'prisma/migrations/**',
    ],
  },
]
