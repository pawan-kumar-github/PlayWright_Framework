import { Page, Locator, expect } from '@playwright/test';
import { SelfHealingLocator, LocatorDefinition } from '../../utils/SelfHealingLocator';
import { TestDataManager } from '../../utils/TestDataManager';
import { TestDataUpdater } from '../../utils/TestDataUpdater';
import { ScopedDataManager } from '../../utils/ScopedDataManager';
import { AllureReportHelper } from '../../utils/AllureReportHelper';
import { Logger } from '../../utils/Logger';
import { Lifecycle, TIMEOUTS } from '../../config/constants';
import { envConfig } from '../../config/env.config';

/**
 * BasePage — Abstract base class for all Page Object classes.
 *
 * Provides:
 *   - SelfHealingLocator for all element resolution
 *   - TestDataManager / TestDataUpdater wired to the lifecycle
 *   - Commonly reused UI interaction helpers (click, fill, select, etc.)
 *   - Navigation and wait helpers
 *   - Screenshot and Allure step helpers
 *
 * Every page class extends BasePage and calls super(page, lifecycle).
 */
export abstract class BasePage {
  protected readonly page: Page;
  protected readonly healer: SelfHealingLocator;
  protected readonly dataManager: TestDataManager;
  protected readonly dataUpdater: TestDataUpdater;
  protected readonly logger: Logger;
  protected readonly lifecycle: Lifecycle;
  /** Injected by withScope() — available in page methods after scope is set. */
  protected scopedData!: ScopedDataManager;
  /** Tracks whether the browser has made its first navigation in this session. */
  private hasNavigated = false;

  constructor(page: Page, lifecycle: Lifecycle) {
    this.page = page;
    this.lifecycle = lifecycle;
    this.healer = new SelfHealingLocator(page);
    this.dataManager = TestDataManager.forLifecycle(lifecycle);
    this.dataUpdater = new TestDataUpdater(lifecycle);
    this.logger = new Logger(this.constructor.name);
  }

  // ─── Scope injection ─────────────────────────────────────────────────────

  /**
   * Injects a ScopedDataManager pre-bound to the current test's TCID + ITERATION.
   * Call this in the spec before invoking page methods that read from scopedData.
   * Returns `this` for fluent chaining.
   *
   * Usage:
   *   loginPage.withScope(scopedData);
   *   await loginPage.loginFromScope();    // reads username/password internally
   *
   *   // or fluent:
   *   await loginPage.withScope(scopedData).loginFromScope();
   */
  withScope(scopedData: ScopedDataManager): this {
    this.scopedData = scopedData;
    this.logger.debug(`Scope injected: ${scopedData}`);
    return this;
  }

  // ─── Navigation ───────────────────────────────────────────────────────────

