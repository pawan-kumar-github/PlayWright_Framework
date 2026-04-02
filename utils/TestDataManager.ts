import fs from 'fs';
import path from 'path';
import { Lifecycle, PATHS, TD_KEYS } from '../config/constants';
import { Logger } from './Logger';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface IterationData {
  ITERATION: number;
  [key: string]: unknown;
}

export interface TestCaseData {
  TCID: string;
  description?: string;
  /** Default/base data fields at top level */
  [key: string]: unknown;
  /** Iteration-specific data blocks */
  iterations?: IterationData[];
  /** Runtime data written back by TestDataUpdater */
  runtimeData?: Record<string, unknown>;
}

export type LifecycleTestData = Record<string, TestCaseData>;

// ─── TestDataManager ──────────────────────────────────────────────────────────

/**
 * TestDataManager — Read-only access to lifecycle test data JSON files.
 *
 * Each lifecycle has its own JSON file keyed by TCID at the top level.
 * Within each TCID entry:
 *   - Top-level keys are the default/common fields.
 *   - `iterations` array holds per-iteration override fields.
 *
 * Usage:
 *   // Load once per test suite
 *   const dm = TestDataManager.forLifecycle(Lifecycle.STP);
 *
 *   // Get base data for a test case
 *   const data = dm.getData('TC001');
 *
 *   // Get data for a specific iteration (merges base + iteration fields)
 *   const iter2 = dm.getIteration('TC001', 2);
 */
export class TestDataManager {
  private readonly lifecycle: Lifecycle;
  private readonly filePath: string;
  private data: LifecycleTestData;
  private readonly logger: Logger;

  // ── Singleton cache per lifecycle ─────────────────────────────────────────
  private static readonly cache = new Map<Lifecycle, TestDataManager>();

  private constructor(lifecycle: Lifecycle) {
    this.lifecycle = lifecycle;
    this.logger = new Logger(`TestDataManager[${lifecycle}]`);
    this.filePath = path.join(PATHS.testData, lifecycle, `${lifecycle.toLowerCase()}_test_data.json`);
    this.data = this.load();
  }

  // ── Factory ──────────────────────────────────────────────────────────────

  /**
   * Returns a cached TestDataManager for the given lifecycle.
   * The JSON file is read once and cached in memory for the process lifetime.
   * Call `reload()` if the file is updated at runtime.
   */
  static forLifecycle(lifecycle: Lifecycle): TestDataManager {
    if (!TestDataManager.cache.has(lifecycle)) {
      TestDataManager.cache.set(lifecycle, new TestDataManager(lifecycle));
    }
    return TestDataManager.cache.get(lifecycle)!;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Returns the full TestCaseData for the given TCID.
   * Throws if TCID not found.
   */
  getData(tcid: string): TestCaseData {
    const record = this.data[tcid];
    if (!record) {
      throw new Error(
        `[TestDataManager] TCID "${tcid}" not found in ${this.lifecycle} test data.\n` +
        `  Available TCIDs: ${Object.keys(this.data).join(', ')}`,
      );
    }
    return record;
  }

  /**
   * Returns merged data for a specific iteration.
   * Base fields are overridden by iteration-specific fields.
   * ITERATION=1 is the default if iterations array has one entry.
   */
  getIteration(tcid: string, iteration: number = 1): TestCaseData & IterationData {
    const base = this.getData(tcid);
    const { iterations, ...baseFields } = base;

    if (!iterations || iterations.length === 0) {
      this.logger.warn(`TCID "${tcid}" has no iterations defined. Returning base data.`);
      return { ...baseFields, ITERATION: iteration } as TestCaseData & IterationData;
    }

    const iterData = iterations.find((it) => it[TD_KEYS.ITERATION] === iteration);
    if (!iterData) {
      throw new Error(
        `[TestDataManager] Iteration ${iteration} not found for TCID "${tcid}".\n` +
        `  Available iterations: ${iterations.map((it) => it.ITERATION).join(', ')}`,
      );
    }

    return { ...baseFields, ...iterData } as TestCaseData & IterationData;
  }

  /**
   * Returns all iteration blocks for a TCID.
   */
  getAllIterations(tcid: string): IterationData[] {
    const record = this.getData(tcid);
    return record.iterations ?? [];
  }

  /**
   * Returns runtime data written back by TestDataUpdater.
   */
  getRuntimeData(tcid: string): Record<string, unknown> {
    return this.getData(tcid).runtimeData ?? {};
  }

  /**
   * Returns a specific runtime field value.
   */
  getRuntimeField(tcid: string, key: string): unknown {
    const runtime = this.getRuntimeData(tcid);
    if (!(key in runtime)) {
      throw new Error(`[TestDataManager] Runtime field "${key}" not found for TCID "${tcid}".`);
    }
    return runtime[key];
  }

  /**
   * Returns all TCID keys in this lifecycle's test data file.
   */
  getAllTCIDs(): string[] {
    return Object.keys(this.data);
  }

  /**
   * Reloads the test data file from disk.
   * Call this after TestDataUpdater has written changes.
   */
  reload(): void {
    this.data = this.load();
    this.logger.info(`Test data reloaded for lifecycle: ${this.lifecycle}`);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private load(): LifecycleTestData {
    if (!fs.existsSync(this.filePath)) {
      throw new Error(
        `[TestDataManager] Test data file not found: ${this.filePath}\n` +
        `  Ensure the file exists at the correct lifecycle path.`,
      );
    }
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as LifecycleTestData;
      this.logger.info(`Test data loaded: ${Object.keys(parsed).length} test cases`, {
        lifecycle: this.lifecycle,
        file: path.basename(this.filePath),
      });
      return parsed;
    } catch (err) {
      throw new Error(`[TestDataManager] Failed to parse ${this.filePath}: ${(err as Error).message}`);
    }
  }
}

export default TestDataManager;
