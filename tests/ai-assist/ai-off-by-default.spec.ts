import { test, expect } from '../../playwright';
import { closeAllCollections, createCollection, createRequest, selectRequestPaneTab } from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

test.describe('AI is off by default', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('shows no AI button or panel anywhere while AI is turned off', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const collectionName = 'ai-off';

    await test.step('Arrange: a request with the Tests tab open', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, 'items', collectionName, { url: 'https://api.example.com/items' });
      await locators.sidebar.request('items').click();
      await selectRequestPaneTab(page, 'Tests');
    });

    await test.step('Nothing from the AI is visible', async () => {
      await expect(locators.aiAssist.trigger('tests')).toHaveCount(0);
      await expect(locators.aiPreview.chat.sidebarToggle()).toHaveCount(0);
      await expect(locators.aiPreview.chat.composer()).toHaveCount(0);
      await expect(locators.aiPreview.panel()).toHaveCount(0);
    });
  });
});
