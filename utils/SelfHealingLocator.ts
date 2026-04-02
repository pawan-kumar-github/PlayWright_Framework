import { Page, Locator } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { Logger } from './Logger';
import { PATHS, TIMEOUTS, LocatorStrategyType } from '../config/constants';

// Re-export so page classes can import LocatorStrategyType from this file
export { LocatorStrategyType } from '../config/constants';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LocatorStrategy {
  type: LocatorStrategyType;
  value: string;
  description?: string;
}

export interface LocatorDefinition {
  /** Human-readable name for this element */
  name: string;
  /** Primary locator — tried first */
  primary: LocatorStrategy;
  /** Ordered list of fallback strategies tried when primary fails */
  fallbacks: LocatorStrategy[];
}

export interface HealingEvent {
  timestamp: string;
  elementName: string;
  primaryLocator: LocatorStrategy;
  usedLocator: LocatorStrategy;
  fallbackIndex: number;
  testTitle?: string;
  url?: string;
}

// ─── Healing Log Writer ───────────────────────────────────────────────────────

function appendHealingEvent(event: HealingEvent): void {
  if (!fs.existsSync(PATHS.healingLogs)) {
    fs.mkdirSync(PATHS.healingLogs, { recursive: true });
  }
  const logFile = path.join(PATHS.healingLogs, 'healing_events.json');
  let existing: HealingEvent[] = [];
  if (fs.existsSync(logFile)) {
    try {
      existing = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
    } catch {
      existing = [];
    }
  }
  existing.push(event);
  fs.writeFileSync(logFile, JSON.stringify(existing, null, 2), 'utf-8');
}

// ─── SelfHealingLocator ───────────────────────────────────────────────────────

/**
 * SelfHealingLocator wraps Playwright's Locator with automatic fallback logic.
 *
 * When the primary locator fails to find a visible element within the probe
 * timeout, it sequentially tries each fallback strategy. On success it:
 *   1. Logs a warning with full context.
 *   2. Appends a healing event to healing-logs/healing_events.json for
 *      post-run auditing and locator maintenance.
 *
 * Usage in a page class:
 *   const healer = new SelfHealingLocator(this.page);
 *   const btn = await healer.locate({
 *     name: 'Submit Button',
 *     primary:   { type: LocatorStrategyType.XPATH, value: '//button[@id="submit"]' },
 *     fallbacks: [
 *       { type: LocatorStrategyType.TEXT,  value: 'Submit' },
 *       { type: LocatorStrategyType.CSS,   value: 'button[type="submit"]' },
 *       { type: LocatorStrategyType.ROLE,  value: 'button[name="Submit"]' },
 *     ],
 *   });
 */
export class SelfHealingLocator {
  private readonly page: Page;
  private readonly logger: Logger;
  private readonly probeTimeout: number;

  constructor(page: Page, probeTimeout: number = TIMEOUTS.SELF_HEALING_PROBE) {
    this.page = page;
    this.logger = new Logger('SelfHealingLocator');
    this.probeTimeout = probeTimeout;
  }

  // ─── Core locate method ─────────────────────────────────────────────────────

  /**
   * Attempts to resolve the element using the primary strategy first.
   * Falls back through the `fallbacks` array on failure.
   * Returns the first Locator that resolves to a visible element.
   * Throws if all strategies are exhausted.
   */
  async locate(definition: LocatorDefinition, testTitle?: string): Promise<Locator> {
    const { name, primary, fallbacks } = definition;

    // ── Try primary ──────────────────────────────────────────────────────────
    try {
      const locator = this.buildLocator(primary);
      await locator.waitFor({ state: 'attached', timeout: this.probeTimeout });
      this.logger.debug(`Primary locator succeeded for "${name}"`, {
        type: primary.type,
        value: primary.value,
      });
      return locator;
    } catch {
      this.logger.warn(`Primary locator failed for "${name}" — initiating self-healing`, {
        type: primary.type,
        value: primary.value,
      });
    }

    // ── Try fallbacks in order ───────────────────────────────────────────────
    for (let i = 0; i < fallbacks.length; i++) {
      const fallback = fallbacks[i];
      try {
        const locator = this.buildLocator(fallback);
        await locator.waitFor({ state: 'attached', timeout: this.probeTimeout });

        // Healing successful — log and record
        this.logger.healing(
          `${primary.type}:${primary.value}`,
          `${fallback.type}:${fallback.value}`,
          fallback.description ?? fallback.type,
        );

        const healingEvent: HealingEvent = {
          timestamp: new Date().toISOString(),
          elementName: name,
          primaryLocator: primary,
          usedLocator: fallback,
          fallbackIndex: i,
          testTitle,
          url: this.page.url(),
        };
        appendHealingEvent(healingEvent);

        this.logger.info(`Self-healing succeeded for "${name}" using fallback[${i}]`, {
          strategy: fallback.description ?? fallback.type,
          value: fallback.value,
        });

        return locator;
      } catch {
        this.logger.debug(`Fallback[${i}] failed for "${name}"`, {
          type: fallback.type,
          value: fallback.value,
        });
      }
    }

    throw new Error(
      `[SelfHealingLocator] All strategies exhausted for element "${name}".\n` +
      `  Primary: ${primary.type} = ${primary.value}\n` +
      `  Tried ${fallbacks.length} fallback(s). Check healing-logs/healing_events.json for history.`,
    );
  }

