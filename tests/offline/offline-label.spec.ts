import { test, expect } from '../../playwright';
import { buildCommonLocators } from '../utils/page/locators';

// Chromium reports the network from the interface list, which is not what a test can unplug, so the
// spec drives the same browser events the app listens to.
const setBrowserOnline = (page, online: boolean) => page.evaluate((value) => {
  Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });
  window.dispatchEvent(new Event(value ? 'online' : 'offline'));
}, online);

test.describe('Offline mode label', () => {
  test.afterEach(async ({ page }) => {
    // The renderer outlives the test, so put the connection back for the next spec.
    await setBrowserOnline(page, true);
  });

  test('tells the user when the machine is offline, confirms when it is back, then goes away', async ({ page }, testInfo) => {
    const { titleBar } = buildCommonLocators(page);
    await page.locator('[data-app-state="loaded"]').waitFor();

    await test.step('Nothing is shown while online', async () => {
      await expect(titleBar.offlineBadge()).toHaveCount(0);
    });

    await test.step('Going offline shows a plain-text label in the title bar', async () => {
      await setBrowserOnline(page, false);
      await expect(titleBar.offlineBadge()).toBeVisible();
      await expect(titleBar.offlineBadge()).toHaveAttribute('data-state', 'offline');
      await expect(titleBar.offlineBadge()).toContainText('Offline');
      await expect(titleBar.offlineBadge()).toContainText('Working locally');
      await expect(titleBar.offlineBadge().locator('svg, img')).toHaveCount(0);
      await page.getByTestId('app-titlebar').screenshot({ path: testInfo.outputPath('titlebar-offline.png') });
    });

    await test.step('Coming back says so, and then fades out and leaves', async () => {
      await setBrowserOnline(page, true);
      await expect(titleBar.offlineBadge()).toHaveAttribute('data-state', 'restored');
      await expect(titleBar.offlineBadge()).toContainText('Back online');
      await page.getByTestId('app-titlebar').screenshot({ path: testInfo.outputPath('titlebar-restored.png') });
      await expect(titleBar.offlineBadge()).toHaveCount(0, { timeout: 8000 });
    });
  });

  test('the main process answers whether the system has a default route', async ({ page }) => {
    await page.locator('[data-app-state="loaded"]').waitFor();

    const answer = await page.evaluate(() => (window as any).ipcRenderer.invoke('renderer:get-has-default-route'));

    // true or false on Linux, null where the route tables cannot be read
    expect([true, false, null]).toContain(answer);
  });
});
