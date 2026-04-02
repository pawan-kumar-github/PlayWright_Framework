import { Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { LocatorStrategyType } from '../../utils/SelfHealingLocator';
import { Lifecycle } from '../../config/constants';

/**
 * DashboardPage — STP lifecycle post-login dashboard.
 */
export class DashboardPage extends BasePage {
  private readonly LOCATORS = {
    WELCOME_MESSAGE: {
      name: 'Welcome Message',
      primary: { type: LocatorStrategyType.XPATH, value: '//h1[@id="welcomeMessage"]' },
      fallbacks: [
        { type: LocatorStrategyType.XPATH, value: '//h1[contains(@class,"welcome")]', description: 'by-class' },
        { type: LocatorStrategyType.XPATH, value: '//h1', description: 'first-h1' },
      ],
    },
    CREATE_STP_BUTTON: {
      name: 'Create STP Button',
      primary: { type: LocatorStrategyType.XPATH, value: '//button[@id="createSTP"]' },
      fallbacks: [
        { type: LocatorStrategyType.TEXT, value: 'Create STP', description: 'by-text' },
        { type: LocatorStrategyType.ROLE, value: 'button[Create STP]', description: 'by-role-name' },
      ],
    },
    STP_LIST_MENU: {
      name: 'STP List Menu Item',
      primary: { type: LocatorStrategyType.XPATH, value: '//nav//a[@href="/stp/list"]' },
      fallbacks: [
        { type: LocatorStrategyType.TEXT, value: 'STP List', description: 'by-text' },
        { type: LocatorStrategyType.XPATH, value: '//nav//a[contains(text(),"STP")]', description: 'by-partial-nav-text' },
      ],
    },
    USER_PROFILE_ICON: {
      name: 'User Profile Icon',
      primary: { type: LocatorStrategyType.XPATH, value: '//div[@id="userProfile"]' },
      fallbacks: [
        { type: LocatorStrategyType.XPATH, value: '//button[@aria-label="User profile"]', description: 'by-aria-label' },
        { type: LocatorStrategyType.CSS, value: '.user-avatar, .profile-icon', description: 'by-css' },
      ],
    },
    LOGOUT_OPTION: {
      name: 'Logout Option',
      primary: { type: LocatorStrategyType.XPATH, value: '//a[@id="logoutLink"]' },
      fallbacks: [
        { type: LocatorStrategyType.TEXT, value: 'Logout', description: 'by-text' },
        { type: LocatorStrategyType.TEXT, value: 'Sign out', description: 'by-alt-text' },
      ],
    },
    NOTIFICATION_BELL: {
      name: 'Notification Bell',
      primary: { type: LocatorStrategyType.XPATH, value: '//button[@id="notifications"]' },
      fallbacks: [
        { type: LocatorStrategyType.XPATH, value: '//button[@aria-label="Notifications"]', description: 'by-aria' },
        { type: LocatorStrategyType.CSS, value: '.notification-icon', description: 'by-css' },
      ],
    },
    PENDING_APPROVALS_COUNT: {
      name: 'Pending Approvals Count',
      primary: { type: LocatorStrategyType.XPATH, value: '//span[@id="pendingCount"]' },
      fallbacks: [
        { type: LocatorStrategyType.XPATH, value: '//*[contains(@class,"pending-badge")]', description: 'by-class' },
      ],
    },
  };

  constructor(page: Page) {
    super(page, Lifecycle.STP);
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  async clickCreateSTP(): Promise<void> {
    await this.step('Click Create STP button', async () => {
      await this.click(this.LOCATORS.CREATE_STP_BUTTON);
    });
  }

  async navigateToSTPList(): Promise<void> {
    await this.step('Navigate to STP List', async () => {
      await this.click(this.LOCATORS.STP_LIST_MENU);
      await this.waitForPageLoad();
    });
  }

  async logout(): Promise<void> {
    await this.step('Logout from application', async () => {
      await this.click(this.LOCATORS.USER_PROFILE_ICON);
      await this.click(this.LOCATORS.LOGOUT_OPTION);
      await this.waitForPageLoad();
      this.logger.info('Logged out successfully');
    });
  }

  async clickNotifications(): Promise<void> {
    await this.click(this.LOCATORS.NOTIFICATION_BELL);
  }

  // ─── Assertions ───────────────────────────────────────────────────────────

  async assertDashboardLoaded(): Promise<void> {
    await this.step('Assert dashboard loaded', async () => {
      await this.assertVisible(this.LOCATORS.WELCOME_MESSAGE);
      await this.assertVisible(this.LOCATORS.CREATE_STP_BUTTON);
      this.logger.info('Dashboard loaded successfully');
    });
  }

  async assertWelcomeMessage(expectedText: string): Promise<void> {
    await this.assertContainsText(this.LOCATORS.WELCOME_MESSAGE, expectedText);
  }

  // ─── Getters ──────────────────────────────────────────────────────────────

  async getWelcomeMessage(): Promise<string> {
    return this.getText(this.LOCATORS.WELCOME_MESSAGE);
  }

  async getPendingApprovalsCount(): Promise<number> {
    const text = await this.getText(this.LOCATORS.PENDING_APPROVALS_COUNT);
    return parseInt(text, 10) || 0;
  }
}

export default DashboardPage;
