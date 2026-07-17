import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Test harness for correctness-first work (e.g. the Identity Shadow adapter).
// Node environment only — these are pure-logic tests, no DOM. The '@' alias
// mirrors the app's tsconfig path so tests import the same way the app does.
//
// '@shared' reaches the ONE crisis floor that Connect and the Deno edge functions both
// import (supabase/functions/_shared/crisis.ts). It mirrors tsconfig's path + next.config's
// externalDir, so a test imports it exactly as the app does. `include` also picks up the
// edge functions' own suite — Ask had zero tests until 2026-07-17, and the floor it stands
// on is now shared, so both surfaces are gated by the same run.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', '../supabase/functions/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@shared': path.resolve(process.cwd(), '../supabase/functions/_shared'),
      '@': path.resolve(process.cwd()),
    },
  },
})
