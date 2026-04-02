import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { PATHS } from '../config/constants';
import { Logger } from '../utils/Logger';

const log = new Logger('GlobalSetup');

async function globalSetup(config: FullConfig): Promise<void> {
  log.info('═══════════════════════════════════════════════════════════');
  log.info('   PLAYWRIGHT AUTOMATION FRAMEWORK — GLOBAL SETUP START   ');
  log.info('═══════════════════════════════════════════════════════════');

  // ── Create required runtime directories ──────────────────────────────────
  const dirs = [
    PATHS.logs,
    PATHS.healingLogs,
    path.join(PATHS.healingLogs, 'snapshots'),
    path.resolve(process.cwd(), 'allure-results'),
    path.resolve(process.cwd(), 'test-results'),
    path.resolve(process.cwd(), '.auth'),
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log.debug(`Directory created: ${dir}`);
    }
  }

  // ── Log run configuration ─────────────────────────────────────────────────
  log.info('Test configuration', {
    testDir: config.projects[0]?.testDir ?? config.rootDir,
    projects: config.projects.map((p) => p.name),
    retries: config.projects[0]?.retries,
    workers: config.workers,
    env: process.env.ENV || 'staging',
    baseUrl: process.env.BASE_URL || 'https://your-application-url.com',
  });

  // ── Validate env variables ────────────────────────────────────────────────
  const required = ['BASE_URL'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    log.warn(`Missing environment variables: ${missing.join(', ')}. Using defaults.`);
  }

  // ── Clear stale allure results from previous run ─────────────────────────
  const allureResultsDir = path.resolve(process.cwd(), 'allure-results');
  if (fs.existsSync(allureResultsDir)) {
    const files = fs.readdirSync(allureResultsDir);
    if (files.length > 0) {
      log.info(`Clearing ${files.length} stale allure result(s)`);
      for (const file of files) {
        fs.rmSync(path.join(allureResultsDir, file), { force: true });
      }
    }
  }

  log.info('Global setup complete');
}

export default globalSetup;