  // ─── Convenience factory: build from selector string ─────────────────────

  /**
   * Quick helper for inline use when you only have a primary selector.
   * Automatically generates semantic fallbacks from element attributes found on page.
   */
  async locateByXPath(
    xpath: string,
    elementName: string,
    additionalFallbacks: LocatorStrategy[] = [],
  ): Promise<Locator> {
    return this.locate({
      name: elementName,
      primary: { type: LocatorStrategyType.XPATH, value: xpath },
      fallbacks: additionalFallbacks,
    });
  }

  // ─── Locator builder ────────────────────────────────────────────────────────

  private buildLocator(strategy: LocatorStrategy): Locator {
    switch (strategy.type) {
      case LocatorStrategyType.XPATH:
        return this.page.locator(`xpath=${strategy.value}`);

      case LocatorStrategyType.CSS:
        return this.page.locator(strategy.value);

      case LocatorStrategyType.TEXT:
        return this.page.locator(`text=${strategy.value}`);

      case LocatorStrategyType.ROLE: {
        // value format: "role[name]" e.g. "button[Submit]" or just "button"
        const roleMatch = strategy.value.match(/^(\w+)\[(.+)]$/);
        if (roleMatch) {
          return this.page.getByRole(roleMatch[1] as Parameters<Page['getByRole']>[0], {
            name: roleMatch[2],
          });
        }
        return this.page.getByRole(strategy.value as Parameters<Page['getByRole']>[0]);
      }

      case LocatorStrategyType.LABEL:
        return this.page.getByLabel(strategy.value);

      case LocatorStrategyType.PLACEHOLDER:
        return this.page.getByPlaceholder(strategy.value);

      case LocatorStrategyType.TEST_ID:
        return this.page.getByTestId(strategy.value);

      case LocatorStrategyType.ALT_TEXT:
        return this.page.getByAltText(strategy.value);

      default:
        throw new Error(`[SelfHealingLocator] Unknown strategy type: ${(strategy as LocatorStrategy).type}`);
    }
  }

  // ─── Utility: generate fallback suggestions from DOM ─────────────────────

  /**
   * Inspects the first element matching the primary locator and generates
   * suggested fallback strategies based on its attributes.
   * Call this during framework development to bootstrap locator definitions.
   */
  async suggestFallbacks(primaryXPath: string): Promise<LocatorStrategy[]> {
    try {
      const element = this.page.locator(`xpath=${primaryXPath}`).first();
      const attrs = await element.evaluate((el: Element) => ({
        id: el.id,
        name: el.getAttribute('name'),
        ariaLabel: el.getAttribute('aria-label'),
        testId: el.getAttribute('data-testid'),
        placeholder: el.getAttribute('placeholder'),
        text: (el as HTMLElement).innerText?.trim().substring(0, 50),
        tagName: el.tagName.toLowerCase(),
        className: el.className,
      }));

      const suggestions: LocatorStrategy[] = [];

      if (attrs.id) {
        suggestions.push({ type: LocatorStrategyType.CSS, value: `#${attrs.id}`, description: 'by-id' });
      }
      if (attrs.testId) {
        suggestions.push({ type: LocatorStrategyType.TEST_ID, value: attrs.testId, description: 'by-data-testid' });
      }
      if (attrs.ariaLabel) {
        suggestions.push({ type: LocatorStrategyType.LABEL, value: attrs.ariaLabel, description: 'by-aria-label' });
      }
      if (attrs.placeholder) {
        suggestions.push({ type: LocatorStrategyType.PLACEHOLDER, value: attrs.placeholder, description: 'by-placeholder' });
      }
      if (attrs.text) {
        suggestions.push({ type: LocatorStrategyType.TEXT, value: attrs.text, description: 'by-visible-text' });
      }
      if (attrs.name) {
        suggestions.push({
          type: LocatorStrategyType.XPATH,
          value: `//${attrs.tagName}[@name="${attrs.name}"]`,
          description: 'by-name-attr',
        });
      }

      return suggestions;
    } catch {
      return [];
    }
  }
}

export default SelfHealingLocator;
