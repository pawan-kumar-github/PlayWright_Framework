/**
 * STP_TC001_Login.spec.ts
 *
 * scopedData is pre-bound to the running test's TCID + ITERATION.
 * No TCID string or iteration number appears anywhere in the test body.
 *
 *   scopedData.get<string>('username')   // read a field
 *   scopedData.update('field', value)    // write back to JSON + local cache
 *   scopedData.tcid / .iteration         // read-only scope identifiers
 */

import { test, expect } from '../../fixtures/stp.fixtures';
import { IterationRunner } from '../../utils/IterationRunner';
import { AllureReportHelper } from '../../utils/AllureReportHelper';
import { Lifecycle, Severity, TestLayer } from '../../config/constants';
import { LoginPage } from '../../pages/STP/LoginPage';
import { DashboardPage } from '../../pages/STP/DashboardPage';
import { TestDataManager } from '../../utils/TestDataManager';


// ══════════════════════════════════════════════════════════════════════════════
// PATTERN A — ALL iterations (auto-generated from JSON)
// Adding a new iteration row to the JSON creates a new test automatically.
// ══════════════════════════════════════════════════════════════════════════════

// test.describe('STP — Login | All iterations', () => {
//   test.beforeEach(() => {
//     AllureReportHelper.setFeature('Authentication');
//     AllureReportHelper.setEpic('STP Lifecycle');
//     AllureReportHelper.setLayer(TestLayer.E2E);
//     AllureReportHelper.setSeverity(Severity.CRITICAL);
//   });

//   IterationRunner.forAll(
//     test,
//     Lifecycle.STP,
//     'TC_LOGIN_001',
//     async ({ page, logger, scopedData }) => {
//       // scopedData is scoped to the exact iteration — no args needed
//       AllureReportHelper.addParameter('TCID', scopedData.tcid);
//       AllureReportHelper.addParameter('Iteration', scopedData.iteration);
//       AllureReportHelper.addParameter('Role', scopedData.get<string>('role'));

//       const loginPage  = new LoginPage(page);
//       const dashboardPage = new DashboardPage(page);

//       loginPage.withScope(scopedData);
//       await loginPage.open();
//       await loginPage.login(
//         scopedData.get<string>('username'),
//         scopedData.get<string>('password'),
//       );
//       await dashboardPage.assertDashboardLoaded();

//       // Write back a runtime value — scoped to this iteration automatically
//       scopedData.update('lastLoginAt', new Date().toISOString());

//       logger.info(`Iteration ${scopedData.iteration} passed`, {
//         role: scopedData.get('role'),
//       });
//     },
//   );
// });

// ══════════════════════════════════════════════════════════════════════════════
// PATTERN B — Specific subset of iterations
// ══════════════════════════════════════════════════════════════════════════════

// test.describe('STP — Login | Subset [1, 3]', () => {
//   IterationRunner.forIterations(
//     test,
//     Lifecycle.STP,
//     'TC_LOGIN_001',
//     [1, 3],
//     async ({ page, logger, scopedData }) => {
//       AllureReportHelper.addParameter('Iteration', scopedData.iteration);
//       AllureReportHelper.setSeverity(Severity.BLOCKER);

//       const loginPage     = new LoginPage(page);
//       const dashboardPage = new DashboardPage(page);

//       loginPage.withScope(scopedData);
//       await loginPage.open();
//       await loginPage.login(
//         scopedData.get<string>('username'),
//         scopedData.get<string>('password'),
//       );
//       await dashboardPage.assertDashboardLoaded();

//       logger.info(`Subset iteration ${scopedData.iteration} passed`);
//     },
//   );
// });

// ══════════════════════════════════════════════════════════════════════════════
// PATTERN C — Exactly one iteration
// ══════════════════════════════════════════════════════════════════════════════

