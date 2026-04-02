/**
 * STP_TC002_CreateSTP.spec.ts
 *
 * Test Suite : STP Lifecycle — STP Creation
 * TCID range : TC_STP_001, TC_STP_002
 * Coverage   : Create STP with mandatory fields, with optional fields/attachment
 *
 * Uses stp.fixtures so that login is handled by the authenticatedPage fixture.
 */

import { test, expect } from '../../fixtures/stp.fixtures';
import { AllureReportHelper } from '../../utils/AllureReportHelper';
import { Severity, TestLayer } from '../../config/constants';

test.describe('STP — Create STP', () => {
  test.beforeEach(async () => {
    AllureReportHelper.setFeature('STP Creation');
    AllureReportHelper.setEpic('STP Lifecycle');
    AllureReportHelper.setLayer(TestLayer.E2E);
  });

  // ── TC_STP_001 · Iteration 1 — Create STP with mandatory fields ──────────
  test('TC_STP_001 | Create STP with all mandatory fields', async ({
    authenticatedPage,
    dashboardPage,
    createSTPPage,
    stpDataManager,
    logger,
  }) => {
    AllureReportHelper.setSeverity(Severity.BLOCKER);
    AllureReportHelper.setStory('Create STP');
    AllureReportHelper.linkTestCase('TC_STP_001', 'Create STP - Mandatory Fields');

    const data = stpDataManager.getIteration('TC_STP_001', 1);
    AllureReportHelper.addTestDataContext('TC_STP_001', 1, 'STP');
    AllureReportHelper.addParameter('STP Title', data.stpTitle as string);

    // ── Step 1: Navigate to create STP ──────────────────────────────────────
    await AllureReportHelper.step('Navigate to Create STP form', async () => {
      await dashboardPage.clickCreateSTP();
      await createSTPPage.assertFormLoaded();
      logger.step('Create STP form opened');
    });

    // ── Step 2: Fill and submit ──────────────────────────────────────────────
    const stpNumber = await AllureReportHelper.step('Fill and submit STP form', async () => {
      return createSTPPage.fillAndSubmitWithTestData('TC_STP_001', 1);
    });

    // ── Step 3: Assert success ───────────────────────────────────────────────
    await AllureReportHelper.step('Assert STP creation success', async () => {
      logger.info(`STP created: ${stpNumber}`);
      expect(stpNumber).toBeTruthy();
      expect(stpNumber).toMatch(/^STP-/);
    });

    // The generated STP number has already been written to test data JSON
    // by CreateSTPPage.fillAndSubmit() via TestDataUpdater.
    logger.info(`TC_STP_001 completed. Generated: ${stpNumber}`);
  });

  // ── TC_STP_001 · Iteration 2 — Critical priority STP ────────────────────
  test('TC_STP_001 | Create Critical priority STP', async ({
    authenticatedPage,
    dashboardPage,
    createSTPPage,
    stpDataManager,
    logger,
  }) => {
    AllureReportHelper.setSeverity(Severity.CRITICAL);
    AllureReportHelper.setStory('Create STP');
    AllureReportHelper.addTag('critical-priority');

    const data = stpDataManager.getIteration('TC_STP_001', 2);
    AllureReportHelper.addTestDataContext('TC_STP_001', 2, 'STP');
    AllureReportHelper.addParameter('Priority', data.priority as string);

    await dashboardPage.clickCreateSTP();
    await createSTPPage.assertFormLoaded();

    const stpNumber = await createSTPPage.fillAndSubmitWithTestData('TC_STP_001', 2);

    expect(stpNumber).toBeTruthy();
    logger.info(`Critical STP created: ${stpNumber}`);
  });

  // ── TC_STP_002 · Iteration 1 — With optional fields ─────────────────────
  test('TC_STP_002 | Create STP with optional fields and category', async ({
    authenticatedPage,
    dashboardPage,
    createSTPPage,
    stpDataManager,
    logger,
  }) => {
    AllureReportHelper.setSeverity(Severity.NORMAL);
    AllureReportHelper.setStory('Create STP - Optional Fields');
    AllureReportHelper.addTag('optional-fields');

    const data = stpDataManager.getIteration('TC_STP_002', 1);
    AllureReportHelper.addTestDataContext('TC_STP_002', 1, 'STP');

    await dashboardPage.clickCreateSTP();
    await createSTPPage.assertFormLoaded();

    const stpNumber = await createSTPPage.fillAndSubmitWithTestData('TC_STP_002', 1);

    expect(stpNumber).toBeTruthy();
    await AllureReportHelper.attachScreenshot('STP with optional fields created', authenticatedPage);
    logger.info(`STP with optional fields created: ${stpNumber}`);
  });
});
