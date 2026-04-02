import path from 'path';

// ─── Lifecycle Names ────────────────────────────────────────────────────────
export enum Lifecycle {
  STP = 'STP',
  OTDTC = 'OTDTC',
  RT = 'RT',
}

// ─── Paths ──────────────────────────────────────────────────────────────────
export const PATHS = {
  
  testData: path.resolve(__dirname, '..', 'test-data'),
  healingLogs: path.resolve(__dirname, '..', 'healing-logs'),
  logs: path.resolve(__dirname, '..', 'logs'),
  authState: path.resolve(__dirname, '..', '.auth', 'storageState.json'),
};

export const testDataPath = (lifecycle: Lifecycle): string =>
  path.join(PATHS.testData, lifecycle, `${lifecycle.toLowerCase()}_test_data.json`);

export const locatorDataPath = (lifecycle: Lifecycle | 'shared'): string =>
  path.join(PATHS.testData, lifecycle === 'shared' ? 'shared' : lifecycle, `${lifecycle.toLowerCase()}_locators.json`);

// ─── Timeouts (ms) ──────────────────────────────────────────────────────────
export const TIMEOUTS = {
  DEFAULT: 60_000,
  NAVIGATION: 60_000,
  ACTION: 15_000,
  ASSERTION: 10_000,
  SELF_HEALING_PROBE: 2_000,   // Time to probe each fallback strategy
  POLLING_INTERVAL: 500,
} as const;

// ─── Self-Healing Locator Strategy Priority ─────────────────────────────────
export enum LocatorStrategyType {
  XPATH = 'xpath',
  CSS = 'css',
  TEXT = 'text',
  ROLE = 'role',
  LABEL = 'label',
  PLACEHOLDER = 'placeholder',
  TEST_ID = 'testid',
  ALT_TEXT = 'alttext',
}

// ─── Allure Labels ───────────────────────────────────────────────────────────
export enum Severity {
  BLOCKER = 'blocker',
  CRITICAL = 'critical',
  NORMAL = 'normal',
  MINOR = 'minor',
  TRIVIAL = 'trivial',
}

export enum TestLayer {
  E2E = 'e2e',
  INTEGRATION = 'integration',
  UNIT = 'unit',
}

// ─── Log Levels ──────────────────────────────────────────────────────────────
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

// ─── Test Data Keys ──────────────────────────────────────────────────────────
export const TD_KEYS = {
  TCID: 'TCID',
  ITERATION: 'ITERATION',
  RUNTIME_DATA: 'runtimeData',
} as const;
