# Bulk Test Data Loader

Load hundreds or thousands of test data iterations into a lifecycle JSON file in a single operation — one file read, batch update in memory, one file write.

---

## Table of Contents

- [When to Use It](#when-to-use-it)
- [Input Formats](#input-formats)
  - [CSV](#csv-format)
  - [JSON](#json-format)
- [CLI Usage](#cli-usage)
- [Programmatic Usage](#programmatic-usage)
- [Result Object](#result-object)
- [Rules and Validation](#rules-and-validation)
- [Upsert Behaviour](#upsert-behaviour)
- [Lifecycle Targets](#lifecycle-targets)
- [Sample Files](#sample-files)

---

## When to Use It

| Situation | Tool to use |
|---|---|
| Add or update 1–2 iteration fields during a test run | `scopedData.update()` or `updateValueInJSON()` |
| Seed 10–1000 iterations before a test suite runs | **BulkTestDataLoader** |
| Migrate data from an Excel/CSV export | **BulkTestDataLoader (CSV mode)** |
| Pre-populate a new lifecycle's test data file | **BulkTestDataLoader** |

---

## Input Formats

### CSV Format

The first row must be the **header**. The header must contain `TCID` and `ITERATION` columns. All other columns become iteration fields. Column order does not matter.

```csv
TCID,ITERATION,username,password,role,expectedDashboardTitle
TC_LOGIN_001,4,user4@example.com,Pass@Test4,creator,STP Dashboard
TC_LOGIN_001,5,user5@example.com,Pass@Test5,reviewer,STP Dashboard
TC_LOGIN_001,6,user6@example.com,Pass@Test6,admin,STP Dashboard
TC_STP_001,3,,,,"Bulk STP Iteration 3"
```

Rules:
- Numeric-looking values (`1`, `3.14`) are automatically coerced to numbers.
- Empty cells are kept as empty strings.
- Quoted fields that contain commas are handled correctly (`"value, with comma"`).
- Blank lines are skipped.

### JSON Format

A top-level **array** of objects. Each object must have `TCID` and `ITERATION`. All other keys become iteration fields.

```json
[
  {
    "TCID": "TC_LOGIN_001",
    "ITERATION": 4,
    "username": "user4@example.com",
    "password": "Pass@Test4",
    "role": "creator"
  },
  {
    "TCID": "TC_LOGIN_001",
    "ITERATION": 5,
    "username": "user5@example.com",
    "password": "Pass@Test5",
    "role": "reviewer"
  },
  {
    "TCID": "TC_STP_001",
    "ITERATION": 3,
    "stpTitle": "Bulk STP Iteration 3",
    "priority": "High",
    "assignee": "QA Team",
    "startDate": "2026-05-01",
    "endDate": "2026-05-31"
  }
]
```

---

## CLI Usage

The CLI script is at `scripts/bulkLoadTestData.ts` and is available via the `bulk-load` npm script.

### Basic syntax

```bash
npm run bulk-load -- --lifecycle <STP|OTDTC|RT> --file <path>
```

### Load from CSV

```bash
npm run bulk-load -- --lifecycle STP --file test-data/STP/bulk_input_sample.csv
```

### Load from JSON

```bash
npm run bulk-load -- --lifecycle STP --file test-data/STP/bulk_input_sample.json
```

### Dry run (preview without writing)

Validates the file and prints what would be inserted or updated — no changes are written to disk.

```bash
npm run bulk-load -- --lifecycle STP --file test-data/STP/bulk_input_sample.csv --dry-run
```

Example dry-run output:

```
📋  DRY RUN — no file will be written

  Total rows  : 5
  TCIDs found : TC_LOGIN_001, TC_STP_001

  TC_LOGIN_001
    ITERATION 4  →  fields: username, password, role
    ITERATION 5  →  fields: username, password, role
  TC_STP_001
    ITERATION 3  →  fields: stpTitle, priority, assignee, startDate, endDate
```

### Show help

```bash
npm run bulk-load -- --help
```

### CLI Options

| Option | Required | Description |
|---|---|---|
| `--lifecycle` | Yes | Target lifecycle: `STP`, `OTDTC`, or `RT` |
| `--file` | Yes | Path to `.csv` or `.json` input file (relative or absolute) |
| `--dry-run` | No | Preview changes without writing to the file |
| `--help` | No | Show help message |

---

## Programmatic Usage

Import `BulkTestDataLoader` directly in scripts, fixtures, or setup hooks.

### From an in-memory array

```typescript
import { BulkTestDataLoader } from './utils/BulkTestDataLoader';
import { Lifecycle } from './config/constants';

const result = BulkTestDataLoader.fromArray(Lifecycle.STP, [
  { TCID: 'TC_LOGIN_001', ITERATION: 4, username: 'user4@example.com', password: 'Pass@4', role: 'creator' },
  { TCID: 'TC_LOGIN_001', ITERATION: 5, username: 'user5@example.com', password: 'Pass@5', role: 'reviewer' },
  { TCID: 'TC_STP_001',   ITERATION: 3, stpTitle: 'Q2 Integration STP', priority: 'High' },
]);

console.log(`Inserted: ${result.inserted}, Updated: ${result.updated}`);
```

### From a JSON file

```typescript
const result = BulkTestDataLoader.fromJsonFile(
  Lifecycle.STP,
  'test-data/STP/bulk_input_sample.json',
);
```

### From a CSV file

`fromCSV` is async because it streams the file line by line.

```typescript
const result = await BulkTestDataLoader.fromCSV(
  Lifecycle.STP,
  'test-data/STP/bulk_input_sample.csv',
);
```

### In a Playwright global setup

```typescript
// global-setup.ts
import { BulkTestDataLoader } from './utils/BulkTestDataLoader';
import { Lifecycle } from './config/constants';

export default async function globalSetup() {
  await BulkTestDataLoader.fromCSV(Lifecycle.STP, 'test-data/STP/bulk_input.csv');
}
```

---

## Result Object

All three methods return a `BulkLoadResult`:

```typescript
interface BulkLoadResult {
  totalRows: number;          // total rows processed
  inserted: number;           // new iterations created
  updated: number;            // existing iterations overwritten
  skipped: number;            // rows that failed validation
  tcidsAffected: string[];    // list of TCIDs that were changed
  errors: Array<{
    row: number;
    tcid: string;
    iteration: number;
    reason: string;           // human-readable reason for skip
  }>;
}
```

Example:

```typescript
const result = BulkTestDataLoader.fromJsonFile(Lifecycle.STP, 'bulk_input.json');

if (result.errors.length > 0) {
  result.errors.forEach(e =>
    console.error(`Row ${e.row} [${e.tcid} / ITERATION ${e.iteration}]: ${e.reason}`)
  );
}
```

---

## Rules and Validation

Every row is validated before the file is touched. Invalid rows are skipped and recorded in `result.errors` — they do not abort the entire load.

| Rule | Detail |
|---|---|
| `TCID` must be present | A non-empty string |
| `ITERATION` must be present | A positive integer (`>= 1`) |
| Column count must match header | CSV rows with wrong column count are skipped with a warning |
| File must exist | Both CLI and programmatic API throw if the file path is not found |
| File must be `.csv` or `.json` | Other extensions are rejected by the CLI |

---

## Upsert Behaviour

- **Insert** — if the TCID does not exist in the JSON, a new TCID record is created with an empty `iterations` array and `runtimeData: {}`, then the iteration is appended.
- **Insert** — if the TCID exists but the `ITERATION` number is new, the iteration block is appended.
- **Update** — if the TCID and `ITERATION` both already exist, the iteration block is merged: existing fields are preserved and incoming fields are overwritten.
- After all rows are processed, iterations within each affected TCID are **sorted numerically** for readability.
- The `TestDataManager` singleton cache is **invalidated** after every write, so subsequent test runs read the fresh data immediately.

---

## Lifecycle Targets

Each lifecycle maps to its own JSON file:

| Lifecycle | File written |
|---|---|
| `STP` | `test-data/STP/stp_test_data.json` |
| `OTDTC` | `test-data/OTDTC/otdtc_test_data.json` |
| `RT` | `test-data/RT/rt_test_data.json` |

You can load into multiple lifecycles in one script by calling the loader multiple times:

```typescript
BulkTestDataLoader.fromJsonFile(Lifecycle.STP,   'test-data/STP/bulk.json');
BulkTestDataLoader.fromJsonFile(Lifecycle.OTDTC, 'test-data/OTDTC/bulk.json');
```

---

## Sample Files

Ready-to-use sample files are included in the repository:

| File | Format | Location |
|---|---|---|
| `bulk_input_sample.csv` | CSV | `test-data/STP/bulk_input_sample.csv` |
| `bulk_input_sample.json` | JSON array | `test-data/STP/bulk_input_sample.json` |

Use these as templates when preparing your own bulk input files.

```bash
# Load the sample CSV into STP test data
npm run bulk-load -- --lifecycle STP --file test-data/STP/bulk_input_sample.csv

# Preview the sample JSON without writing
npm run bulk-load -- --lifecycle STP --file test-data/STP/bulk_input_sample.json --dry-run
```
