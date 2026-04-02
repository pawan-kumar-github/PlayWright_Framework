import { Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { LocatorStrategyType } from '../../utils/SelfHealingLocator';
import { Lifecycle } from '../../config/constants';
import { AllureReportHelper } from '../../utils/AllureReportHelper';

export type ReviewAction = 'approve' | 'reject' | 'return';

/**
 * ReviewSTPPage — STP review/approval workflow page.
 */
export class ReviewSTPPage extends BasePage {
  private readonly LOCATORS = {
    STP_NUMBER_LABEL: {
      name: 'STP Number Label',
      primary: { type: LocatorStrategyType.XPATH, value: '//span[@id="stpNumber"]' },
      fallbacks: [
        { type: LocatorStrategyType.XPATH, value: '//*[contains(@class,"stp-id")]', description: 'by-class' },
      ],
    },
    STP_TITLE: {
      name: 'STP Title',
      primary: { type: LocatorStrategyType.XPATH, value: '//h3[@id="stpTitle"]' },
      fallbacks: [
        { type: LocatorStrategyType.XPATH, value: '//h3[contains(@class,"title")]', description: 'by-class' },
      ],
    },
    APPROVE_BUTTON: {
      name: 'Approve Button',
      primary: { type: LocatorStrategyType.XPATH, value: '//button[@id="approveBtn"]' },
      fallbacks: [
        { type: LocatorStrategyType.TEXT, value: 'Approve', description: 'by-text' },
        { type: LocatorStrategyType.ROLE, value: 'button[Approve]', description: 'by-role-name' },
      ],
    },
    REJECT_BUTTON: {
      name: 'Reject Button',
      primary: { type: LocatorStrategyType.XPATH, value: '//button[@id="rejectBtn"]' },
      fallbacks: [
        { type: LocatorStrategyType.TEXT, value: 'Reject', description: 'by-text' },
        { type: LocatorStrategyType.ROLE, value: 'button[Reject]', description: 'by-role-name' },
      ],
    },
    RETURN_BUTTON: {
      name: 'Return for Rework Button',
      primary: { type: LocatorStrategyType.XPATH, value: '//button[@id="returnBtn"]' },
      fallbacks: [
        { type: LocatorStrategyType.TEXT, value: 'Return for Rework', description: 'by-text' },
        { type: LocatorStrategyType.XPATH, value: '//button[contains(text(),"Return")]', description: 'by-partial-text' },
      ],
    },
    COMMENT_TEXTAREA: {
      name: 'Review Comment',
      primary: { type: LocatorStrategyType.XPATH, value: '//textarea[@id="reviewComment"]' },
      fallbacks: [
        { type: LocatorStrategyType.LABEL, value: 'Comment', description: 'by-label' },
        { type: LocatorStrategyType.PLACEHOLDER, value: 'Enter your review comment', description: 'by-placeholder' },
      ],
    },
    CONFIRM_DIALOG_OK: {
      name: 'Confirm Dialog OK',
      primary: { type: LocatorStrategyType.XPATH, value: '//div[@role="dialog"]//button[text()="Confirm"]' },
      fallbacks: [
        { type: LocatorStrategyType.XPATH, value: '//div[@role="dialog"]//button[@id="confirmBtn"]', description: 'by-id-in-dialog' },
        { type: LocatorStrategyType.XPATH, value: '//button[text()="OK"]', description: 'by-ok-text' },
      ],
    },
    STATUS_BADGE: {
      name: 'STP Status Badge',
      primary: { type: LocatorStrategyType.XPATH, value: '//span[@id="statusBadge"]' },
      fallbacks: [
        { type: LocatorStrategyType.XPATH, value: '//*[contains(@class,"status-badge")]', description: 'by-class' },
        { type: LocatorStrategyType.XPATH, value: '//*[contains(@class,"badge")]', description: 'by-badge-class' },
      ],
    },
    SUCCESS_NOTIFICATION: {
      name: 'Review Success Notification',
      primary: { type: LocatorStrategyType.XPATH, value: '//div[contains(@class,"toast-success")]' },
      fallbacks: [
        { type: LocatorStrategyType.XPATH, value: '//*[@role="alert"][contains(@class,"success")]', description: 'by-role' },
      ],
    },
  };

  constructor(page: Page) {
    super(page, Lifecycle.STP);
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  /**
   * Approves the currently open STP with an optional comment.
   * Writes the review result back to test data.
   */
  async approve(comment = '', tcid?: string): Promise<void> {
    await this.step('Approve STP', async () => {
      if (comment) await this.addComment(comment);
      await this.click(this.LOCATORS.APPROVE_BUTTON);
      await this.handleConfirmDialog();
      await this.waitForVisible(this.LOCATORS.SUCCESS_NOTIFICATION);
      this.logger.info('STP approved successfully');

      if (tcid) {
        this.dataUpdater.updateRuntimeField(tcid, 'reviewAction', 'approved');
        this.dataUpdater.updateRuntimeField(tcid, 'reviewedAt', new Date().toISOString());
      }
      AllureReportHelper.logStep('STP approved');
    });
  }

  /**
   * Rejects the currently open STP.
   * Comment is required for rejection.
   */
  async reject(comment: string, tcid?: string): Promise<void> {
    await this.step('Reject STP', async () => {
      await this.addComment(comment);
      await this.click(this.LOCATORS.REJECT_BUTTON);
      await this.handleConfirmDialog();
      await this.waitForVisible(this.LOCATORS.SUCCESS_NOTIFICATION);
      this.logger.info('STP rejected');

      if (tcid) {
        this.dataUpdater.updateRuntimeField(tcid, 'reviewAction', 'rejected');
        this.dataUpdater.updateRuntimeField(tcid, 'rejectionReason', comment);
      }
    });
  }

  /**
   * Returns the STP for rework.
   */
  async returnForRework(comment: string, tcid?: string): Promise<void> {
    await this.step('Return STP for rework', async () => {
      await this.addComment(comment);
      await this.click(this.LOCATORS.RETURN_BUTTON);
      await this.handleConfirmDialog();
      await this.waitForVisible(this.LOCATORS.SUCCESS_NOTIFICATION);
      this.logger.info('STP returned for rework');

      if (tcid) {
        this.dataUpdater.updateRuntimeField(tcid, 'reviewAction', 'returned');
      }
    });
  }

  async addComment(comment: string): Promise<void> {
    await this.fill(this.LOCATORS.COMMENT_TEXTAREA, comment);
  }

  private async handleConfirmDialog(): Promise<void> {
    try {
      await this.click(this.LOCATORS.CONFIRM_DIALOG_OK);
    } catch {
      // Dialog may not appear for all actions — not a failure
      this.logger.debug('Confirm dialog not shown (may be expected)');
    }
  }

  // ─── Assertions ───────────────────────────────────────────────────────────

  async assertStatus(expectedStatus: string): Promise<void> {
    await this.assertContainsText(this.LOCATORS.STATUS_BADGE, expectedStatus);
  }

  async assertSuccessNotification(): Promise<void> {
    await this.assertVisible(this.LOCATORS.SUCCESS_NOTIFICATION);
  }

  // ─── Getters ──────────────────────────────────────────────────────────────

  async getSTPNumber(): Promise<string> {
    return this.getText(this.LOCATORS.STP_NUMBER_LABEL);
  }

  async getStatus(): Promise<string> {
    return this.getText(this.LOCATORS.STATUS_BADGE);
  }

  async getSTPTitle(): Promise<string> {
    return this.getText(this.LOCATORS.STP_TITLE);
  }
}

export default ReviewSTPPage;
