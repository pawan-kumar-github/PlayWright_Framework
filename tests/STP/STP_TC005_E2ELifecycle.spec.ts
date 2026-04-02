/**
 * STP_TC005_E2ELifecycle.spec.ts
 *
 * Test Suite : STP Lifecycle — End-to-End Flow
 * TCID       : TC_STP_005
 * Coverage   : Full lifecycle: Login → Create STP → Review → Approve → Verify status
 *
 * This is the crown-jewel E2E test that chains all lifecycle steps together.
 * It demonstrates runtime data sharing between steps via TestDataUpdater.
 */

import { test, expect } from '../../fixtures/stp.fixtures';
import { AllureReportHelper } from '../../utils/AllureReportHelper';
import { Severity, TestLayer } from '../../config/constants';

test.describe('STP — End-to-End Lifecycle', () => {
  test('TC_STP_005 | Full STP lifecycle: Create → Review → Approve', async ({
    authenticatedPage,
    dashboardPage,
    createSTPPage,
    searchSTPPage,
    reviewSTPPage,
    stpDataManager,
    stpDataUpdater,
    logger,
  }) => {
    // ── Allure metadata ─────────────────────────────────────────────────────
    AllureReportHelper.setFeature('STP End-to-End');
    AllureReportHelper.setEpic('STP Lifecycle');
    AllureReportHelper.setLayer(TestLayer.E2E);
    AllureReportHelper.setSeverity(Severity.BLOCKER);
    AllureReportHelper.setStory('Full STP Lifecycle');
    AllureReportHelper.linkTestCase('TC_STP_005', 'E2E STP Lifecycle');
    AllureReportHelper.addTag('E2E', 'STP', 'Regression', 'Smoke');

    const data = stpDataManager.getIteration('TC_STP_005', 1);
    AllureReportHelper.addTestDataContext('TC_STP_005', 1, 'STP');

    // ══════════════════════════════════════════════════════════════════════════
    // PHASE 1: CREATE STP
    // ══════════════════════════════════════════════════════════════════════════
    const stpNumber = await AllureReportHelper.step('PHASE 1: Create STP', async () => {
      logger.step('Starting STP creation phase');

      await AllureReportHelper.step('Open Create STP form', async () => {
        await dashboardPage.clickCreateSTP();
        await createSTPPage.assertFormLoaded();
      });

      const generated = await AllureReportHelper.step('Fill and submit STP', async () => {
        return createSTPPage.fillAndSubmitWithTestData('TC_STP_005', 1);
      });

      logger.info(`Phase 1 complete. STP created: ${generated}`);
      AllureReportHelper.addParameter('Generated STP Number', generated);
      return generated;
    });

    expect(stpNumber).toBeTruthy();
    expect(stpNumber).toMatch(/^STP-/);

    await AllureReportHelper.attachScreenshot('After STP creation', authenticatedPage);

    // ══════════════════════════════════════════════════════════════════════════
    // PHASE 2: NAVIGATE TO STP FOR REVIEW
    // ══════════════════════════════════════════════════════════════════════════
    await AllureReportHelper.step('PHASE 2: Navigate to STP for review', async () => {
      logger.step('Navigating to STP list to find created STP');
      await dashboardPage.navigateToSTPList();
      await searchSTPPage.openSTPByNumber(stpNumber);
      const title = await reviewSTPPage.getSTPTitle();
      expect(title).toContain(data.stpTitle as string);
      logger.info(`Opened STP for review: ${title}`);
    });

    // ══════════════════════════════════════════════════════════════════════════
    // PHASE 3: APPROVE STP
    // ══════════════════════════════════════════════════════════════════════════
    await AllureReportHelper.step('PHASE 3: Approve STP', async () => {
      logger.step('Reviewing and approving STP');
      await reviewSTPPage.approve(data.reviewComment as string, 'TC_STP_005');
    });

    // ══════════════════════════════════════════════════════════════════════════
    // PHASE 4: VERIFY FINAL STATUS
    // ══════════════════════════════════════════════════════════════════════════
    await AllureReportHelper.step('PHASE 4: Verify final STP status', async () => {
      const finalStatus = await reviewSTPPage.getStatus();
      logger.info(`Final STP status: ${finalStatus}`);
      expect(finalStatus).toContain(data.expectedFinalStatus as string);

      // Write final status to runtime data for potential downstream tests
      stpDataUpdater.updateRuntimeField('TC_STP_005', 'finalStatus', finalStatus);
      stpDataUpdater.updateRuntimeField('TC_STP_005', 'completedAt', new Date().toISOString());
    });

    await AllureReportHelper.attachScreenshot('E2E Test Complete', authenticatedPage);
    logger.info('TC_STP_005 — E2E lifecycle test PASSED');
  });
});
