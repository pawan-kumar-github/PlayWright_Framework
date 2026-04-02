# Playwright UI Automation Framework

Enterprise-grade Playwright automation framework with self-healing XPath, Page Object Model, lifecycle-based test data, and dual HTML + Allure reporting.

---

## Architecture

```
PlayWright_Framework/
├── config/                         # Environment config & constants
│   ├── env.config.ts               # Reads .env, exports typed EnvConfig
│   └── constants.ts                # Lifecycle enum, paths, timeouts, enums
│
├── pages/                          # Page Object Model
│   ├── base/
│   │   └── BasePage.ts             # Abstract base — healer, data manager, helpers
│   └── STP/
│       ├── LoginPage.ts
│       ├── DashboardPage.ts
│       ├── CreateSTPPage.ts        # Writes generated STP number to runtimeData
│       ├── ReviewSTPPage.ts
│       └── SearchSTPPage.ts
│
├── utils/                          # Core utilities
│   ├── Logger.ts                   # Winston logger with daily file rotation
│   ├── SelfHealingLocator.ts       # Self-healing XPath engine with fallback chain
│   ├── TestDataManager.ts          # Read-only test data loader (TCID + ITERATION)
│   ├── TestDataUpdater.ts          # Runtime write-back to test data JSON
│   ├── AllureReportHelper.ts       # Allure API abstraction layer
│   ├── DateHelper.ts               # Date formatting utilities
│   └── StringHelper.ts             # String generation utilities
│
├── fixtures/                       # Playwright test fixtures
│   ├── base.fixtures.ts            # Logger, allure (all lifecycles)
│   └── stp.fixtures.ts             # All STP page objects + auth setup
│
├── test-data/                      # Test data per lifecycle
│   ├── STP/
│   │   ├── stp_test_data.json      # Keyed by TCID → iterations[]
│   │   └── stp_locators.json       # XPath registry (primary + fallbacks)
│   ├── OTDTC/
│   │   └── otdtc_test_data.json
│   ├── RT/
│   │   └── rt_test_data.json
│   └── shared/
│       └── common_locators.json
│
├── tests/                          # Spec files organized by lifecycle
│   ├── STP/
│   │   ├── STP_TC001_Login.spec.ts
│   │   ├── STP_TC002_CreateSTP.spec.ts
│   │   ├── STP_TC003_ReviewSTP.spec.ts
│   │   ├── STP_TC004_SearchSTP.spec.ts
│   │   └── STP_TC005_E2ELifecycle.spec.ts
│   ├── OTDTC/
│   └── RT/
│
├── global/
│   ├── globalSetup.ts              # Creates dirs, clears stale allure results
│   └── globalTeardown.ts           # Flushes logger, prints report paths
│
├── healing-logs/                   # Auto-generated: healing events JSON
├── logs/                           # Auto-generated: Winston daily log files
├── allure-results/                 # Auto-generated: raw Allure data
└── playwright-report/              # Auto-generated: HTML report
```

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Install browser binaries
npm run install:browsers

# 3. Copy and configure environment
cp .env.example .env
# Edit .env with your BASE_URL and credentials
```

---

## Running Tests

```bash
# All tests (all browsers)
npm test

# STP lifecycle only
npm run test:stp

# Single browser
npm run test:chrome
npm run test:firefox
npm run test:webkit

# Headed mode (watch the browser)
npm run test:headed

# Debug mode (step-through)
npm run test:debug

# Specific spec file
npx playwright test tests/STP/STP_TC001_Login.spec.ts

# Single test by title
npx playwright test -g "TC_STP_005"
```

---

## Reports

```bash
# Open Playwright HTML report
npm run report:html

# Generate and open Allure report
npm run allure:generate
npm run allure:open