  async navigate(path = ''): Promise<void> {
    const url = `${envConfig.baseUrl}${path}`;
    this.logger.info(`Navigating to: ${url}`);
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUTS.NAVIGATION });

    if (!this.hasNavigated) {
      // First navigation after browser launch: wait for full network idle so
      // JS bundles, auth cookies and initial API calls have all settled.
      this.logger.info('First navigation — waiting for networkidle to stabilize');
      await this.page.waitForLoadState('networkidle', { timeout: TIMEOUTS.NAVIGATION });
      this.hasNavigated = true;
    }
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout: TIMEOUTS.NAVIGATION });
  }

  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  async getPageTitle(): Promise<string> {
    return this.page.title();
  }

  async goBack(): Promise<void> {
    await this.page.goBack({ waitUntil: 'domcontentloaded' });
  }

  // ─── Element resolution (self-healing entry point) ────────────────────────

  /**
   * Resolves an element using self-healing logic.
   * Preferred over direct page.locator() in all page classes.
   */
  async findElement(definition: LocatorDefinition): Promise<Locator> {
    return this.healer.locate(definition);
  }

  /**
   * Resolves an element by XPath with automatic fallback suggestions.
   */
  async findByXPath(xpath: string, name: string, fallbacks: LocatorDefinition['fallbacks'] = []): Promise<Locator> {
    return this.healer.locateByXPath(xpath, name, fallbacks);
  }

  // ─── Interaction helpers ──────────────────────────────────────────────────

  async click(definition: LocatorDefinition): Promise<void> {
    this.logger.debug(`Clicking: ${definition.name}`);
    const locator = await this.findElement(definition);
    await locator.click({ timeout: TIMEOUTS.ACTION });
  }

  async fill(definition: LocatorDefinition, value: string): Promise<void> {
    this.logger.debug(`Filling "${definition.name}" with: ${value}`);
    const locator = await this.findElement(definition);
    await locator.clear();
    await locator.fill(value, { timeout: TIMEOUTS.ACTION });
  }

  async selectOption(definition: LocatorDefinition, value: string): Promise<void> {
    this.logger.debug(`Selecting option "${value}" in: ${definition.name}`);
    const locator = await this.findElement(definition);
    await locator.selectOption(value, { timeout: TIMEOUTS.ACTION });
  }

  async check(definition: LocatorDefinition): Promise<void> {
    this.logger.debug(`Checking: ${definition.name}`);
    const locator = await this.findElement(definition);
    await locator.check({ timeout: TIMEOUTS.ACTION });
  }

  async uncheck(definition: LocatorDefinition): Promise<void> {
    const locator = await this.findElement(definition);
    await locator.uncheck({ timeout: TIMEOUTS.ACTION });
  }

  async hover(definition: LocatorDefinition): Promise<void> {
    const locator = await this.findElement(definition);
    await locator.hover({ timeout: TIMEOUTS.ACTION });
  }

  async getText(definition: LocatorDefinition): Promise<string> {
    const locator = await this.findElement(definition);
    return (await locator.textContent({ timeout: TIMEOUTS.ACTION })) ?? '';
  }

  async getValue(definition: LocatorDefinition): Promise<string> {
    const locator = await this.findElement(definition);
    return locator.inputValue({ timeout: TIMEOUTS.ACTION });
  }

  async isVisible(definition: LocatorDefinition): Promise<boolean> {
    try {
      const locator = await this.findElement(definition);
      return locator.isVisible();
    } catch {
      return false;
    }
  }

  async isEnabled(definition: LocatorDefinition): Promise<boolean> {
    const locator = await this.findElement(definition);
    return locator.isEnabled();
  }

  async uploadFile(definition: LocatorDefinition, filePath: string): Promise<void> {
    const locator = await this.findElement(definition);
    await locator.setInputFiles(filePath);
  }

  // ─── Wait helpers ─────────────────────────────────────────────────────────

  async waitForVisible(definition: LocatorDefinition, timeout: number = TIMEOUTS.DEFAULT): Promise<void> {
    const locator = await this.findElement(definition);
    await locator.waitFor({ state: 'visible', timeout });
  }

  async waitForHidden(definition: LocatorDefinition, timeout = TIMEOUTS.DEFAULT): Promise<void> {
    const locator = await this.findElement(definition);
    await locator.waitFor({ state: 'hidden', timeout });
  }

  async waitForText(text: string, timeout = TIMEOUTS.DEFAULT): Promise<void> {
    await this.page.waitForFunction(
      (t) => document.body.innerText.includes(t),
      text,
      { timeout },
    );
  }

  async waitForUrl(urlPattern: string | RegExp, timeout = TIMEOUTS.NAVIGATION): Promise<void> {
    await this.page.waitForURL(urlPattern, { timeout });
  }

  async pause(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  // ─── Assertion helpers ────────────────────────────────────────────────────

  async assertVisible(definition: LocatorDefinition): Promise<void> {
    const locator = await this.findElement(definition);
    await expect(locator).toBeVisible({ timeout: TIMEOUTS.ASSERTION });
  }

  async assertText(definition: LocatorDefinition, expected: string): Promise<void> {
    const locator = await this.findElement(definition);
    await expect(locator).toHaveText(expected, { timeout: TIMEOUTS.ASSERTION });
  }

  async assertContainsText(definition: LocatorDefinition, text: string): Promise<void> {
    const locator = await this.findElement(definition);
    await expect(locator).toContainText(text, { timeout: TIMEOUTS.ASSERTION });
  }

  async assertPageTitle(expectedTitle: string): Promise<void> {
    await expect(this.page).toHaveTitle(expectedTitle, { timeout: TIMEOUTS.ASSERTION });
  }

  async assertUrl(expectedUrl: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(expectedUrl, { timeout: TIMEOUTS.ASSERTION });
  }

  // ─── Test data helpers ────────────────────────────────────────────────────

  /**
   * Returns the TCID of the current iteration scope (e.g. 'TC_LOGIN_001').
   * Requires withScope() to be called first.
   */
  getTCID(): string {
    if (!this.scopedData) {
      throw new Error(
        `[BasePage] Cannot call getTCID() before withScope() is set. ` +
        `Call page.withScope(scopedData) in your spec or fixture first.`,
      );
    }
    return this.scopedData.tcid;
  }

  /**
   * Returns the iteration number of the current scope (e.g. 1, 2, 3).
   * Requires withScope() to be called first.
   */
  getIterationNumber(): number {
    if (!this.scopedData) {
      throw new Error(
        `[BasePage] Cannot call getIterationNumber() before withScope() is set. ` +
        `Call page.withScope(scopedData) in your spec or fixture first.`,
      );
    }
    return this.scopedData.iteration;
  }

  /**
   * Returns a field value from JSON test data using the injected scope.
   * No TCID or iteration needed — they are pre-bound via withScope().
   *
   * Throws a clear error if the field is missing, or if withScope() was
   * never called before this method.
   *
   * Usage (after withScope is called in the spec):
   *   const role = this.getValueFromJSON<string>('role');
   */
  getValueFromJSON<T = unknown>(key: string): T {
    if (!this.scopedData) {
      throw new Error(
        `[BasePage] Cannot call getValueFromJSON("${key}") before withScope() is set. ` +
        `Call page.withScope(scopedData) in your spec or fixture first.`,
      );
    }
    return this.scopedData.get<T>(key);
  }

  /**
   * Returns a field value or undefined if absent (non-throwing version).
   * Requires withScope() to be called first.
   */
  getValueFromJSONOrNull<T = unknown>(key: string): T | undefined {
    if (!this.scopedData) return undefined;
    return this.scopedData.getOrNull<T>(key);
  }

  /**
   * Updates a field in the JSON test data for the current iteration.
   * No TCID or iteration needed — they are pre-bound via withScope().
   *
   * Writes to the JSON file immediately and updates the in-memory cache,
   * so a subsequent getValueFromJSON() call returns the new value.
   *
   * Throws if withScope() was never called before this method.
   *
   * Usage (after withScope is called in the spec):
   *   this.updateValueInJSON('status', 'submitted');
   */
  updateValueInJSON(key: string, value: unknown): void {
    if (!this.scopedData) {
      throw new Error(
        `[BasePage] Cannot call updateValueInJSON("${key}") before withScope() is set. ` +
        `Call page.withScope(scopedData) in your spec or fixture first.`,
      );
    }
    this.scopedData.update(key, value);
  }

  /**
   * Returns merged test data for the given TCID and iteration.
   * Direct pass-through to TestDataManager.
   */
  getTestData(tcid: string, iteration = 1) {
    return this.dataManager.getIteration(tcid, iteration);
  }

  /**
   * Returns the runtime data written back during previous test steps.
   */
  getRuntimeData(tcid: string) {
    return this.dataManager.getRuntimeData(tcid);
  }

  // ─── Reporting helpers ────────────────────────────────────────────────────

  async step<T>(name: string, action: () => Promise<T>): Promise<T> {
    return AllureReportHelper.step(name, action);
  }

  async screenshot(name: string): Promise<void> {
    await AllureReportHelper.attachScreenshot(name, this.page);
  }

  // ─── Scroll ───────────────────────────────────────────────────────────────

  async scrollToElement(definition: LocatorDefinition): Promise<void> {
    const locator = await this.findElement(definition);
    await locator.scrollIntoViewIfNeeded();
  }

  async scrollToBottom(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }

  // ─── Alert handling ───────────────────────────────────────────────────────

  async acceptAlert(): Promise<void> {
    this.page.on('dialog', (dialog) => dialog.accept());
  }

  async dismissAlert(): Promise<void> {
    this.page.on('dialog', (dialog) => dialog.dismiss());
  }
}

export default BasePage;
