import { defineConfig, devices } from '@playwright/test';

// E2e tests run against the rsbuild dev server, where MSW intercepts all API
// calls (see src/bootstrap.tsx) — no real backend is ever contacted.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  expect: {
    toHaveScreenshot: {
      // Freeze CSS animations/transitions so pixel diffs stay deterministic.
      animations: 'disabled',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3001',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
