import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 1,
  workers: 1,
  timeout: 90_000,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-report' }]],
  use: {
    baseURL: 'https://closeeye.in',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
  },
  projects: [
    { name: 'setup-admin', testMatch: /setup\/admin\.setup\.ts/ },
    { name: 'setup-family', testMatch: /setup\/family\.setup\.ts/ },
    {
      name: 'tier1-safety',
      testMatch: /tier1-safety\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/family.json' },
      dependencies: ['setup-family'],
    },
    {
      name: 'tier2-money',
      testMatch: /tier2-money\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/family.json' },
      dependencies: ['setup-family'],
    },
    {
      name: 'tier3-nav',
      testMatch: /tier3-nav\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/admin.json' },
      dependencies: ['setup-admin'],
    },
  ],
})
