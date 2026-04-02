import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

const ENV = process.env.ENV || 'staging';
const BASE_URL = process.env.BASE_URL || 'https://toolsqa.com/';

export default defineConfig({
  // Root directory for test files
  testDir: './tests',

  // Glob pattern for test files
  testMatch: '**/*.spec.ts',

  // Maximum time one test can run
  timeout: 60_000,

  // Expect timeout for assertions
  expect: {
    timeout: 10_000,
  },

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if test.only is accidentally left in source code
  forbidOnly: !!process.env.CI,

  // Retry failed tests — 0 locally so self-healing fallbacks are visible in one run;
  // CI keeps retries to handle flakiness in pipeline
  retries: process.env.CI ? 2 : 0,

  // Number of workers (parallel threads)
  workers: process.env.CI ? 4 : 2,

  // Reporter configuration — HTML + Allure dual reporting
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['allure-playwright', {
      detail: true,
      outputFolder: 'allure-results',
      suiteTitle: false,
      environmentInfo: {
        ENV: ENV,
        BASE_URL: BASE_URL,
        PLATFORM: process.platform,
        NODE_VERSION: process.version,
      },
    }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  // Global test settings
  use: {
    // Base URL for relative navigation
    baseURL: BASE_URL,

    // Collect trace on failure for debugging
    trace: 'on-first-retry',

    // Capture screenshot on failure
    screenshot: 'only-on-failure',

    // Record video on failure
    video: 'off',

    // Viewport
    viewport: { width: 1920, height: 1080 },

    // Action timeout
    actionTimeout: 30_000,

    // Navigation timeout
    navigationTimeout: 30_000,

    // Ignore HTTPS errors (for non-prod environments)
    ignoreHTTPSErrors: true,

    // Locale
    locale: 'en-US',

    // Timezone
    timezoneId: 'America/New_York',
  },

  // Output directory for artifacts
  outputDir: 'test-results',

  // Global setup/teardown
  globalSetup: require.resolve('./global/globalSetup'),
  globalTeardown: require.resolve('./global/globalTeardown'),

  // Browser projects — cross-browser support
  projects: [
    // ── Setup project: authenticate once per project ──
    {
      name: 'setup',
      testMatch: '**/global/*.setup.ts',
    },

    // ── Chromium (Google Chrome / MS Edge) ──
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        launchOptions: {
          args: ['--disable-web-security', '--start-maximized'],
        },
      },
      dependencies: ['setup'],
    },

    // ── Firefox ── (disabled)
    // {
    //   name: 'firefox',
    //   use: {
    //     ...devices['Desktop Firefox'],
    //   },
    //   dependencies: ['setup'],
    // },

    // ── WebKit (Safari) ── (disabled)
    // {
    //   name: 'webkit',
    //   use: {
    //     ...devices['Desktop Safari'],
    //   },
    //   dependencies: ['setup'],
    // },

    // ── Microsoft Edge ── (disabled)
    // {
    //   name: 'edge',
    //   use: {
    //     ...devices['Desktop Edge'],
    //     channel: 'msedge',
    //   },
    //   dependencies: ['setup'],
    // },

    // ── Mobile Chrome ── (disabled)
    // {
    //   name: 'mobile-chrome',
    //   use: {
    //     ...devices['Pixel 5'],
    //   },
    //   dependencies: ['setup'],
    // },
  ],
});
