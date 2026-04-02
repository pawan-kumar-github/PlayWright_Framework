import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { Lifecycle, PATHS, TD_KEYS } from '../config/constants';
import { Logger } from './Logger';
import { TestDataManager, LifecycleTestData, TestCaseData, IterationData } from './TestDataManager';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * A single flat row of bulk input data.
 * Must contain TCID and ITERATION. All other keys become iteration fields.
 */
export interface BulkRow {
  TCID: string;
  ITERATION: number;
  [key: string]: unknown;
}

export interface BulkLoadResult {
  totalRows: number;
  inserted: number;
  updated: number;
  skipped: number;
  tcidsAffected: string[];
  errors: Array<{ row: number; tcid: string; iteration: number; reason: string }>;
}

// ─── BulkTestDataLoader ───────────────────────────────────────────────────────

/**
 * BulkTestDataLoader — loads or updates large volumes of test data into a
 * lifecycle JSON file in a single read → batch-mutate → single write cycle.
 *
 * Designed for 100s–1000s of iterations without hammering the file system.
 *
 * Supported input formats:
 *   1. In-memory array of BulkRow objects
 *   2. JSON file (.json)  — array of BulkRow objects
 *   3. CSV file  (.csv)   — first row is the header; must include TCID and ITERATION columns
 *
 * CSV format example:
 *   TCID,ITERATION,username,password,role
 *   TC_LOGIN_001,4,user4@example.com,Pass@4,creator
 *   TC_LOGIN_001,5,user5@example.com,Pass@5,reviewer
 *
 * Usage:
 *   // From array
 *   const result = BulkTestDataLoader.fromArray(Lifecycle.STP, rows);
 *
 *   // From JSON file
 *   const result = BulkTestDataLoader.fromJsonFile(Lifecycle.STP, 'test-data/STP/bulk_input.json');
 *
 *   // From CSV
 *   const result = await BulkTestDataLoader.fromCSV(Lifecycle.STP, 'test-data/STP/bulk_input.csv');
 *
 *   // From page class — direct upsert of multiple rows
 *   BulkTestDataLoader.fromArray(Lifecycle.STP, [
 *     { TCID: 'TC_LOGIN_001', ITERATION: 4, username: 'u4@example.com', password: 'P@ss4' },
 *     { TCID: 'TC_LOGIN_001', ITERATION: 5, username: 'u5@example.com', password: 'P@ss5' },
 *   ]);
 */
export class BulkTestDataLoader {
  private static readonly logger = new Logger('BulkTestDataLoader');

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Upserts all rows from an in-memory array.
   * Groups rows by lifecycle data file for minimum I/O.
   */
  static fromArray(lifecycle: Lifecycle, rows: BulkRow[]): BulkLoadResult {
    BulkTestDataLoader.logger.info(`Bulk load started`, {
      lifecycle,
      totalRows: rows.length,
      source: 'array',
    });
    return BulkTestDataLoader.upsertAll(lifecycle, rows);
  }

  /**
   * Reads a JSON file (array of BulkRow) and upserts all rows.
   * File path can be absolute or relative to the project root.
   */
  static fromJsonFile(lifecycle: Lifecycle, filePath: string): BulkLoadResult {
    const resolved = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

    if (!fs.existsSync(resolved)) {
      throw new Error(`[BulkTestDataLoader] JSON file not found: ${resolved}`);
    }

    BulkTestDataLoader.logger.info(`Loading from JSON file`, { file: resolved });

    let rows: BulkRow[];
    try {
      const raw = JSON.parse(fs.readFileSync(resolved, 'utf-8'));
      if (!Array.isArray(raw)) {
        throw new Error('JSON file must contain a top-level array of row objects.');
      }
      rows = raw as BulkRow[];
    } catch (err) {
      throw new Error(`[BulkTestDataLoader] Failed to parse ${resolved}: ${(err as Error).message}`);
    }

    return BulkTestDataLoader.fromArray(lifecycle, rows);
  }

  /**
   * Parses a CSV file and upserts all rows.
   * First row must be the header. Must include TCID and ITERATION columns.
   * Numeric-looking values are coerced to numbers automatically.
   *
   * File path can be absolute or relative to the project root.
   */
  static async fromCSV(lifecycle: Lifecycle, filePath: string): Promise<BulkLoadResult> {
    const resolved = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

    if (!fs.existsSync(resolved)) {
      throw new Error(`[BulkTestDataLoader] CSV file not found: ${resolved}`);
    }

    BulkTestDataLoader.logger.info(`Parsing CSV file`, { file: resolved });
    const rows = await BulkTestDataLoader.parseCSV(resolved);
    return BulkTestDataLoader.fromArray(lifecycle, rows);
  }

  // ─── Core upsert engine ───────────────────────────────────────────────────

