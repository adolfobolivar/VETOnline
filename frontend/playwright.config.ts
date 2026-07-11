import { defineConfig, devices } from '@playwright/test';

// .env.test carries the E2E Cognito test account (testing.md §5) plus the same
// VITE_*/dev-stack values as .env.development — loaded here (not by Vite) because this file
// runs in Playwright's own Node process, separate from the app it drives.
process.loadEnvFile('.env.test');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  // This suite runs against the real deployed dev API/Cognito (testing.md §5, not a mock) —
  // 5s (Playwright's default) is occasionally too tight under concurrent load (Lambda cold
  // starts, several parallel Cognito SRP logins), confirmed by rerunning individually-flaky
  // assertions in isolation and seeing them pass reliably. Widened rather than serialized, to
  // keep the suite fast while giving real network variance enough headroom.
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },

  // Chromium only — Chrome is the only supported browser for this project (requirements.md
  // C-018, testing.md §5). Do not add firefox/webkit projects here.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev -- --mode test',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
