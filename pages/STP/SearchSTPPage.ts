import { Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { LocatorStrategyType } from '../../utils/SelfHealingLocator';
import { Lifecycle } from '../../config/constants';

export interface SearchFilters {
  stpNumber?: string;
  title?: string;
  status?: string;
  priority?: string;
  dateFrom?: string;
  dateTo?: string;
  assignee?: string;
}

/**
 * SearchSTPPage — STP search and filter page.
 */
export class SearchSTPPage extends BasePage {
  private readonly LOCATORS = {
    SEARCH_INPUT: {
      name: 'Global Search Input',
      primary: { type: LocatorStrategyType.XPATH, value: '//input[@id="searchInput"]' },
      fallbacks: [
        { type: LocatorStrategyType.PLACEHOLDER, value: 'Search...', description: 'by-placeholder' },
        { type: LocatorStrategyType.XPATH, value: '//input[@type="search"]', description: 'by-type' },
      ],
    },
    STP_NUMBER_FILTER: {
      name: 'STP Number Filter',
      primary: { type: LocatorStrategyType.XPATH, value: '//input[@id="filterSTPNumber"]' },
      fallbacks: [
        { type: LocatorStrategyType.LABEL, value: 'STP Number', description: 'by-label' },
        { type: LocatorStrategyType.PLACEHOLDER, value: 'STP Number', description: 'by-placeholder' },
      ],
    },
    STATUS_FILTER: {
      name: 'Status Filter Dropdown',
      primary: { type: LocatorStrategyType.XPATH, value: '//select[@id="filterStatus"]' },
      fallbacks: [
        { type: LocatorStrategyType.LABEL, value: 'Status', description: 'by-label' },
      ],
    },
    PRIORITY_FILTER: {
      name: 'Priority Filter',
      primary: { type: LocatorStrategyType.XPATH, value: '//select[@id="filterPriority"]' },
      fallbacks: [
        { type: LocatorStrategyType.LABEL, value: 'Priority', description: 'by-label' },
      ],
    },
    DATE_FROM_FILTER: {
      name: 'Date From Filter',
      primary: { type: LocatorStrategyType.XPATH, value: '//input[@id="filterDateFrom"]' },
      fallbacks: [
        { type: LocatorStrategyType.LABEL, value: 'From Date', description: 'by-label' },
      ],
    },
    DATE_TO_FILTER: {
      name: 'Date To Filter',
      primary: { type: LocatorStrategyType.XPATH, value: '//input[@id="filterDateTo"]' },
      fallbacks: [
        { type: LocatorStrategyType.LABEL, value: 'To Date', description: 'by-label' },
      ],
    },
    SEARCH_BUTTON: {
      name: 'Search Button',
      primary: { type: LocatorStrategyType.XPATH, value: '//button[@id="searchBtn"]' },
      fallbacks: [
        { type: LocatorStrategyType.TEXT, value: 'Search', description: 'by-text' },
        { type: LocatorStrategyType.ROLE, value: 'button[Search]', description: 'by-role-name' },
      ],
    },
    CLEAR_FILTERS_BUTTON: {
      name: 'Clear Filters Button',
      primary: { type: LocatorStrategyType.XPATH, value: '//button[@id="clearFilters"]' },
      fallbacks: [
        { type: LocatorStrategyType.TEXT, value: 'Clear', description: 'by-text' },
        { type: LocatorStrategyType.TEXT, value: 'Reset', description: 'by-reset-text' },
      ],
    },
    RESULTS_TABLE: {
      name: 'Search Results Table',
      primary: { type: LocatorStrategyType.XPATH, value: '//table[@id="stpResultsTable"]' },
      fallbacks: [
        { type: LocatorStrategyType.XPATH, value: '//table[contains(@class,"results")]', description: 'by-class' },
        { type: LocatorStrategyType.CSS, value: 'table.results-table', description: 'by-css' },
      ],
    },
    RESULTS_COUNT: {
      name: 'Results Count Label',
      primary: { type: LocatorStrategyType.XPATH, value: '//span[@id="resultsCount"]' },
      fallbacks: [
        { type: LocatorStrategyType.XPATH, value: '//*[contains(text(),"results found")]', description: 'by-text-content' },
      ],
    },
    NO_RESULTS_MESSAGE: {
      name: 'No Results Message',
      primary: { type: LocatorStrategyType.XPATH, value: '//div[@id="noResultsMsg"]' },
      fallbacks: [
        { type: LocatorStrategyType.TEXT, value: 'No results found', description: 'by-text' },
        { type: LocatorStrategyType.XPATH, value: '//*[contains(text(),"No results")]', description: 'by-partial-text' },
      ],
    },
  };

  constructor(page: Page) {
    super(page, Lifecycle.STP);
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  async search(query: string): Promise<void> {
    await this.step(`Search: "${query}"`, async () => {
      await this.fill(this.LOCATORS.SEARCH_INPUT, query);
      await this.click(this.LOCATORS.SEARCH_BUTTON);
      await this.waitForPageLoad();
    });
  }

  async applyFilters(filters: SearchFilters): Promise<void> {
    await this.step('Apply search filters', async () => {
      if (filters.stpNumber) await this.fill(this.LOCATORS.STP_NUMBER_FILTER, filters.stpNumber);
      if (filters.status) await this.selectOption(this.LOCATORS.STATUS_FILTER, filters.status);
      if (filters.priority) await this.selectOption(this.LOCATORS.PRIORITY_FILTER, filters.priority);
      if (filters.dateFrom) await this.fill(this.LOCATORS.DATE_FROM_FILTER, filters.dateFrom);
      if (filters.dateTo) await this.fill(this.LOCATORS.DATE_TO_FILTER, filters.dateTo);
      await this.click(this.LOCATORS.SEARCH_BUTTON);
      await this.waitForPageLoad();
      this.logger.info('Filters applied', { filters });
    });
  }

  async clearFilters(): Promise<void> {
    await this.click(this.LOCATORS.CLEAR_FILTERS_BUTTON);
    await this.waitForPageLoad();
  }

  async openSTPByNumber(stpNumber: string): Promise<void> {
    await this.step(`Open STP: ${stpNumber}`, async () => {
      const rowLink = await this.findByXPath(
        `//table//a[text()="${stpNumber}"]`,
        `STP Link: ${stpNumber}`,
        [{ type: LocatorStrategyType.XPATH, value: `//td[contains(text(),"${stpNumber}")]/..//a`, description: 'by-td-row-link' }],
      );
      await rowLink.click();
      await this.waitForPageLoad();
    });
  }

  // ─── Assertions ───────────────────────────────────────────────────────────

  async assertResultsVisible(): Promise<void> {
    await this.assertVisible(this.LOCATORS.RESULTS_TABLE);
  }

  async assertNoResults(): Promise<void> {
    await this.assertVisible(this.LOCATORS.NO_RESULTS_MESSAGE);
  }

  async assertResultCount(expectedCount: number): Promise<void> {
    const text = await this.getText(this.LOCATORS.RESULTS_COUNT);
    const match = text.match(/(\d+)/);
    const actualCount = match ? parseInt(match[1], 10) : 0;
    if (actualCount !== expectedCount) {
      throw new Error(`Expected ${expectedCount} results but got ${actualCount}`);
    }
  }

  // ─── Getters ──────────────────────────────────────────────────────────────

  async getResultsCount(): Promise<number> {
    const text = await this.getText(this.LOCATORS.RESULTS_COUNT);
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  async getFirstResultSTPNumber(): Promise<string> {
    const firstRow = await this.findByXPath(
      '//table[@id="stpResultsTable"]//tbody//tr[1]//td[1]',
      'First Result STP Number',
    );
    return firstRow.textContent() as Promise<string>;
  }
}

export default SearchSTPPage;
