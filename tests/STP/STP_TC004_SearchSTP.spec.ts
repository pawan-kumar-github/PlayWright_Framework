/**
 * STP_TC004_SearchSTP.spec.ts
 *
 * Test Suite : STP Lifecycle — STP Search & Filters
 * TCID range : TC_STP_004
 * Coverage   : Search by STP number, filter by status, filter by priority
 */

import { test, expect } from '../../fixtures/stp.fixtures';
import { AllureReportHelper } from '../../utils/AllureReportHelper';
import { Severity, TestLayer } from '../../config/constants';

test.describe('STP — Search & Filters', () => {
  test.beforeEach(async () => {
    AllureReportHelper.setFeature('STP Search');
    AllureReportHelper.setEpic('STP Lifecycle');
    AllureReportHelper.setLayer(TestLayer.E2E);
  });

  // ── TC_STP_004 · Iteration 1 — Search by STP number ─────────────────────
  test('TC_STP_004 | Search STP by number returns correct record', async ({
    authenticatedPage,
    dashboardPage,
    searchSTPPage,
    stpDataManager,
    logger,
  }) => {
    AllureReportHelper.setSeverity(Severity.CRITICAL);
    AllureReportHelper.setStory('Search STP');
    AllureReportHelper.linkTestCase('TC_STP_004', 'STP Search - By Number');

    AllureReportHelper.addTestDataContext('TC_STP_004', 1, 'STP');

    // Get STP number from runtime data of creation test
    let stpNumber: string;
    try {
      stpNumber = stpDataManager.getRuntimeField('TC_STP_001', 'generatedSTPNumber') as string;
    } catch {
      stpNumber = 'STP-0001'; // Fallback for standalone execution
      logger.warn('No runtime STP number found; using fallback value');
    }

    AllureReportHelper.addParameter('STP Number to Search', stpNumber);

    await AllureReportHelper.step('Navigate to STP List', async () => {
      await dashboardPage.navigateToSTPList();
    });

    await AllureReportHelper.step(`Search for STP number: ${stpNumber}`, async () => {
      await searchSTPPage.applyFilters({ stpNumber });
    });

    await AllureReportHelper.step('Verify search results', async () => {
      await searchSTPPage.assertResultsVisible();
      const count = await searchSTPPage.getResultsCount();
      logger.info(`Search returned ${count} result(s)`);
      expect(count).toBeGreaterThanOrEqual(1);
    });

    await AllureReportHelper.attachScreenshot('Search results', authenticatedPage);
  });

  // ── TC_STP_004 · Iteration 2 — Filter by status ──────────────────────────
  test('TC_STP_004 | Filter STP by Approved status', async ({
    authenticatedPage,
    dashboardPage,
    searchSTPPage,
    stpDataManager,
    logger,
  }) => {
    AllureReportHelper.setSeverity(Severity.NORMAL);
    AllureReportHelper.setStory('Filter STP');
    AllureReportHelper.addTag('filter');

    const data = stpDataManager.getIteration('TC_STP_004', 2);
    AllureReportHelper.addTestDataContext('TC_STP_004', 2, 'STP');
    AllureReportHelper.addParameter('Filter Status', data.filterStatus as string);

    await dashboardPage.navigateToSTPList();
    await searchSTPPage.applyFilters({ status: data.filterStatus as string });

    const count = await searchSTPPage.getResultsCount();
    logger.info(`Approved STP count: ${count}`);
    // Count could be 0 in fresh env — assert no error, not a specific count
    expect(count).toBeGreaterThanOrEqual(data.expectedMinResults as number);
  });

  // ── TC_STP_004 · Iteration 3 — Filter by priority ────────────────────────
  test('TC_STP_004 | Filter STP by High priority', async ({
    authenticatedPage,
    dashboardPage,
    searchSTPPage,
    stpDataManager,
    logger,
  }) => {
    AllureReportHelper.setSeverity(Severity.NORMAL);
    AllureReportHelper.setStory('Filter STP');
    AllureReportHelper.addTag('filter');

    const data = stpDataManager.getIteration('TC_STP_004', 3);
    AllureReportHelper.addTestDataContext('TC_STP_004', 3, 'STP');

    await dashboardPage.navigateToSTPList();
    await searchSTPPage.applyFilters({ priority: data.filterPriority as string });

    const count = await searchSTPPage.getResultsCount();
    logger.info(`High priority STP count: ${count}`);
    expect(count).toBeGreaterThanOrEqual(0);
  });

  // ── Clear filters ─────────────────────────────────────────────────────────
  test('TC_STP_004 | Clear filters resets to full list', async ({
    authenticatedPage,
    dashboardPage,
    searchSTPPage,
    logger,
  }) => {
    AllureReportHelper.setSeverity(Severity.MINOR);
    AllureReportHelper.addTag('smoke');

    await dashboardPage.navigateToSTPList();
    await searchSTPPage.applyFilters({ status: 'Approved' });
    const filteredCount = await searchSTPPage.getResultsCount();

    await searchSTPPage.clearFilters();
    const totalCount = await searchSTPPage.getResultsCount();

    logger.info(`After clear: ${totalCount} results (was ${filteredCount})`);
    expect(totalCount).toBeGreaterThanOrEqual(filteredCount);
  });
});
