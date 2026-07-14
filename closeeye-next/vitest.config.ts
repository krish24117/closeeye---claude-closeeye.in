import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Test harness for correctness-first work (e.g. the Identity Shadow adapter).
// Node environment only — these are pure-logic tests, no DOM. The '@' alias
// mirrors the app's tsconfig path so tests import the same way the app does.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(process.cwd()) },
  },
})
