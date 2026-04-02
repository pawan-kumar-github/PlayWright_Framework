import fs from 'fs';
import path from 'path';
import { Lifecycle, PATHS, TD_KEYS } from '../config/constants';
import { Logger } from './Logger';
import { TestDataManager, LifecycleTestData } from './TestDataManager';

/**
 * TestDataUpdater — Runtime write-back utility for lifecycle test data JSON files.
 *
 * Exposes methods that page classes call to persist generated/observed values
 * (e.g., a newly created STP number, an assigned ID, a dynamic date) back into
 * the corresponding test data JSON file so that downstream steps can read them.
 *
 * All writes are synchronous to avoid race conditions in parallel test runs
 * (each TCID/ITERATION key is independent, so worker collisions are impossible
 * as long as different workers target different TCIDs).
 *
 * Usage in a page class:
 *   this.updater.updateRuntimeField('TC001', 'stpNumber', generatedNumber);
 *   this.updater.updateIterationField('TC001', 2, 'username', newUser);
 */
export class TestDataUpdater {
  private readonly lifecycle: Lifecycle;
  private readonly filePath: string;
  private readonly logger: Logger;

  constructor(lifecycle: Lifecycle) {
    this.lifecycle = lifecycle;
    this.filePath = path.join(PATHS.testData, lifecycle, `${lifecycle.toLowerCase()}_test_data.json`);
    this.logger = new Logger(`TestDataUpdater[${lifecycle}]`);
  }

  // ─── Runtime data (transient values generated during test execution) ──────

  /**
   * Writes a key-value pair into the `runtimeData` block of a TCID.
   * Creates `runtimeData` if it doesn't exist.
   *
   * Typical use: storing a generated STP/OTDTC/RT number after form submission.
   */
  updateRuntimeField(tcid: string, key: string, value: unknown): void {
    this.mutate(tcid, (record) => {
      if (!record[TD_KEYS.RUNTIME_DATA]) {
        (record as Record<string, unknown>)[TD_KEYS.RUNTIME_DATA] = {};
      }
      const runtimeData = record[TD_KEYS.RUNTIME_DATA] as Record<string, unknown>;
      const previous = runtimeData[key];
      runtimeData[key] = value;
      this.logger.info(`Runtime field updated`, { tcid, key, previous, current: value });
    });
  }

