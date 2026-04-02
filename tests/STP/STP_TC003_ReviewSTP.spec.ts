/**
 * STP_TC003_ReviewSTP.spec.ts
 *
 * Test Suite : STP Lifecycle — STP Review & Approval
 * TCID range : TC_STP_003
 * Coverage   : Approve STP, Reject STP, Return for rework
 *
 * Pre-condition: TC_STP_001 must have run and written a generatedSTPNumber to runtimeData.
 * This test reads that runtime value via TestDataManager.getRuntimeField().
 */

import { test, expect } from '../../fixtures/stp.fixtures';
import { AllureReportHelper } from '../../utils/AllureReportHelper';
import { Severity, TestLayer } from '../../config/constants';

test.describe('STP — Review & Approval', () => {
  test.beforeEach(async () => {
    AllureReportHelper.setFeature('STP Review');
    AllureReportHelper.setEpic('STP Lifecycle');
    AllureReportHelper.setLayer(TestLayer.E2E);
  });

  // ── TC_STP_003 · Iteration 1 — Approve STP ──────────────────────────────
  test('TC_STP_003 | Reviewer approves an STP', async ({
    authenticatedPage,
    dashboardPage,
    searchSTPPage,
    reviewSTPPage,
    stpDataManager,
    stpDataUpdater,
    logger,
  }) => {
    AllureReportHelper.setSeverity(Severity.BLOCKER);
    AllureReportHelper.setStory('Approve STP');
    AllureReportHelper.linkTestCase('TC_STP_003', 'STP Review - Approve');

    const data = stpDataManager.getIteration('TC_STP_003', 1);
    AllureReportHelper.addTestDataContext('TC_STP_003', 1, 'STP');

    // Retrieve the STP number created in TC_STP_001 from runtime data
    // (or use the value from the test data JSON if it was pre-populated)
    let stpNumberToReview = data.stpNumberToReview as string;
    if (!stpNumberToReview) {
      try {
        stpNumberToReview = stpDataManager.getRuntimeField('TC_STP_001', 'generatedSTPNumber') as string;
        logger.info(`Using runtime STP number from TC_STP_001: ${stpNumberToReview}`);
      } catch {
        logger.warn('No runtime STP number found; using pre-set value from test data');
      }
    }

    AllureReportHelper.addParameter('STP Number', stpNumberToReview || 'N/A');

    // ── Step 1: Navigate to STP and open it ─────────────────────────────────
    await AllureReportHelper.step('Open STP for review', async () => {
      await dashboardPage.navigateToSTPList();
      if (stpNumberToReview) {
        await searchSTPPage.openSTPByNumber(stpNumberToReview);
      }
    });

    // ── Step 2: Approve ──────────────────────────────────────────────────────
    await AllureReportHelper.step('Approve STP', async () => {
      await reviewSTPPage.approve(data.reviewComment as string, 'TC_STP_003');
    });

    // ── Step 3: Assert status ────────────────────────────────────────────────
    await AllureReportHelper.step('Assert STP status is Approved', async () => {
      const status = await reviewSTPPage.getStatus();
      expect(status).toContain(data.expectedStatus as string);
      logger.info(`STP status after approval: ${status}`);

      // Write back the final status to test data
      stpDataUpdater.updateRuntimeField('TC_STP_003', 'finalStatus', status);
    });

    await AllureReportHelper.attachScreenshot('After approval', authenticatedPage);
  });

  // ── TC_STP_003 · Iteration 2 — Reject STP ───────────────────────────────
  test('TC_STP_003 | Reviewer rejects an STP with comment', async ({
    authenticatedPage,
    dashboardPage,
    searchSTPPage,
    reviewSTPPage,
    stpDataManager,
    logger,
  }) => {
    AllureReportHelper.setSeverity(Severity.CRITICAL);
    AllureReportHelper.setStory('Reject STP');
    AllureReportHelper.addTag('negative');

    const data = stpDataManager.getIteration('TC_STP_003', 2);
    AllureReportHelper.addTestDataContext('TC_STP_003', 2, 'STP');

    await AllureReportHelper.step('Open STP for review', async () => {
      await dashboardPage.navigateToSTPList();
    });

    await AllureReportHelper.step('Reject STP with reason', async () => {
      await reviewSTPPage.reject(data.reviewComment as string, 'TC_STP_003');
    });

    await AllureReportHelper.step('Assert STP status is Rejected', async () => {
      const status = await reviewSTPPage.getStatus();
      expect(status).toContain(data.expectedStatus as string);
      logger.info(`STP rejected. Status: ${status}`);
    });
  });
});
