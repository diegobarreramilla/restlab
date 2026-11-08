import * as path from 'path';
import { test, expect, closeElectronApp, waitForReadyPage } from '../../playwright';
import { closeAllCollections, createCollection, createRequest, selectRequestPaneTab } from '../utils/page';
import { openAiPreferences } from '../utils/page/ai';
import { buildCommonLocators } from '../utils/page/locators';

test.describe('Review before sending', () => {
  test('holds a generation request for approval and lets the user back out', async ({ launchElectronApp, createTmpDir }, testInfo) => {
    const app = await launchElectronApp({ initUserDataPath: path.join(__dirname, 'init-user-data-review') });
    const page = await waitForReadyPage(app);
    const locators = buildCommonLocators(page);
    const collectionName = 'review-before-send';

    await test.step('Arrange: a request with the Tests tab open', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, 'items', collectionName, { url: 'https://api.example.com/items' });
      await locators.sidebar.request('items').click();
      await selectRequestPaneTab(page, 'Tests');
    });

    await test.step('Generate opens the review instead of sending', async () => {
      await locators.aiAssist.trigger('tests').click();
      await locators.aiPreview.generation.promptInput().fill('add a status test');
      await locators.aiPreview.generation.generateButton().click();

      await expect(locators.aiPreview.panel()).toBeVisible();
      await expect(locators.aiPreview.confirm()).toBeVisible();
      await expect(locators.aiPreview.confirm()).toHaveText('Generate');
      await expect(locators.aiPreview.cancel()).toBeVisible();
      await expect(locators.aiPreview.sectionText('user-request')).toContainText('add a status test');
      await page.screenshot({ path: testInfo.outputPath('review-step.png') });
    });

    await test.step('Cancel goes back to the prompt without sending, keeping what was typed', async () => {
      await locators.aiPreview.cancel().click();
      await expect(locators.aiPreview.panel()).toHaveCount(0);
      await expect(locators.aiPreview.generation.promptInput()).toHaveValue('add a status test');
    });

    await closeAllCollections(page);
    await closeElectronApp(app);
  });

  test('the Security settings show the switch, already on', async ({ launchElectronApp }) => {
    const app = await launchElectronApp({ initUserDataPath: path.join(__dirname, 'init-user-data-review') });
    const page = await waitForReadyPage(app);
    const locators = buildCommonLocators(page);

    await openAiPreferences(page, 'security');

    await expect(locators.ai.reviewBeforeSendToggle()).toBeVisible();

    await closeElectronApp(app);
  });
});
