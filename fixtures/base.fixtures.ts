import { test as baseTest, type Page } from '@playwright/test';
import { Logger } from '../utils/Logger';
import { AllureReportHelper } from '../utils/AllureReportHelper';
import { ScopedDataManager } from '../utils/ScopedDataManager';
import { IterationContext } from '../utils/IterationRunner';
import { Lifecycle } from '../config/constants';

// ─── Base fixture types ───────────────────────────────────────────────────────

export interface BaseFixtures {
  logger: Logger;
  allure: typeof AllureReportHelper;
  /** Iteration data injected by IterationRunner — undefined in non-iteration tests */
  data: IterationContext;
  /**
   * Pre-bound ScopedDataManager for the current iteration.
   * Automatically populated by IterationRunner via test annotations.
   * Undefined in non-iteration tests — accessing it will throw a clear error.
   */
  scopedData: ScopedDataManager;
  /** Convenience: attach a screenshot at any point in a test */
  captureScreen: (name: string) => Promise<void>;
}

/**
 * base.fixtures.ts — Root fixture extension.
 *
 * Provides:
 *   - logger: contextual Logger instance named after the test
 *   - allure: static AllureReportHelper (no setup needed)
 *   - captureScreen: shorthand for screenshot attachment
 *
 * All lifecycle-specific fixtures extend this.
 */
export const test = baseTest.extend<BaseFixtures>({
  logger: async ({}, use, testInfo) => {
    const log = new Logger(testInfo.title);
    log.info(`▶ TEST START: ${testInfo.title}`, {
      project: testInfo.project.name,
      file: testInfo.file,
    });
    await use(log);
    log.info(`◀ TEST END: ${testInfo.title} [${testInfo.status}]`);
  },

  allure: async ({}, use) => {
    await use(AllureReportHelper);
  },

  // Placeholder — overridden by IterationRunner when registering iteration tests.
  // Accessing this in a non-iteration test throws a clear error instead of crashing silently.
  data: async ({}, use) => {
    await use(undefined as unknown as IterationContext);
  },

  // Populated automatically by IterationRunner via test annotations (_iteration_tcid,
  // _iteration_num, _iteration_lifecycle). Undefined in non-iteration tests.
  scopedData: async ({}, use, testInfo) => {
    const tcid       = testInfo.annotations.find(a => a.type === '_iteration_tcid')?.description;
    const iterStr    = testInfo.annotations.find(a => a.type === '_iteration_num')?.description;
    const lifecycle  = testInfo.annotations.find(a => a.type === '_iteration_lifecycle')?.description as Lifecycle | undefined;

    if (tcid && iterStr && lifecycle) {
      await use(new ScopedDataManager(lifecycle, tcid, parseInt(iterStr, 10)));
    } else {
      await use(undefined as unknown as ScopedDataManager);
    }
  },

  captureScreen: async ({ page }, use) => {
    await use(async (name: string) => {
      await AllureReportHelper.attachScreenshot(name, page);
    });
  },
});

export { expect } from '@playwright/test';
export default test;
