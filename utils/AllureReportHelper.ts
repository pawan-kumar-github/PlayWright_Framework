import { Page } from '@playwright/test';
import {
  label,
  severity as allureSeverity,
  epic,
  feature,
  story,
  suite,
  owner,
  tag,
  description,
  descriptionHtml,
  issue,
  tms,
  step as allureStep,
  attachment,
  parameter,
  layer,
} from 'allure-js-commons';
import { Logger } from './Logger';
import { Severity, TestLayer } from '../config/constants';

/**
 * AllureReportHelper — Abstraction over allure-js-commons named function API (v3+).
 *
 * allure-js-commons functions return PromiseLike<void> (not full Promise), so
 * they are wrapped via the private `fire()` helper which promotes them to a real
 * Promise and swallows errors so metadata calls never break a test.
 */
export class AllureReportHelper {
  private static readonly logger = new Logger('AllureReportHelper');

  /** Promotes a PromiseLike to a real Promise and swallows errors (fire-and-forget). */
  private static fire(p: PromiseLike<void>): void {
    Promise.resolve(p).catch(() => {});
  }

  // ─── Test metadata ────────────────────────────────────────────────────────

  static setSeverity(sev: Severity): void {
    AllureReportHelper.fire(allureSeverity(sev));
  }

  static setLayer(l: TestLayer): void {
    AllureReportHelper.fire(layer(l));
  }

  static addLabel(name: string, value: string): void {
    AllureReportHelper.fire(label(name, value));
  }

  static setOwner(ownerName: string): void {
    AllureReportHelper.fire(owner(ownerName));
  }

  static addTag(...tags: string[]): void {
    tags.forEach((t) => AllureReportHelper.fire(tag(t)));
  }

  static setDescription(desc: string, type: 'text' | 'html' | 'markdown' = 'markdown'): void {
    AllureReportHelper.fire(type === 'html' ? descriptionHtml(desc) : description(desc));
  }

  static linkIssue(issueId: string, name?: string): void {
    AllureReportHelper.fire(issue(name ?? issueId, issueId));
  }

  static linkTestCase(testCaseId: string, name?: string): void {
    AllureReportHelper.fire(tms(name ?? testCaseId, testCaseId));
  }

  static setLifecycle(lifecycle: string): void {
    AllureReportHelper.fire(suite(lifecycle));
  }

  static setFeature(feat: string): void {
    AllureReportHelper.fire(feature(feat));
  }

  static setStory(st: string): void {
    AllureReportHelper.fire(story(st));
  }

  static setEpic(ep: string): void {
    AllureReportHelper.fire(epic(ep));
  }

  // ─── Steps ────────────────────────────────────────────────────────────────

  /**
   * Wraps an async action in an Allure step and returns the action's result.
   * The allure step body is typed void internally; result is captured via closure.
   */
  static async step<T>(name: string, action: () => Promise<T>): Promise<T> {
    AllureReportHelper.logger.step(name);
    let result!: T;
    await Promise.resolve(
      allureStep(name, async () => {
        result = await action();
      }),
    );
    return result;
  }

  /** Logs a named step annotation with no callback (informational marker). */
  static logStep(message: string): void {
    AllureReportHelper.logger.info(`[Step] ${message}`);
    AllureReportHelper.fire(allureStep(message, async () => {}));
  }

  // ─── Attachments ─────────────────────────────────────────────────────────

  /** Captures a full-page screenshot and attaches it to the Allure report. */
  static async attachScreenshot(name: string, page: Page): Promise<void> {
    try {
      const screenshot = await page.screenshot({ fullPage: true });
      await Promise.resolve(attachment(name, screenshot, { contentType: 'image/png' }));
      AllureReportHelper.logger.debug(`Screenshot attached: ${name}`);
    } catch (err) {
      AllureReportHelper.logger.warn(`Failed to attach screenshot: ${name}`, {
        error: (err as Error).message,
      });
    }
  }

  /** Attaches arbitrary text content. */
  static attachText(name: string, content: string, contentType = 'text/plain'): void {
    AllureReportHelper.fire(attachment(name, Buffer.from(content), { contentType }));
    AllureReportHelper.logger.debug(`Text attachment added: ${name}`);
  }

  /** Attaches a JSON object, pretty-printed. */
  static attachJson(name: string, data: unknown): void {
    const content = JSON.stringify(data, null, 2);
    AllureReportHelper.fire(attachment(name, Buffer.from(content), { contentType: 'application/json' }));
  }

  /** Attaches a raw buffer with the given content type. */
  static attachFile(name: string, content: Buffer, contentType: string): void {
    AllureReportHelper.fire(attachment(name, content, { contentType }));
  }

  // ─── Parameters ───────────────────────────────────────────────────────────

  /** Adds a test parameter visible in the Allure report. */
  static addParameter(name: string, value: string | number | boolean): void {
    AllureReportHelper.fire(parameter(name, String(value)));
  }

  /** Convenience: adds TCID, iteration and lifecycle as Allure parameters. */
  static addTestDataContext(tcid: string, iteration: number, lifecycle: string): void {
    AllureReportHelper.addParameter('TCID', tcid);
    AllureReportHelper.addParameter('Iteration', iteration);
    AllureReportHelper.addParameter('Lifecycle', lifecycle);
  }
}

export default AllureReportHelper;
