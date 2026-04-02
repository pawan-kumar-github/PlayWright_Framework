import { Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { LocatorStrategyType } from '../../utils/SelfHealingLocator';
import { Lifecycle } from '../../config/constants';
import { AllureReportHelper } from '../../utils/AllureReportHelper';

export interface STPFormData {
  title: string;
  description: string;
  priority: string;
  assignee: string;
  startDate: string;
  endDate: string;
  category?: string;
  attachmentPath?: string;
}

/**
 * CreateSTPPage — STP creation form.
 *
 * After successful form submission, writes the generated STP number back to
 * the test data JSON via TestDataUpdater so downstream steps can reference it.
 */
export class CreateSTPPage extends BasePage {
  private readonly LOCATORS = {
    PAGE_HEADER: {
      name: 'Create STP Header',
      primary: { type: LocatorStrategyType.XPATH, value: '//h2[@id="createSTPHeader"]' },
      fallbacks: [
        { type: LocatorStrategyType.TEXT, value: 'Create STP', description: 'by-text' },
        { type: LocatorStrategyType.XPATH, value: '//h2[contains(text(),"Create")]', description: 'by-partial-h2' },
      ],
    },
    TITLE_INPUT: {
      name: 'STP Title Input',
      primary: { type: LocatorStrategyType.XPATH, value: '//input[@id="stpTitle"]' },
      fallbacks: [
        { type: LocatorStrategyType.LABEL, value: 'Title', description: 'by-label' },
        { type: LocatorStrategyType.PLACEHOLDER, value: 'Enter STP title', description: 'by-placeholder' },
        { type: LocatorStrategyType.XPATH, value: '//input[@name="title"]', description: 'by-name' },
      ],
    },
    DESCRIPTION_TEXTAREA: {
      name: 'STP Description',
      primary: { type: LocatorStrategyType.XPATH, value: '//textarea[@id="stpDescription"]' },
      fallbacks: [
        { type: LocatorStrategyType.LABEL, value: 'Description', description: 'by-label' },
        { type: LocatorStrategyType.XPATH, value: '//textarea[@name="description"]', description: 'by-name' },
      ],
    },
    PRIORITY_DROPDOWN: {
      name: 'Priority Dropdown',
      primary: { type: LocatorStrategyType.XPATH, value: '//select[@id="priority"]' },
      fallbacks: [
        { type: LocatorStrategyType.LABEL, value: 'Priority', description: 'by-label' },
        { type: LocatorStrategyType.XPATH, value: '//select[@name="priority"]', description: 'by-name' },
      ],
    },
    ASSIGNEE_INPUT: {
      name: 'Assignee Input',
      primary: { type: LocatorStrategyType.XPATH, value: '//input[@id="assignee"]' },
      fallbacks: [
        { type: LocatorStrategyType.PLACEHOLDER, value: 'Search assignee', description: 'by-placeholder' },
        { type: LocatorStrategyType.LABEL, value: 'Assignee', description: 'by-label' },
      ],
    },
    START_DATE_INPUT: {
      name: 'Start Date',
      primary: { type: LocatorStrategyType.XPATH, value: '//input[@id="startDate"]' },
      fallbacks: [
        { type: LocatorStrategyType.LABEL, value: 'Start Date', description: 'by-label' },
        { type: LocatorStrategyType.XPATH, value: '//input[@name="startDate"]', description: 'by-name' },
      ],
    },
    END_DATE_INPUT: {
      name: 'End Date',
      primary: { type: LocatorStrategyType.XPATH, value: '//input[@id="endDate"]' },
      fallbacks: [
        { type: LocatorStrategyType.LABEL, value: 'End Date', description: 'by-label' },
        { type: LocatorStrategyType.XPATH, value: '//input[@name="endDate"]', description: 'by-name' },
      ],
    },
    CATEGORY_DROPDOWN: {
      name: 'Category Dropdown',
      primary: { type: LocatorStrategyType.XPATH, value: '//select[@id="category"]' },
      fallbacks: [
        { type: LocatorStrategyType.LABEL, value: 'Category', description: 'by-label' },
      ],
    },
    ATTACHMENT_INPUT: {
      name: 'Attachment File Input',
      primary: { type: LocatorStrategyType.XPATH, value: '//input[@type="file"][@id="attachment"]' },
      fallbacks: [
        { type: LocatorStrategyType.CSS, value: 'input[type="file"]', description: 'by-type' },
      ],
    },
    SUBMIT_BUTTON: {
      name: 'Submit STP Button',
      primary: { type: LocatorStrategyType.XPATH, value: '//button[@id="submitSTP"]' },
      fallbacks: [
        { type: LocatorStrategyType.TEXT, value: 'Submit', description: 'by-text' },
        { type: LocatorStrategyType.ROLE, value: 'button[Submit]', description: 'by-role-name' },
        { type: LocatorStrategyType.CSS, value: 'button[type="submit"]', description: 'by-submit-type' },
      ],
    },
    CANCEL_BUTTON: {
      name: 'Cancel Button',
      primary: { type: LocatorStrategyType.XPATH, value: '//button[@id="cancelSTP"]' },
      fallbacks: [
        { type: LocatorStrategyType.TEXT, value: 'Cancel', description: 'by-text' },
      ],
    },
    SUCCESS_TOAST: {
      name: 'Success Toast Notification',
      primary: { type: LocatorStrategyType.XPATH, value: '//div[contains(@class,"toast-success")]' },
      fallbacks: [
        { type: LocatorStrategyType.XPATH, value: '//*[@role="alert"][contains(@class,"success")]', description: 'by-role-success' },
        { type: LocatorStrategyType.CSS, value: '.toast-success, .alert-success', description: 'by-css-success' },
      ],
    },
    GENERATED_STP_NUMBER: {
      name: 'Generated STP Number',
      primary: { type: LocatorStrategyType.XPATH, value: '//span[@id="newSTPNumber"]' },
      fallbacks: [
        { type: LocatorStrategyType.XPATH, value: '//*[contains(@class,"stp-id")]', description: 'by-class' },
        { type: LocatorStrategyType.XPATH, value: '//div[contains(text(),"STP-")]', description: 'by-stp-prefix' },
      ],
    },
    VALIDATION_ERROR: {
      name: 'Validation Error',
      primary: { type: LocatorStrategyType.XPATH, value: '//span[contains(@class,"field-error")]' },
      fallbacks: [
        { type: LocatorStrategyType.CSS, value: '.field-error, .validation-error', description: 'by-css' },
      ],
    },
  };

  constructor(page: Page) {
    super(page, Lifecycle.STP);
  }

  // ─── Form fill actions ────────────────────────────────────────────────────

  async fillTitle(title: string): Promise<void> {
    await this.fill(this.LOCATORS.TITLE_INPUT, title);
  }

  async fillDescription(description: string): Promise<void> {
    await this.fill(this.LOCATORS.DESCRIPTION_TEXTAREA, description);
  }

  async selectPriority(priority: string): Promise<void> {
    await this.selectOption(this.LOCATORS.PRIORITY_DROPDOWN, priority);
  }

  async fillAssignee(assignee: string): Promise<void> {
    await this.fill(this.LOCATORS.ASSIGNEE_INPUT, assignee);
  }

  async fillStartDate(date: string): Promise<void> {
    await this.fill(this.LOCATORS.START_DATE_INPUT, date);
  }

  async fillEndDate(date: string): Promise<void> {
    await this.fill(this.LOCATORS.END_DATE_INPUT, date);
  }

  async selectCategory(category: string): Promise<void> {
    await this.selectOption(this.LOCATORS.CATEGORY_DROPDOWN, category);
  }

  async attachFile(filePath: string): Promise<void> {
    await this.uploadFile(this.LOCATORS.ATTACHMENT_INPUT, filePath);
  }

  // ─── Complete form submission flow ────────────────────────────────────────

  /**
   * Fills and submits the entire STP creation form.
   * After submission, reads the generated STP number and writes it back to
   * the test data JSON via TestDataUpdater.
   *
   * @param formData  - Field values for the form
   * @param tcid      - TCID used to write the generated number back to JSON
   * @returns The generated STP number
   */
  async fillAndSubmit(formData: STPFormData, tcid: string): Promise<string> {
    return this.step('Fill and submit STP creation form', async () => {
      this.logger.info('Filling STP creation form', { tcid, title: formData.title });

      await this.step('Fill basic details', async () => {
        await this.fillTitle(formData.title);
        await this.fillDescription(formData.description);
        await this.selectPriority(formData.priority);
        await this.fillAssignee(formData.assignee);
      });

      await this.step('Fill dates', async () => {
        await this.fillStartDate(formData.startDate);
        await this.fillEndDate(formData.endDate);
      });

      if (formData.category) {
        await this.selectCategory(formData.category);
      }
      if (formData.attachmentPath) {
        await this.attachFile(formData.attachmentPath);
      }

      await this.screenshot('STP form filled');

      await this.step('Submit form', async () => {
        await this.click(this.LOCATORS.SUBMIT_BUTTON);
        await this.waitForVisible(this.LOCATORS.SUCCESS_TOAST, 15_000);
      });

      // ── Read the generated STP number ────────────────────────────────────
      const stpNumber = await this.getText(this.LOCATORS.GENERATED_STP_NUMBER);
      this.logger.info(`STP created successfully`, { tcid, stpNumber });

      // ── Write back to test data JSON via TestDataUpdater ─────────────────
      this.dataUpdater.updateRuntimeField(tcid, 'generatedSTPNumber', stpNumber);
      this.dataUpdater.updateRuntimeField(tcid, 'submittedAt', new Date().toISOString());
      AllureReportHelper.addParameter('Generated STP Number', stpNumber);

      await this.screenshot('STP created');
      return stpNumber;
    });
  }

  /**
   * Fills the form using test data from the JSON file.
   */
  async fillAndSubmitWithTestData(tcid: string, iteration = 1): Promise<string> {
    const data = this.getTestData(tcid, iteration);
    AllureReportHelper.addTestDataContext(tcid, iteration, this.lifecycle);

    const formData: STPFormData = {
      title: data.stpTitle as string,
      description: data.stpDescription as string,
      priority: data.priority as string,
      assignee: data.assignee as string,
      startDate: data.startDate as string,
      endDate: data.endDate as string,
      category: data.category as string | undefined,
    };

    return this.fillAndSubmit(formData, tcid);
  }

  async cancel(): Promise<void> {
    await this.click(this.LOCATORS.CANCEL_BUTTON);
  }

  // ─── Assertions ───────────────────────────────────────────────────────────

  async assertFormLoaded(): Promise<void> {
    await this.step('Assert STP form is loaded', async () => {
      await this.assertVisible(this.LOCATORS.TITLE_INPUT);
      await this.assertVisible(this.LOCATORS.SUBMIT_BUTTON);
    });
  }

  async assertSuccessToast(): Promise<void> {
    await this.assertVisible(this.LOCATORS.SUCCESS_TOAST);
  }

  async assertValidationError(expectedText?: string): Promise<void> {
    await this.assertVisible(this.LOCATORS.VALIDATION_ERROR);
    if (expectedText) {
      await this.assertContainsText(this.LOCATORS.VALIDATION_ERROR, expectedText);
    }
  }

  // ─── Getters ──────────────────────────────────────────────────────────────

  async getGeneratedSTPNumber(): Promise<string> {
    return this.getText(this.LOCATORS.GENERATED_STP_NUMBER);
  }
}

export default CreateSTPPage;
