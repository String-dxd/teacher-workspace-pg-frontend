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
    // The first page load after a cold dev-server start compiles the app and
    // installs the MSW service worker, which can exceed the default 5s.
    timeout: 15_000,
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
