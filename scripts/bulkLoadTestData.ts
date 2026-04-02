/**
 * scripts/bulkLoadTestData.ts
 *
 * CLI utility to bulk-insert or update test data in lifecycle JSON files.
 *
 * Usage:
 *   npx ts-node scripts/bulkLoadTestData.ts --lifecycle STP --file test-data/STP/bulk_input.csv
 *   npx ts-node scripts/bulkLoadTestData.ts --lifecycle STP --file test-data/STP/bulk_input.json
 *
 * Options:
 *   --lifecycle   STP | OTDTC | RT                (required)
 *   --file        path to .csv or .json input file (required)
 *   --dry-run     print what would change without writing the file
 *   --help        show this help message
 *
 * CSV format (first row = header, must include TCID and ITERATION):
 *   TCID,ITERATION,username,password,role
 *   TC_LOGIN_001,4,user4@example.com,Pass@4,creator
 *   TC_LOGIN_001,5,user5@example.com,Pass@5,reviewer
 *
 * JSON format (array of objects, each must have TCID and ITERATION):
 *   [
 *     { "TCID": "TC_LOGIN_001", "ITERATION": 4, "username": "user4@example.com" },
 *     { "TCID": "TC_LOGIN_001", "ITERATION": 5, "username": "user5@example.com" }
 *   ]
 */

import path from 'path';
import fs from 'fs';
import { Lifecycle } from '../config/constants';
import { BulkTestDataLoader, BulkRow } from '../utils/BulkTestDataLoader';

// ─── Argument parsing ─────────────────────────────────────────────────────────

function parseArgs(): { lifecycle: Lifecycle; file: string; dryRun: boolean } {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.length === 0) {
    printHelp();
    process.exit(0);
  }

  const get = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : undefined;
  };

  const lifecycleArg = get('--lifecycle');
  if (!lifecycleArg || !Object.values(Lifecycle).includes(lifecycleArg as Lifecycle)) {
    console.error(`\n❌  --lifecycle must be one of: ${Object.values(Lifecycle).join(', ')}\n`);
    process.exit(1);
  }

  const fileArg = get('--file');
  if (!fileArg) {
    console.error('\n❌  --file is required\n');
    process.exit(1);
  }

  return {
    lifecycle: lifecycleArg as Lifecycle,
    file: fileArg,
    dryRun: args.includes('--dry-run'),
  };
}

function printHelp(): void {
  console.log(`
Bulk Test Data Loader
─────────────────────
Usage:
  npx ts-node scripts/bulkLoadTestData.ts --lifecycle <STP|OTDTC|RT> --file <path> [--dry-run]

Options:
  --lifecycle   Target lifecycle: STP, OTDTC, or RT
  --file        Path to input file (.csv or .json)
  --dry-run     Validate and preview changes without writing
  --help        Show this help

CSV header must contain TCID and ITERATION columns.
JSON file must be an array of objects each containing TCID and ITERATION.
`);
}

// ─── Dry-run preview ──────────────────────────────────────────────────────────

function dryRunPreview(rows: BulkRow[]): void {
  const grouped: Record<string, BulkRow[]> = {};
  for (const row of rows) {
    if (!grouped[row.TCID]) grouped[row.TCID] = [];
    grouped[row.TCID].push(row);
  }

  console.log('\n📋  DRY RUN — no file will be written\n');
  console.log(`  Total rows  : ${rows.length}`);
  console.log(`  TCIDs found : ${Object.keys(grouped).join(', ')}\n`);

  for (const [tcid, tcRows] of Object.entries(grouped)) {
    console.log(`  ${tcid}`);
    for (const r of tcRows) {
      const { TCID, ITERATION, ...fields } = r;
      const fieldSummary = Object.keys(fields).join(', ');
      console.log(`    ITERATION ${ITERATION}  →  fields: ${fieldSummary}`);
    }
  }
  console.log('');
}

// ─── Result reporting ─────────────────────────────────────────────────────────

function printResult(result: ReturnType<typeof BulkTestDataLoader.fromArray>): void {
  console.log('\n✅  Bulk load complete\n');
  console.log(`  Rows processed : ${result.totalRows}`);
  console.log(`  Inserted       : ${result.inserted}`);
  console.log(`  Updated        : ${result.updated}`);
  console.log(`  Skipped        : ${result.skipped}`);
  console.log(`  TCIDs affected : ${result.tcidsAffected.join(', ') || 'none'}`);

  if (result.errors.length > 0) {
    console.log(`\n⚠️   Errors (${result.errors.length}):`);
    for (const err of result.errors) {
      console.log(`  Row ${err.row} [${err.tcid} / ITERATION ${err.iteration}]: ${err.reason}`);
    }
  }
  console.log('');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { lifecycle, file, dryRun } = parseArgs();

  const resolvedFile = path.isAbsolute(file) ? file : path.resolve(process.cwd(), file);
  const ext = path.extname(resolvedFile).toLowerCase();

  if (!fs.existsSync(resolvedFile)) {
    console.error(`\n❌  File not found: ${resolvedFile}\n`);
    process.exit(1);
  }

  if (ext !== '.csv' && ext !== '.json') {
    console.error(`\n❌  Unsupported file type "${ext}". Use .csv or .json\n`);
    process.exit(1);
  }

  console.log(`\n🔄  Loading ${ext.toUpperCase()} into ${lifecycle} test data...`);
  console.log(`  File      : ${resolvedFile}`);
  console.log(`  Lifecycle : ${lifecycle}`);
  console.log(`  Mode      : ${dryRun ? 'DRY RUN' : 'WRITE'}\n`);

  try {
    if (dryRun) {
      // For dry-run, just parse and preview without writing
      let rows: BulkRow[] = [];
      if (ext === '.json') {
        rows = JSON.parse(fs.readFileSync(resolvedFile, 'utf-8')) as BulkRow[];
      } else {
        // Parse CSV via internal method (call fromCSV and discard, but we need rows)
        // Use a temp approach: parse then skip write by leveraging fromArray on empty lifecycle
        rows = await parseCsvRows(resolvedFile);
      }
      dryRunPreview(rows);
      return;
    }

    let result;
    if (ext === '.json') {
      result = BulkTestDataLoader.fromJsonFile(lifecycle, resolvedFile);
    } else {
      result = await BulkTestDataLoader.fromCSV(lifecycle, resolvedFile);
    }

    printResult(result);

    if (result.errors.length > 0) {
      process.exit(1); // Signal partial failure to CI
    }
  } catch (err) {
    console.error(`\n❌  ${(err as Error).message}\n`);
    process.exit(1);
  }
}

/** Minimal CSV row reader used only for dry-run preview. */
async function parseCsvRows(filePath: string): Promise<BulkRow[]> {
  const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const row: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      const v = cells[i]?.trim() ?? '';
      row[h] = isNaN(Number(v)) || v === '' ? v : Number(v);
    });
    return row as BulkRow;
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
