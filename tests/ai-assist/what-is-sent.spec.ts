import * as path from 'path';
import { test, expect, closeElectronApp, waitForReadyPage } from '../../playwright';
import { closeAllCollections, createCollection, createRequest, selectRequestPaneTab } from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

const SECRET = 'hunter2hunter2';

test.describe('What will be sent to the AI', () => {
  test('generation popup shows the request with its credentials hidden, without generating', async ({
    launchElectronApp,
    createTmpDir
  }, testInfo) => {
    const app = await launchElectronApp({ initUserDataPath: path.join(__dirname, 'init-user-data-local-model') });
    const page = await waitForReadyPage(app);
    const locators = buildCommonLocators(page);
    const collectionName = 'what-is-sent-generation';

    await test.step('Arrange: a request whose URL carries a credential', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, 'items', collectionName, { url: `https://api.example.com/items?api_key=${SECRET}&page=2` });
      await locators.sidebar.request('items').click();
      await selectRequestPaneTab(page, 'Tests');
    });

    await test.step('Open the preview from the generation popup', async () => {
      await locators.aiAssist.trigger('tests').click();
      await locators.aiPreview.generation.promptInput().fill('add a status test');
      await locators.aiPreview.generation.toggle().click();
      await expect(locators.aiPreview.panel()).toBeVisible();
      await expect(locators.aiPreview.summary()).toContainText(/hidden in [1-9]\d* places?/);
      await expect(locators.aiPreview.confirm()).toHaveCount(0);
      // The popup already has its own close button, so the look has a Back button and no second close
      await expect(locators.aiPreview.close()).toHaveCount(0);
      await expect(locators.aiPreview.generation.back()).toBeVisible();
      // The list of on-demand requests starts folded
      await expect(locators.aiPreview.onDemand()).not.toHaveAttribute('open', '');
    });

    await test.step('The request section hides the credential and keeps the rest', async () => {
      await locators.aiPreview.sectionHeader('request').click();
      const requestText = locators.aiPreview.sectionText('request');
      await expect(requestText).toContainText('api_key=<redacted>');
      await expect(requestText).toContainText('page=2');
      await expect(requestText).not.toContainText(SECRET);
      await expect(locators.aiPreview.hiddenMarks().first()).toBeVisible();
    });

    await test.step('The user message is open and the long instructions are folded', async () => {
      await expect(locators.aiPreview.section('user-request')).toHaveAttribute('open', '');
      await expect(locators.aiPreview.section('instructions')).not.toHaveAttribute('open', '');
      await expect(locators.aiPreview.sectionText('user-request')).toContainText('add a status test');
      await page.screenshot({ path: testInfo.outputPath('generation-preview.png') });
    });

    await test.step('Escape closes the preview first and keeps the popup', async () => {
      await page.keyboard.press('Escape');
      await expect(locators.aiPreview.panel()).toHaveCount(0);
      await expect(locators.aiPreview.generation.promptInput()).toBeVisible();
    });

    await closeAllCollections(page);
    await closeElectronApp(app);
  });

  test('chat sidebar shows what the next message would send', async ({ launchElectronApp, createTmpDir }, testInfo) => {
    const app = await launchElectronApp({ initUserDataPath: path.join(__dirname, 'init-user-data-local-model') });
    const page = await waitForReadyPage(app);
    const locators = buildCommonLocators(page);
    const collectionName = 'what-is-sent-chat';

    await test.step('Arrange: a request and the open chat sidebar', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, 'items', collectionName, { url: 'https://api.example.com/items' });
      await locators.sidebar.request('items').click();
      await locators.aiPreview.chat.sidebarToggle().click();
      await locators.aiPreview.chat.composer().fill('add a status test');
    });

    await test.step('Open the preview next to Send', async () => {
      await locators.aiPreview.chat.toggle().click();
      await expect(locators.aiPreview.panel()).toBeVisible();
      await expect(locators.aiPreview.confirm()).toHaveCount(0);
      await expect(locators.aiPreview.section('instructions')).toBeVisible();
      await expect(locators.aiPreview.sectionText('message-0')).toContainText('add a status test');
      await page.screenshot({ path: testInfo.outputPath('chat-preview.png') });
    });

    await test.step('Pressing the same button closes it', async () => {
      await locators.aiPreview.chat.toggle().click();
      await expect(locators.aiPreview.panel()).toHaveCount(0);
    });

    await closeAllCollections(page);
    await closeElectronApp(app);
  });
});