  /**
   * Single read → batch mutate → single write per lifecycle file.
   * All rows for a lifecycle are processed in one file cycle.
   */
  private static upsertAll(lifecycle: Lifecycle, rows: BulkRow[]): BulkLoadResult {
    const filePath = path.join(
      PATHS.testData,
      lifecycle,
      `${lifecycle.toLowerCase()}_test_data.json`,
    );

    const result: BulkLoadResult = {
      totalRows: rows.length,
      inserted: 0,
      updated: 0,
      skipped: 0,
      tcidsAffected: [],
      errors: [],
    };

    if (rows.length === 0) {
      BulkTestDataLoader.logger.warn('No rows to process.');
      return result;
    }

    // ── Validate all rows before touching the file ─────────────────────────
    const validRows: BulkRow[] = [];
    rows.forEach((row, idx) => {
      const rowNum = idx + 1;
      if (!row.TCID || typeof row.TCID !== 'string') {
        result.errors.push({ row: rowNum, tcid: String(row.TCID ?? ''), iteration: 0, reason: 'Missing or invalid TCID' });
        result.skipped++;
        return;
      }
      const iter = Number(row.ITERATION);
      if (!row.ITERATION || isNaN(iter) || iter < 1) {
        result.errors.push({ row: rowNum, tcid: row.TCID, iteration: iter, reason: 'Missing or invalid ITERATION (must be a positive integer)' });
        result.skipped++;
        return;
      }
      validRows.push({ ...row, ITERATION: iter });
    });

    if (validRows.length === 0) {
      BulkTestDataLoader.logger.error('All rows failed validation — no file write performed.');
      return result;
    }

    // ── Single file read ──────────────────────────────────────────────────
    let data: LifecycleTestData = {};
    if (fs.existsSync(filePath)) {
      try {
        data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as LifecycleTestData;
      } catch (err) {
        throw new Error(`[BulkTestDataLoader] Failed to read ${filePath}: ${(err as Error).message}`);
      }
    } else {
      BulkTestDataLoader.logger.warn(`File not found — a new file will be created: ${filePath}`);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }

    // ── Batch mutate in memory ─────────────────────────────────────────────
    const affectedSet = new Set<string>();

    for (const row of validRows) {
      const { TCID, ITERATION, ...fields } = row;

      // Ensure TCID record exists
      if (!data[TCID]) {
        data[TCID] = {
          TCID,
          iterations: [],
          runtimeData: {},
        } as TestCaseData;
        BulkTestDataLoader.logger.debug(`TCID created: ${TCID}`);
      }

      const record = data[TCID];
      if (!record.iterations) {
        record.iterations = [];
      }

      // Upsert iteration block
      const existingIdx = record.iterations.findIndex(
        (it) => it[TD_KEYS.ITERATION] === ITERATION,
      );

      if (existingIdx >= 0) {
        // ── Update existing iteration ───────────────────────────────────
        record.iterations[existingIdx] = {
          ...record.iterations[existingIdx],
          ...fields,
          [TD_KEYS.ITERATION]: ITERATION,
        } as IterationData;
        result.updated++;
        BulkTestDataLoader.logger.debug(`Updated`, { TCID, ITERATION });
      } else {
        // ── Insert new iteration ────────────────────────────────────────
        record.iterations.push({
          [TD_KEYS.ITERATION]: ITERATION,
          ...fields,
        } as IterationData);
        result.inserted++;
        BulkTestDataLoader.logger.debug(`Inserted`, { TCID, ITERATION });
      }

      affectedSet.add(TCID);
    }

    // Sort iterations numerically within each affected TCID for readability
    for (const tcid of affectedSet) {
      if (data[tcid].iterations) {
        data[tcid].iterations!.sort(
          (a, b) => (a[TD_KEYS.ITERATION] as number) - (b[TD_KEYS.ITERATION] as number),
        );
      }
    }

    // ── Single file write ──────────────────────────────────────────────
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      throw new Error(`[BulkTestDataLoader] Failed to write ${filePath}: ${(err as Error).message}`);
    }

    // Invalidate TestDataManager cache
    TestDataManager.forLifecycle(lifecycle).reload();

    result.tcidsAffected = Array.from(affectedSet);

    BulkTestDataLoader.logger.info('Bulk load complete', {
      inserted: result.inserted,
      updated: result.updated,
      skipped: result.skipped,
      tcids: result.tcidsAffected.length,
      errors: result.errors.length,
    });

    return result;
  }

  // ─── CSV parser ───────────────────────────────────────────────────────────

  /**
   * Streams a CSV file line-by-line, handles quoted fields with embedded commas,
   * and coerces numeric strings to numbers.
   */
  private static parseCSV(filePath: string): Promise<BulkRow[]> {
    return new Promise((resolve, reject) => {
      const rows: BulkRow[] = [];
      let headers: string[] = [];
      let lineNumber = 0;

      const rl = readline.createInterface({
        input: fs.createReadStream(filePath, { encoding: 'utf-8' }),
        crlfDelay: Infinity,
      });

      rl.on('line', (line) => {
        lineNumber++;
        const trimmed = line.trim();
        if (!trimmed) return; // skip blank lines

        const cells = BulkTestDataLoader.splitCSVLine(trimmed);

        if (lineNumber === 1) {
          // Header row
          headers = cells.map((h) => h.trim());
          const hasRequired = headers.includes('TCID') && headers.includes('ITERATION');
          if (!hasRequired) {
            rl.close();
            reject(new Error(
              `[BulkTestDataLoader] CSV header must contain "TCID" and "ITERATION" columns.\n` +
              `  Found: ${headers.join(', ')}`,
            ));
          }
          return;
        }

        if (cells.length !== headers.length) {
          BulkTestDataLoader.logger.warn(`Line ${lineNumber} has ${cells.length} cells but header has ${headers.length} — skipped`);
          return;
        }

        const row: Record<string, unknown> = {};
        headers.forEach((header, i) => {
          row[header] = BulkTestDataLoader.coerce(cells[i]);
        });

        rows.push(row as BulkRow);
      });

      rl.on('close', () => resolve(rows));
      rl.on('error', reject);
    });
  }

  /**
   * Splits a single CSV line respecting double-quoted fields that may contain commas.
   */
  private static splitCSVLine(line: string): string[] {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'; // escaped quote
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cells.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current);
    return cells;
  }

  /**
   * Coerces a CSV string cell to a number if it looks numeric, otherwise keeps it as string.
   * Empty string stays as empty string.
   */
  private static coerce(value: string): unknown {
    if (value === '') return '';
    const num = Number(value);
    return isNaN(num) ? value : num;
  }
}

export default BulkTestDataLoader;
