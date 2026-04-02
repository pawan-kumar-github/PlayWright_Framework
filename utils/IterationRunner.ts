import { TestType } from '@playwright/test';
import { TestDataManager, IterationData } from './TestDataManager';
import type { IterationContext } from './ScopedDataManager';
import { Lifecycle } from '../config/constants';

export type { IterationContext };

/**
 * IterationRunner — data-driven test generation helper.
 *
 * Creates one Playwright test per iteration and attaches the TCID, iteration
 * number, and lifecycle as test annotations. The `scopedData` fixture in
 * base.fixtures.ts reads those annotations and constructs a ScopedDataManager
 * that is pre-bound to the exact TCID + ITERATION of the running test.
 *
 * Inside the test body, no TCID or iteration number is ever needed again.
 *
 * ── Usage ──────────────────────────────────────────────────────────────────
 *
 * Pattern A — ALL iterations in JSON (auto-grows with new data rows):
 *   IterationRunner.forAll(test, Lifecycle.STP, 'TC_LOGIN_001',
 *     async ({ page, scopedData }) => {
 *       await loginPage.login(
 *         scopedData.get<string>('username'),
 *         scopedData.get<string>('password'),
 *       );
 *       scopedData.update('lastLogin', new Date().toISOString());
 *     });
 *
 * Pattern B — specific subset:
 *   IterationRunner.forIterations(test, Lifecycle.STP, 'TC_LOGIN_001', [1, 3], callback);
 *
 * Pattern C — exactly one iteration:
 *   IterationRunner.forOne(test, Lifecycle.STP, 'TC_LOGIN_001', 2, callback);
 *
 * ── What scopedData provides ────────────────────────────────────────────────
 *   scopedData.get<string>('username')     // read a field (typed)
 *   scopedData.getOrNull<string>('notes')  // read without throwing if missing
 *   scopedData.all()                       // full merged data snapshot
 *   scopedData.update('field', value)      // write to JSON + local cache
 *   scopedData.updateMany({ f1: v1, ... }) // write multiple fields at once
 *   scopedData.has('field')                // check existence
 *   scopedData.tcid                        // 'TC_LOGIN_001'
 *   scopedData.iteration                   // 1
 */

// ─── Callback type ────────────────────────────────────────────────────────────

/**
 * Standard Playwright test body type used for iteration callbacks.
 * `scopedData` is injected as a real fixture — no manual injection needed.
 */
export type IterationCallback<Fixtures extends object> = (
  fixtures: Fixtures,
  testInfo: import('@playwright/test').TestInfo,
) => Promise<void>;

// ─── IterationRunner ──────────────────────────────────────────────────────────

export class IterationRunner {

  /**
   * Generates one test per iteration defined in the JSON for this TCID.
   * Adding a new iteration row to the JSON automatically creates a new test.
   */
  static forAll<Fixtures extends object>(
    test: TestType<Fixtures, object>,
    lifecycle: Lifecycle,
    tcid: string,
    callback: IterationCallback<Fixtures>,
  ): void {
    const dm = TestDataManager.forLifecycle(lifecycle);
    const iterations = dm.getAllIterations(tcid);

    if (iterations.length === 0) {
      throw new Error(
        `[IterationRunner] No iterations found for TCID "${tcid}" in lifecycle "${lifecycle}". ` +
        `Add at least one iteration block to the test data JSON.`,
      );
    }

    for (const iterData of iterations) {
      IterationRunner.registerTest(test, lifecycle, tcid, iterData, callback);
    }
  }

  /**
   * Generates one test for each iteration number in the provided array.
   * Use this for a targeted subset without running every iteration.
   */
  static forIterations<Fixtures extends object>(
    test: TestType<Fixtures, object>,
    lifecycle: Lifecycle,
    tcid: string,
    iterations: number[],
    callback: IterationCallback<Fixtures>,
  ): void {
    if (iterations.length === 0) {
      throw new Error(`[IterationRunner] iterations array is empty for TCID "${tcid}".`);
    }

    const dm = TestDataManager.forLifecycle(lifecycle);

    for (const iterNum of iterations) {
      const iterData = dm.getAllIterations(tcid).find((it) => it.ITERATION === iterNum);
      if (!iterData) {
        throw new Error(
          `[IterationRunner] Iteration ${iterNum} not found for TCID "${tcid}" ` +
          `in lifecycle "${lifecycle}".`,
        );
      }
      IterationRunner.registerTest(test, lifecycle, tcid, iterData, callback);
    }
  }

  /**
   * Generates a single test for exactly one iteration.
   */
  static forOne<Fixtures extends object>(
    test: TestType<Fixtures, object>,
    lifecycle: Lifecycle,
    tcid: string,
    iteration: number,
    callback: IterationCallback<Fixtures>,
  ): void {
    IterationRunner.forIterations(test, lifecycle, tcid, [iteration], callback);
  }

  // ─── Internal ──────────────────────────────────────────────────────────────

  private static registerTest<Fixtures extends object>(
    test: TestType<Fixtures, object>,
    lifecycle: Lifecycle,
    tcid: string,
    iterData: IterationData,
    callback: IterationCallback<Fixtures>,
  ): void {
    // Build a descriptive test title using the first descriptive field found
    const label = (iterData as Record<string, unknown>).description
      ?? (iterData as Record<string, unknown>).role
      ?? (iterData as Record<string, unknown>).username
      ?? '';
    const title = `${tcid} | Iteration ${iterData.ITERATION}${label ? ` | ${label}` : ''}`;

    // Pass the spec callback directly — no wrapper needed.
    // TCID, iteration, and lifecycle are attached as annotations so the
    // `scopedData` fixture in base.fixtures.ts can construct a ScopedDataManager
    // that is pre-bound to exactly this iteration.
    test(
      title,
      {
        annotation: [
          { type: '_iteration_tcid',       description: tcid },
          { type: '_iteration_num',        description: String(iterData.ITERATION) },
          { type: '_iteration_lifecycle',  description: lifecycle },
        ],
      },
      callback,
    );
  }
}

export default IterationRunner;