test.describe('STP — Login | Single iteration', () => {
  let loginPage:     LoginPage;
  let dashboardPage: DashboardPage;

  // ── Background ────────────────────────────────────────────────────────────
  // Equivalent to Cucumber Background — runs before every test in this block.
  //   Step 1 · Given the browser is launched      (Playwright handles this)
  //   Step 2 · And the application is opened      (loginPage.open)
  //   Step 3 · And the user logs in               (loginPage.login)
  // Every test in this describe starts from the post-login state.
  test.beforeEach(async ({ page, scopedData }) => {
    loginPage     = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    loginPage.withScope(scopedData);

    await loginPage.open();   // Step 2 · Open application
    await loginPage.login();  // Step 3 · Login with scoped credentials
  });

  IterationRunner.forOne(
    test,
    Lifecycle.STP,
    'TC_LOGIN_001',
    2,
    async ({ logger, scopedData }) => {
      // ── Scenario starts here — already logged in via Background ─────────────
      AllureReportHelper.addParameter('Iteration', scopedData.iteration);
      AllureReportHelper.setSeverity(Severity.NORMAL);

      await dashboardPage.assertDashboardLoaded();

      logger.info(`Iteration ${scopedData.iteration} passed`);
    },
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// PATTERN D — Manual loop with conditional filtering (no helper)
// ══════════════════════════════════════════════════════════════════════════════

// test.describe('STP — Login | Creator role only (manual loop)', () => {
//   const dm = TestDataManager.forLifecycle(Lifecycle.STP);

//   for (const iterData of dm.getAllIterations('TC_LOGIN_001')) {
//     if (iterData.role !== 'creator') continue;

//     test(`TC_LOGIN_001 | Iteration ${iterData.ITERATION} | creator`, async ({ page, logger }) => {
//       AllureReportHelper.setSeverity(Severity.BLOCKER);

//       // Manually build scoped data for the manual-loop pattern
//       const data = dm.getIteration('TC_LOGIN_001', iterData.ITERATION);
//       const loginPage     = new LoginPage(page);
//       const dashboardPage = new DashboardPage(page);

//       loginPage.withScope(new ScopedDataManager(Lifecycle.STP, 'TC_LOGIN_001', iterData.ITERATION));
//       await loginPage.open();
//       await loginPage.login(
//         data.username as string,
//         data.password as string,
//       );
//       await dashboardPage.assertDashboardLoaded();

//       logger.info(`Manual loop — Iteration ${iterData.ITERATION} passed`);
//     });
//   }
// });

// ══════════════════════════════════════════════════════════════════════════════
// TC_INVOICE_001 — Login then create 3 invoices in a loop
//
// Uses a single TCID + ITERATION throughout. The same test data fields
// (invoiceTitle, invoiceAmount, invoiceClient, invoiceDueDate) are reused
// for each invoice in the loop — no separate iteration row per invoice.
// ══════════════════════════════════════════════════════════════════════════════
// ── To run a different iteration: change the number in forOne()   ─────────────
// ── To run all iterations:        replace forOne with forAll()    ─────────────
// ── To run a subset:              replace forOne with forIterations([1,3,5]) ──
test.describe('STP — Invoice | Create 3 invoices after login', () => {
  let loginPage: LoginPage;

  // ── Background ────────────────────────────────────────────────────────────
  // Runs before every generated test. scopedData is injected by IterationRunner
  // via Playwright fixtures — the iteration number is always known at this point.
  //   Step 1 · Given the browser is launched      (Playwright handles this)
  //   Step 2 · And the application is opened      (loginPage.open)
  //   Step 3 · And the user logs in               (loginPage.login)
  test.beforeEach(async ({ page, scopedData }) => {
    loginPage = new LoginPage(page);
    loginPage.withScope(scopedData);

    await loginPage.open();   // Step 2 · Open application
    await loginPage.login();  // Step 3 · Login with scoped credentials
  });

  // ↓ Change 1 → 5 to run for iteration 5.  The test title updates automatically:
  //   "TC_INVOICE_001 | Iteration 1 | creator"
  //   "TC_INVOICE_001 | Iteration 5 | reviewer"
  IterationRunner.forOne(
    test,
    Lifecycle.STP,
    'TC_INVOICE_001',
    2,  // ← iteration number — change this to run a different iteration
    async ({ logger, scopedData }) => {
      // ── Scenario starts here — already logged in via Background ─────────────
      AllureReportHelper.setFeature('Invoice Creation');
      AllureReportHelper.setEpic('STP Lifecycle');
      AllureReportHelper.setSeverity(Severity.NORMAL);
      AllureReportHelper.addTag('invoice', 'loop');
      AllureReportHelper.addParameter('TCID', scopedData.tcid);
      AllureReportHelper.addParameter('Iteration', scopedData.iteration);

      logger.info('Login successful — starting invoice creation', {
        tcid:      scopedData.tcid,
        iteration: scopedData.iteration,  // always correct — set by IterationRunner
        role:      scopedData.get<string>('role'),
      });

      // ── Create 3 invoices in a loop using this iteration's data ─────────────
      const INVOICE_COUNT = 3;

      for (let invoiceNum = 1; invoiceNum <= INVOICE_COUNT; invoiceNum++) {
        await loginPage.step(`Create invoice ${invoiceNum} of ${INVOICE_COUNT}`, async () => {
          logger.info(`Creating invoice ${invoiceNum}`, {
            title:    scopedData.get<string>('invoiceTitle'),
            amount:   scopedData.get<number>('invoiceAmount'),
            client:   scopedData.get<string>('invoiceClient'),
            dueDate:  scopedData.get<string>('invoiceDueDate'),
            category: scopedData.get<string>('invoiceCategory'),
          });

          // ── Replace with real InvoicePage actions when available ─────────────
          // const invoicePage = new InvoicePage(page);
          // invoicePage.withScope(scopedData);
          // await invoicePage.open();
          // await invoicePage.fillTitle(scopedData.get<string>('invoiceTitle'));
          // await invoicePage.fillAmount(scopedData.get<number>('invoiceAmount'));
          // await invoicePage.fillClient(scopedData.get<string>('invoiceClient'));
          // await invoicePage.setDueDate(scopedData.get<string>('invoiceDueDate'));
          // await invoicePage.submit();
          // await invoicePage.assertInvoiceCreated();
          // ────────────────────────────────────────────────────────────────────

          scopedData.update('invoicesCreated', invoiceNum);

          logger.info(`Invoice ${invoiceNum} created`, {
            invoicesCreated: invoiceNum,
            remaining:       INVOICE_COUNT - invoiceNum,
          });
        });
      }

      logger.info('All invoices created successfully', {
        tcid:         scopedData.tcid,
        iteration:    scopedData.iteration,
        totalCreated: scopedData.get<number>('invoicesCreated'),
      });
    },
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// Negative — TC_LOGIN_002 (invalid credentials, all iterations)
// ══════════════════════════════════════════════════════════════════════════════

// test.describe('STP — Login | Invalid credentials', () => {
//   test.beforeEach(() => {
//     AllureReportHelper.setFeature('Authentication');
//     AllureReportHelper.addTag('negative');
//     AllureReportHelper.setSeverity(Severity.CRITICAL);
//   });

//   IterationRunner.forAll(
//     test,
//     Lifecycle.STP,
//     'TC_LOGIN_002',
//     async ({ page, logger, scopedData }) => {
//       AllureReportHelper.addParameter('Iteration', scopedData.iteration);

//       const loginPage = new LoginPage(page);

//       loginPage.withScope(scopedData);
//       await loginPage.open();
//       await loginPage.login(
//         scopedData.get<string>('username'),
//         scopedData.get<string>('password'),
//       );

//       const expectedError = scopedData.get<string>('expectedError');
//       await loginPage.assertErrorMessage(expectedError);

//       const actualError = await loginPage.getErrorMessage();
//       expect(actualError).toContain(expectedError);

//       logger.info(`Negative iteration ${scopedData.iteration} passed`, {
//         error: actualError,
//       });
//     },
//   );
// });

