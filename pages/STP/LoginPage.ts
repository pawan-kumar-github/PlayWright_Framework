import { Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { LocatorStrategyType } from '../../utils/SelfHealingLocator';
import { Lifecycle } from '../../config/constants';
import { AllureReportHelper } from '../../utils/AllureReportHelper';
import { StringHelper } from '../../utils/StringHelper';
import IterationRunner from '@utils/IterationRunner';

/**
 * LoginPage — STP lifecycle login page.
 *
 * Demonstrates:
 *   - Self-healing locator definitions (primary XPath + ordered fallbacks)
 *   - Test data consumption via inherited getTestData()
 *   - Allure step wrapping via inherited step()
 */
export class LoginPage extends BasePage {
  // ─── URL ──────────────────────────────────────────────────────────────────
  private static readonly PATH = 'login/selenium-training?q=headers';

  // ─── Locator definitions ─────────────────────────────────────────────────
  // Each definition carries a primary (usually XPath) and ordered fallbacks.
  // If the primary XPath breaks after a UI change, the self-healing engine
  // walks the fallbacks and logs a healing event for the team to fix.

  private readonly LOCATORS = {
    USERNAME_INPUT: {
      name: 'Username Input',
      primary: { type: LocatorStrategyType.XPATH, value: '//input[@id="username"]' },
      fallbacks: [
        { type: LocatorStrategyType.PLACEHOLDER, value: 'Enter username', description: 'by-placeholder' },
        { type: LocatorStrategyType.LABEL, value: 'Username', description: 'by-label' },
        { type: LocatorStrategyType.CSS, value: 'input[name="username"]', description: 'by-name-attr' },
        { type: LocatorStrategyType.XPATH, value: '//input[@type="text"][1]', description: 'by-type-ordinal' },
      ],
    },
    PASSWORD_INPUT: {
      name: 'Password Input',
      primary: { type: LocatorStrategyType.XPATH, value: '//input[@id="password"]' },
      fallbacks: [
        { type: LocatorStrategyType.PLACEHOLDER, value: 'Enter password', description: 'by-placeholder' },
        { type: LocatorStrategyType.LABEL, value: 'Password', description: 'by-label' },
        { type: LocatorStrategyType.CSS, value: 'input[type="password"]', description: 'by-type' },
      ],
    },
    LOGIN_BUTTON: {
      name: 'Login Button',
      primary: { type: LocatorStrategyType.XPATH, value: '//button[@id="loginBtn"]' },
      fallbacks: [
        { type: LocatorStrategyType.ROLE, value: 'button[Sign In]', description: 'by-role-name' },
        { type: LocatorStrategyType.TEXT, value: 'Sign In', description: 'by-text' },
        { type: LocatorStrategyType.CSS, value: 'button[type="submit"]', description: 'by-submit-type' },
        { type: LocatorStrategyType.XPATH, value: '//button[contains(@class,"login")]', description: 'by-class' },
      ],
    },
    ERROR_MESSAGE: {
      name: 'Login Error Message',
      primary: { type: LocatorStrategyType.XPATH, value: '//div[@class="error-message"]' },
      fallbacks: [
        { type: LocatorStrategyType.XPATH, value: '//*[contains(@class,"alert-error")]', description: 'by-alert-class' },
        { type: LocatorStrategyType.XPATH, value: '//*[@role="alert"]', description: 'by-role-alert' },
        { type: LocatorStrategyType.CSS, value: '.error, .alert-danger', description: 'by-css-error' },
      ],
    },
    FORGOT_PASSWORD_LINK: {
      name: 'Forgot Password Link',
      primary: { type: LocatorStrategyType.XPATH, value: '//a[@id="forgotPassword"]' },
      fallbacks: [
        { type: LocatorStrategyType.TEXT, value: 'Forgot Password', description: 'by-text' },
        { type: LocatorStrategyType.XPATH, value: '//a[contains(text(),"forgot")]', description: 'by-partial-text' },
      ],
    },
    CLICKREGISTRATION: {
      name: 'click registration',
      primary: { type: LocatorStrategyType.XPATH, value: '(//*[text()="Tutorials"])[1]' },
      fallbacks: [
        { type: LocatorStrategyType.TEXT, value: 'Forgot Password', description: 'by-text' },
        { type: LocatorStrategyType.XPATH, value: '//a[contains(text(),"forgot")]', description: 'by-partial-text' },
      ],
    },
    SEARCHBOX: {
      name: 'search',
      primary: { type: LocatorStrategyType.XPATH, value: '(//*[@placeholder="Search"])[2]' },
      fallbacks: [
        { type: LocatorStrategyType.TEXT, value: 'Forgot Password', description: 'by-text' },
        { type: LocatorStrategyType.XPATH, value: '//a[contains(text(),"forgot")]', description: 'by-partial-text' },
      ],
    },
    LOADING_SPINNER: {
      name: 'Loading Spinner',
      primary: { type: LocatorStrategyType.XPATH, value: '//div[@class="spinner"]' },
      fallbacks: [
        { type: LocatorStrategyType.CSS, value: '.loading, .spinner', description: 'by-css' },
      ],
    },
    REMEMBER_ME_CHECKBOX: {
      name: 'Remember Me Checkbox',
      primary: { type: LocatorStrategyType.XPATH, value: '//input[@id="rememberMe"]' },
      fallbacks: [
        { type: LocatorStrategyType.LABEL, value: 'Remember me', description: 'by-label' },
        { type: LocatorStrategyType.CSS, value: 'input[type="checkbox"]', description: 'by-type' },
      ],
    },
  };

  constructor(page: Page) {
    super(page, Lifecycle.STP);
  }

  // ─── Navigation ───────────────────────────────────────────────────────────

  async open(): Promise<void> {
    await this.step('Open Login Page', async () => {
      await this.logger.step('Navigate to login page URL');
       console.log(this.getValueFromJSON<string>('username')); // Example of reading test data in a page method outside of login() --- IGNORE ---
       if(this.getTCID() === 'TC_LOGIN_001' && this.getIterationNumber() === 2) {
          await this.updateValueInJSON('username', 'user2_updatedInOpen'); 
       }
      this.logger.info('Opening login page');
      await this.navigate(LoginPage.PATH);
      await this.waitForPageLoad();
    });
  }

  // ─── Page actions ─────────────────────────────────────────────────────────

  /**
   * Performs a full login flow.
   * Logs masked credentials for security.
   */
  async login(): Promise<void> {
    await this.step(`Login as ${this.getValueFromJSON<string>('username')}`, async () => {
      const username = this.getValueFromJSON<string>('username');
      const password = this.getValueFromJSON<string>('password');
      this.logger.info(`Logging in as: ${username} / ${StringHelper.mask(password)}`);

      await this.fill(this.LOCATORS.USERNAME_INPUT, username);
      await this.fill(this.LOCATORS.PASSWORD_INPUT, password);
      await this.click(this.LOCATORS.LOGIN_BUTTON);

      // Wait for either navigation or an error message
      await this.page.waitForLoadState('networkidle')
      ;
      this.logger.info('Login form submitted');
    });
  }

  /**
   * Login using the injected ScopedDataManager — call withScope() first.
   * Reads username and password from the scoped iteration data automatically.
   *
   * Usage:
   *   loginPage.withScope(scopedData);
   *   await loginPage.loginFromScope();
   */
  async loginFromScope(): Promise<void> {
    await this.login(
      this.getValueFromJSON<string>('username'),
      this.getValueFromJSON<string>('password'),
    );
  }

  /**
   * Login using test data — preferred in spec files.
   */
  async loginWithTestData(tcid: string, iteration = 1): Promise<void> {
    const data = this.getTestData(tcid, iteration);
    AllureReportHelper.addTestDataContext(tcid, iteration, this.lifecycle);

    await this.login(data.username as string, data.password as string);
  }

  async fillUsername(username: string): Promise<void> {
    await this.fill(this.LOCATORS.USERNAME_INPUT, username);
  }

  async fillPassword(password: string): Promise<void> {
    await this.fill(this.LOCATORS.PASSWORD_INPUT, password);
  }

  async clickLoginButton(): Promise<void> {
    await this.click(this.LOCATORS.LOGIN_BUTTON);
  }

  async clickForgotPassword(): Promise<void> {
    await this.click(this.LOCATORS.FORGOT_PASSWORD_LINK);
  }

  async checkRememberMe(): Promise<void> {
    await this.check(this.LOCATORS.REMEMBER_ME_CHECKBOX);
  }

  // ─── Assertions ───────────────────────────────────────────────────────────

  async assertErrorMessage(expectedText: string): Promise<void> {
    await this.assertContainsText(this.LOCATORS.ERROR_MESSAGE, expectedText);
  }

  async assertErrorVisible(): Promise<void> {
    await this.assertVisible(this.LOCATORS.ERROR_MESSAGE);
  }

  async assertLoginPageLoaded(): Promise<void> {
    await this.step('Assert login page is loaded', async () => {
      await this.assertVisible(this.LOCATORS.USERNAME_INPUT);
      await this.assertVisible(this.LOCATORS.PASSWORD_INPUT);
      await this.assertVisible(this.LOCATORS.LOGIN_BUTTON);
      this.logger.info('Login page loaded successfully');
    });
  }

  async clickRegistration(): Promise<void> {
    await this.click(this.LOCATORS.CLICKREGISTRATION);
  }

  async testGetandUpdateTestData(): Promise<void> {
    // Step 1: Read username from iteration 1 and use it
    // const username = this.getTestData('TC_LOGIN_001', 1).username as string;
    // await this.fill(this.LOCATORS.SEARCHBOX, username);
    // console.log('Username before update:', username);

    // Step 2: Update the same iteration field in the JSON before the test finishes.
    // updateTestDataField writes into the iterations block so the next
    // getTestData('TC_LOGIN_001', 1) call returns the new value.
    this.dataUpdater.updateTestDataField('TC_LOGIN_001', 1, 'username', 'updatedUsername2');
    console.log('Username after update:', this.getTestData('TC_LOGIN_001', 1).username as string);
  }



  // ─── Getters ──────────────────────────────────────────────────────────────

  async getErrorMessage(): Promise<string> {
    return this.getText(this.LOCATORS.ERROR_MESSAGE);
  }

  async isLoginButtonEnabled(): Promise<boolean> {
    return this.isEnabled(this.LOCATORS.LOGIN_BUTTON);
  }
}

export default LoginPage;
