import { test, expect } from '../../playwright';
import { fillRequestUrl, sendRequest } from '../utils/page';

/**
 * The "quick request" entry point on the workspace home: a brand-new person with no
 * collections must be able to send a request without creating anything first.
 *
 * The request is created as a transient (scratch) request, so it lives in the workspace
 * scratch collection and can later be saved to a real collection from its tab.
 */
test.describe('Quick request from the workspace home', () => {
  test('sends a request without creating a collection', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => pageErrors.push(error));

    await test.step('Start from a workspace with no collections', async () => {
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 45000 });
      await expect(page.getByText('No collections found.')).toBeVisible();
    });

    await test.step('The home screen offers a quick request as the first section', async () => {
      const quickRequest = page.getByTestId('quick-request-section');
      await expect(quickRequest).toBeVisible();
      await expect(quickRequest).toContainText('Quick request');
      await expect(page.getByTestId('quick-request-button')).toBeVisible();
    });

    await test.step('Creating a quick request opens an Untitled request tab', async () => {
      await page.getByTestId('quick-request-button').click();
      const activeTab = page.locator('.request-tab.active');
      await expect(activeTab).toBeVisible({ timeout: 15000 });
      await expect(activeTab).toContainText('Untitled');
    });

    await test.step('Send it to the local test server and get a response', async () => {
      await fillRequestUrl(page, 'http://localhost:8081/ping');
      await sendRequest(page, 200);
    });

    await test.step('No uncaught errors while creating and sending the quick request', async () => {
      expect(pageErrors).toHaveLength(0);
    });
  });
});
