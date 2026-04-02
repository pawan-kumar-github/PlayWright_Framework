import { Page } from '@playwright/test';
import { test as baseTest } from './base.fixtures';
import { LoginPage } from '../pages/STP/LoginPage';
import { DashboardPage } from '../pages/STP/DashboardPage';
import { CreateSTPPage } from '../pages/STP/CreateSTPPage';
import { ReviewSTPPage } from '../pages/STP/ReviewSTPPage';
import { SearchSTPPage } from '../pages/STP/SearchSTPPage';
import { TestDataManager } from '../utils/TestDataManager';
import { TestDataUpdater } from '../utils/TestDataUpdater';
import { Lifecycle, Severity, TestLayer } from '../config/constants';
import { AllureReportHelper } from '../utils/AllureReportHelper';

// ─── STP fixture types (new fixtures only — BaseFixtures are inherited from baseTest) ──

export interface STPFixtures {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  createSTPPage: CreateSTPPage;
  reviewSTPPage: ReviewSTPPage;
  searchSTPPage: SearchSTPPage;
  stpDataManager: TestDataManager;
  stpDataUpdater: TestDataUpdater;
  /** Pre-authenticated page — login happens once in beforeEach */
  authenticatedPage: Page;
}

/**
 * stp.fixtures.ts — STP lifecycle test fixture.
 *
 * Import `test` and `expect` from this file in all STP spec files.
 * Provides all STP page objects, the data manager, and data updater.
 * Performs login before each test and logout after.
 */
export const test = baseTest.extend<STPFixtures>({
  // ── Data utilities ──────────────────────────────────────────────────────
  stpDataManager: async ({}, use) => {
    const manager = TestDataManager.forLifecycle(Lifecycle.STP);
    await use(manager);
  },

  stpDataUpdater: async ({}, use) => {
    const updater = new TestDataUpdater(Lifecycle.STP);
    await use(updater);
  },

  // ── Page object fixtures ─────────────────────────────────────────────────
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  createSTPPage: async ({ page }, use) => {
    await use(new CreateSTPPage(page));
  },

  reviewSTPPage: async ({ page }, use) => {
    await use(new ReviewSTPPage(page));
  },

  searchSTPPage: async ({ page }, use) => {
    await use(new SearchSTPPage(page));
  },

  // ── Authenticated page — login before each test ──────────────────────────
  authenticatedPage: async ({ page, loginPage, dashboardPage, logger }, use, testInfo) => {
    // Set Allure metadata before each test
    AllureReportHelper.setLifecycle(Lifecycle.STP);
    AllureReportHelper.setLayer(TestLayer.E2E);
    AllureReportHelper.setSeverity(Severity.NORMAL);
    AllureReportHelper.addTag('STP', 'Regression');
    AllureReportHelper.setDescription(
      `**Test:** ${testInfo.title}\n**Project:** ${testInfo.project.name}\n**File:** ${testInfo.file}`,
    );

    logger.info(`Setting up authenticated session for: ${testInfo.title}`);

    await loginPage.open();
    await loginPage.loginWithTestData('TC_LOGIN_001', 1);
    await dashboardPage.assertDashboardLoaded();

    logger.info('Authentication complete');
    await use(page);

    // Teardown: capture final screenshot on failure
    if (testInfo.status !== 'passed') {
      await AllureReportHelper.attachScreenshot(`FAILURE - ${testInfo.title}`, page);
    }
  },
});

export { expect } from '@playwright/test';
export default test;