  /**
   * Writes multiple runtime fields at once.
   */
  updateRuntimeFields(tcid: string, fields: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(fields)) {
      this.updateRuntimeField(tcid, key, value);
    }
  }

  /**
   * Clears all runtime data for a TCID (useful in beforeEach cleanup).
   */
  clearRuntimeData(tcid: string): void {
    this.mutate(tcid, (record) => {
      (record as Record<string, unknown>)[TD_KEYS.RUNTIME_DATA] = {};
      this.logger.info(`Runtime data cleared for TCID: ${tcid}`);
    });
  }

  // ─── Iteration data (update a field within a specific iteration) ──────────

  /**
   * The primary write counterpart of TestDataManager.getIteration(tcid, iteration).
   *
   * Reads the field from the iteration block, updates it in-place, and writes
   * back to the JSON file. After this call, getTestData(tcid, iteration)[key]
   * returns the new value.
   *
   * Handles two cases transparently:
   *   - Field already exists in the iteration block → overwritten.
   *   - Field only exists at top level (inherited) → written into the iteration
   *     block as an override, leaving the top-level value untouched.
   *
   * Usage (in a page class):
   *   // Step 1 — read
   *   const username = this.getTestData('TC_LOGIN_001', 1).username as string;
   *   // ... use username in the test ...
   *   // Step 2 — update same field before test finishes
   *   this.dataUpdater.updateTestDataField('TC_LOGIN_001', 1, 'username', 'newUser@example.com');
   *   // Next read returns 'newUser@example.com'
   *   const updated = this.getTestData('TC_LOGIN_001', 1).username; // → 'newUser@example.com'
   */
  updateTestDataField(tcid: string, iteration: number, key: string, value: unknown): void {
    this.mutate(tcid, (record) => {
      if (!record.iterations) {
        record.iterations = [];
      }
      let iterBlock = record.iterations.find((it) => it[TD_KEYS.ITERATION] === iteration);
      if (!iterBlock) {
        iterBlock = { [TD_KEYS.ITERATION]: iteration };
        record.iterations.push(iterBlock);
        this.logger.info(`Iteration ${iteration} created for TCID: ${tcid}`);
      }
      const previous = iterBlock[key] ?? (record as Record<string, unknown>)[key];
      iterBlock[key] = value;
      this.logger.info(`Test data field updated`, { tcid, iteration, key, previous, current: value });
    });
  }

  /**
   * Updates a field within a specific iteration block.
   * Creates the iteration if it doesn't exist.
   *
   * Typical use: rotating test credentials, injecting dynamic dates.
   */
  updateIterationField(tcid: string, iteration: number, key: string, value: unknown): void {
    this.mutate(tcid, (record) => {
      if (!record.iterations) {
        record.iterations = [];
      }
      let iterBlock = record.iterations.find((it) => it[TD_KEYS.ITERATION] === iteration);
      if (!iterBlock) {
        iterBlock = { [TD_KEYS.ITERATION]: iteration };
        record.iterations.push(iterBlock);
        this.logger.info(`Created new iteration ${iteration} for TCID: ${tcid}`);
      }
      const previous = iterBlock[key];
      iterBlock[key] = value;
      this.logger.info(`Iteration field updated`, { tcid, iteration, key, previous, current: value });
    });
  }

  /**
   * Appends a completely new iteration block to a TCID.
   * The iteration number must be unique within the TCID.
   */
  appendIteration(tcid: string, iterationData: Record<string, unknown> & { ITERATION: number }): void {
    this.mutate(tcid, (record) => {
      if (!record.iterations) {
        record.iterations = [];
      }
      const existing = record.iterations.find((it) => it[TD_KEYS.ITERATION] === iterationData.ITERATION);
      if (existing) {
        throw new Error(
          `[TestDataUpdater] Iteration ${iterationData.ITERATION} already exists for TCID "${tcid}". ` +
          `Use updateIterationField() to modify an existing iteration.`,
        );
      }
      record.iterations.push(iterationData);
      this.logger.info(`Iteration ${iterationData.ITERATION} appended for TCID: ${tcid}`);
    });
  }

  // ─── Top-level field updates ───────────────────────────────────────────────

  /**
   * Updates a top-level field on a TCID record.
   * Use sparingly — prefer runtimeData for generated values.
   */
  updateTopLevelField(tcid: string, key: string, value: unknown): void {
    this.mutate(tcid, (record) => {
      const previous = (record as Record<string, unknown>)[key];
      (record as Record<string, unknown>)[key] = value;
      this.logger.info(`Top-level field updated`, { tcid, key, previous, current: value });
    });
  }

  // ─── Snapshot / audit ─────────────────────────────────────────────────────

  /**
   * Writes a timestamped snapshot of the current TCID data to the healing-logs
   * directory for audit purposes.
   */
  snapshotTCID(tcid: string): void {
    const data = this.readFile();
    const record = data[tcid];
    if (!record) {
      this.logger.warn(`Snapshot requested for unknown TCID: ${tcid}`);
      return;
    }
    const snapshotDir = path.join(PATHS.healingLogs, 'snapshots', this.lifecycle);
    fs.mkdirSync(snapshotDir, { recursive: true });
    const filename = `${tcid}_${Date.now()}.json`;
    fs.writeFileSync(path.join(snapshotDir, filename), JSON.stringify(record, null, 2), 'utf-8');
    this.logger.debug(`Snapshot written for ${tcid}`, { file: filename });
  }

  // ─── Core mutation helper ──────────────────────────────────────────────────

  /**
   * Reads the file, applies the mutation callback, then writes it back atomically.
   * After writing, invalidates the TestDataManager cache so the next read is fresh.
   */
  private mutate(
    tcid: string,
    mutation: (record: import('./TestDataManager').TestCaseData) => void,
  ): void {
    const data = this.readFile();

    if (!data[tcid]) {
      throw new Error(
        `[TestDataUpdater] TCID "${tcid}" not found in ${this.lifecycle} test data.\n` +
        `  Available TCIDs: ${Object.keys(data).join(', ')}`,
      );
    }

    mutation(data[tcid]);
    this.writeFile(data);

    // Invalidate the TestDataManager singleton cache so future reads are fresh
    TestDataManager.forLifecycle(this.lifecycle).reload();
  }

  private readFile(): LifecycleTestData {
    if (!fs.existsSync(this.filePath)) {
      throw new Error(`[TestDataUpdater] File not found: ${this.filePath}`);
    }
    try {
      return JSON.parse(fs.readFileSync(this.filePath, 'utf-8')) as LifecycleTestData;
    } catch (err) {
      throw new Error(`[TestDataUpdater] Failed to parse ${this.filePath}: ${(err as Error).message}`);
    }
  }

  private writeFile(data: LifecycleTestData): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
      this.logger.debug(`Test data file written`, { file: path.basename(this.filePath) });
    } catch (err) {
      throw new Error(`[TestDataUpdater] Failed to write ${this.filePath}: ${(err as Error).message}`);
    }
  }
}

export default TestDataUpdater;
