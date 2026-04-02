/**
 * RT_TC001_CreateRT.spec.ts
 *
 * Test Suite : RT Lifecycle — RT Creation
 * TCID       : TC_RT_001
 */

import { test, expect } from '../../fixtures/base.fixtures';
import { TestDataManager } from '../../utils/TestDataManager';
import { AllureReportHelper } from '../../utils/AllureReportHelper';
import { Lifecycle, Severity, TestLayer } from '../../config/constants';

test.describe('RT — Create RT', () => {
  test.beforeEach(async () => {
    AllureReportHelper.setLifecycle(Lifecycle.RT);
    AllureReportHelper.setLayer(TestLayer.E2E);
    AllureReportHelper.setFeature('RT Creation');
    AllureReportHelper.setEpic('RT Lifecycle');
  });

  test('TC_RT_001 | Create RT with mandatory fields', async ({ page, logger }) => {
    AllureReportHelper.setSeverity(Severity.BLOCKER);
    AllureReportHelper.linkTestCase('TC_RT_001', 'Create RT');

    const dm = TestDataManager.forLifecycle(Lifecycle.RT);
    const data = dm.getIteration('TC_RT_001', 1);
    AllureReportHelper.addTestDataContext('TC_RT_001', 1, Lifecycle.RT);
    AllureReportHelper.addParameter('RT Title', data.rtTitle as string);

    logger.info('TC_RT_001 — RT creation test (implement RT pages to activate)');
    logger.info(`Test data loaded: ${data.rtTitle}`);

    // TODO: Implement RTLoginPage, CreateRTPage when ready
    expect(data.rtTitle).toBeTruthy();
  });
});
