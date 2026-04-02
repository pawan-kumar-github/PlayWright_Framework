import { Lifecycle } from '../config/constants';
import { TestDataManager, IterationData, TestCaseData } from './TestDataManager';
import { TestDataUpdater } from './TestDataUpdater';
import { Logger } from './Logger';

export type IterationContext = TestCaseData & IterationData;

/**
 * ScopedDataManager — a zero-argument data accessor pre-bound to one TCID + ITERATION.
 *
 * Created by IterationRunner for each iteration test. Within the test body the
 * user never supplies TCID or iteration again — the scope is already set.
 *
 * Read:
 *   const username = scopedData.get<string>('username');
 *   const all      = scopedData.all();          // full merged object
 *
 * Write (updates JSON + local cache atomically):
 *   scopedData.update('username', 'newUser@example.com');
 *   scopedData.get<string>('username');          // returns new value immediately
 *
 * Scope info (read-only):
 *   scopedData.tcid       // e.g. 'TC_LOGIN_001'
 *   scopedData.iteration  // e.g. 1
 */
export class ScopedDataManager {
  readonly tcid: string;
  readonly iteration: number;

  private readonly _data: Record<string, unknown>;
  private readonly updater: TestDataUpdater;
  private readonly logger: Logger;

  constructor(lifecycle: Lifecycle, tcid: string, iteration: number) {
    this.tcid = tcid;
    this.iteration = iteration;
    this.updater = new TestDataUpdater(lifecycle);
    this.logger = new Logger(`ScopedDataManager[${tcid}:iter${iteration}]`);

    // Merge base fields + iteration fields once at construction time.
    // Iteration fields override base fields (same logic as TestDataManager.getIteration).
    const dm = TestDataManager.forLifecycle(lifecycle);
    const base = dm.getData(tcid);
    const { iterations: _omit, ...baseFields } = base;
    const iterData = dm.getIteration(tcid, iteration);
    this._data = { ...baseFields, ...iterData } as Record<string, unknown>;
  }

  // ─── Read ─────────────────────────────────────────────────────────────────

  /**
   * Returns the value of a field for the current iteration.
   * Throws a clear error if the key doesn't exist, preventing silent undefined.
   */
  get<T = unknown>(key: string): T {
    if (!(key in this._data)) {
      throw new Error(
        `[ScopedDataManager] Field "${key}" not found in ` +
        `${this.tcid} / Iteration ${this.iteration}.\n` +
        `  Available keys: ${Object.keys(this._data).join(', ')}`,
      );
    }
    return this._data[key] as T;
  }

  /**
   * Returns the value or `undefined` if the key is absent (non-throwing version).
   */
  getOrNull<T = unknown>(key: string): T | undefined {
    return this._data[key] as T | undefined;
  }

  /**
   * Returns all merged fields for this iteration as a readonly snapshot.
   */
  all(): Readonly<Record<string, unknown>> {
    return { ...this._data };
  }

  // ─── Write ────────────────────────────────────────────────────────────────

  /**
   * Updates a field for this iteration:
   *   1. Writes to the JSON file (persisted, survives reloads).
   *   2. Updates the local in-memory cache immediately.
   *
   * So a subsequent get() within the same test returns the updated value
   * without re-reading the file.
   */
  update(key: string, value: unknown): void {
    const previous = this._data[key];
    // Persist to JSON
    this.updater.updateTestDataField(this.tcid, this.iteration, key, value);
    // Update local cache
    this._data[key] = value;
    this.logger.info(`Field updated (scoped)`, {
      tcid: this.tcid,
      iteration: this.iteration,
      key,
      previous,
      current: value,
    });
  }

  /**
   * Updates multiple fields at once in a single JSON write cycle.
   */
  updateMany(fields: Record<string, unknown>): void {
    // Write all fields to JSON in one pass
    for (const [key, value] of Object.entries(fields)) {
      this.update(key, value);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /** Returns true if the field exists in this iteration's merged data. */
  has(key: string): boolean {
    return key in this._data;
  }

  /** Readable summary for logging. */
  toString(): string {
    return `ScopedDataManager(${this.tcid} / Iteration ${this.iteration})`;
  }
}

export default ScopedDataManager;