# Live Allure server (during CI)
npm run allure:serve
```

---

## Test Data Structure

Each lifecycle has a dedicated JSON file at `test-data/<LIFECYCLE>/<lifecycle>_test_data.json`.

**TCID** is the top-level primary key. **ITERATION** identifies sub-scenarios.

```json
{
  "TC_STP_001": {
    "TCID": "TC_STP_001",
    "description": "Create STP with mandatory fields",
    "iterations": [
      {
        "ITERATION": 1,
        "stpTitle": "Integration Testing Phase Q2",
        "priority": "High",
        "assignee": "John Doe",
        "startDate": "2026-04-15",
        "endDate": "2026-05-15"
      }
    ],
    "runtimeData": {}   ← written by TestDataUpdater at runtime
  }
}
```

### Reading test data in a spec file

```typescript
const dm = TestDataManager.forLifecycle(Lifecycle.STP);
const data = dm.getIteration('TC_STP_001', 1);   // merges base + iteration
console.log(data.stpTitle);
```

### Updating test data at runtime (in a page class)

```typescript
// After form submission, write generated ID back to JSON
this.dataUpdater.updateRuntimeField(tcid, 'generatedSTPNumber', stpNumber);
this.dataUpdater.updateRuntimeFields(tcid, { submittedAt: new Date().toISOString() });
```

### Reading runtime data in a downstream spec

```typescript
const stpNumber = dm.getRuntimeField('TC_STP_001', 'generatedSTPNumber');
```

---

## Self-Healing XPath

Every element in page classes is defined as a `LocatorDefinition`:

```typescript
const SUBMIT_BUTTON = {
  name: 'Submit Button',
  primary: { type: LocatorStrategyType.XPATH, value: '//button[@id="submitSTP"]' },
  fallbacks: [
    { type: LocatorStrategyType.TEXT,  value: 'Submit',              description: 'by-text' },
    { type: LocatorStrategyType.ROLE,  value: 'button[Submit]',      description: 'by-role' },
    { type: LocatorStrategyType.CSS,   value: 'button[type="submit"]', description: 'by-css' },
  ],
};
```

When `primary` fails (e.g., after a UI change renames the `id`), the engine tries each fallback in order. On success it:
1. Logs a `WARN` with the healing context.
2. Appends a record to `healing-logs/healing_events.json` for post-run review.

**Healing log format:**
```json
{
  "timestamp": "2026-04-01T10:30:00.000Z",
  "elementName": "Submit Button",
  "primaryLocator": { "type": "xpath", "value": "//button[@id='submitSTP']" },
  "usedLocator":    { "type": "text",  "value": "Submit" },
  "fallbackIndex": 0,
  "url": "https://app.example.com/stp/create"
}
```

Review `healing-logs/healing_events.json` after each run to identify stale locators.

---

## Cross-Browser Testing

Configured in `playwright.config.ts` via the `projects` array:

| Project       | Browser                  |
|---------------|--------------------------|
| `chromium`    | Google Chrome            |
| `firefox`     | Mozilla Firefox          |
| `webkit`      | Safari (WebKit)          |
| `edge`        | Microsoft Edge           |
| `mobile-chrome` | Pixel 5 (responsive)  |

Run a specific browser: `npx playwright test --project=firefox`

---

## Adding a New Test Case

1. Add test data entry to the relevant lifecycle JSON (`test-data/STP/stp_test_data.json`).
2. Create the spec file in `tests/STP/` following the `STP_TC00X_*.spec.ts` naming pattern.
3. Import fixtures from `../../fixtures/stp.fixtures` (or `base.fixtures` for unauthenticated tests).
4. Add page methods in the appropriate page class in `pages/STP/`.

## Adding a New Page

1. Create `pages/STP/MyNewPage.ts` extending `BasePage`.
2. Define all locators as `LocatorDefinition` objects with primary + fallbacks.
3. Add the page as a fixture in `fixtures/stp.fixtures.ts`.

---

## Logging

Logs are written to `logs/automation-YYYY-MM-DD.log` (all levels) and `logs/error-YYYY-MM-DD.log` (errors only). Files are rotated daily and compressed after 14 days.

Console output is colorised; file output is JSON for easy parsing in CI log aggregators.
