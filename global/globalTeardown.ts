import { FullConfig } from '@playwright/test';
import { Logger } from '../utils/Logger';

const log = new Logger('GlobalTeardown');

async function globalTeardown(_config: FullConfig): Promise<void> {
  log.info('═══════════════════════════════════════════════════════════');
  log.info('   PLAYWRIGHT AUTOMATION FRAMEWORK — GLOBAL TEARDOWN      ');
  log.info('═══════════════════════════════════════════════════════════');

  log.info('All tests complete. Reports available at:');
  log.info('  HTML  → playwright-report/index.html  (run: npm run report:html)');
  log.info('  Allure → allure-results/              (run: npm run allure:serve)');

  // Flush all log transports
  await Logger.flush().catch(() => {});
}

export default globalTeardown;
