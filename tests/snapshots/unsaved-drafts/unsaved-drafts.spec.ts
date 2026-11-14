import fs from 'fs';
import path from 'path';
import { test, expect, closeElectronApp } from '../../../playwright';
import { createCollection, createRequest, openRequest, waitForReadyPage } from '../../utils/page';

const COLLECTION_NAME = 'DraftsCol';
const SAVED_URL = 'https://example.test/users';

const keptDrafts = (userDataPath: string) => {
  const file = path.join(userDataPath, 'unsaved-drafts.json');
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
};

const readRequestFile = (collectionPath: string) => {
  const entries = fs.readdirSync(collectionPath, { recursive: true }) as string[];
  const requestFile = entries.find((entry) => path.basename(entry).startsWith('users.'));
  return fs.readFileSync(path.join(collectionPath, requestFile!), 'utf8');
};

test.describe('Unsaved changes survive the app closing unexpectedly', () => {
  test('an edit that was never saved is back after the app is killed and reopened', async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(3 * 60 * 1000);
    const userDataPath = await createTmpDir('unsaved-drafts-data');
    const collectionPath = await createTmpDir('unsaved-drafts-col');

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);

    await test.step('Edit a saved request without saving it', async () => {
      await createCollection(page, COLLECTION_NAME, collectionPath);
      await createRequest(page, 'users', COLLECTION_NAME, { url: SAVED_URL, method: 'GET' });
      await openRequest(page, COLLECTION_NAME, 'users', { persist: true });

      await page.getByTestId('request-url').locator('.CodeMirror').click();
      await page.keyboard.press('End');
      await page.keyboard.type('/42/unsaved-edit');
      await expect.poll(() => keptDrafts(userDataPath)).toContain('/42/unsaved-edit');
    });

    await test.step('Kill the app without letting it close', async () => {
      app.process().kill('SIGKILL');
      await new Promise((resolve) => setTimeout(resolve, 1500));
    });

    const app2 = await launchElectronApp({ userDataPath });
    const page2 = await waitForReadyPage(app2);

    try {
      await test.step('The request reopens with the edit, still unsaved', async () => {
        const url = page2.getByTestId('request-url').locator('.CodeMirror');
        await expect(url).toContainText(`${SAVED_URL}/42/unsaved-edit`, { timeout: 30000 });
        await expect(page2.getByText('Recovered the unsaved changes of 1 request')).toBeVisible();

        expect(readRequestFile(collectionPath)).not.toContain('unsaved-edit');
      });

      await test.step('Saving it leaves nothing to recover', async () => {
        await page2.getByTestId('save-request-button').click();
        await expect.poll(() => keptDrafts(userDataPath)).toBe('');

        await expect.poll(() => readRequestFile(collectionPath)).toContain('unsaved-edit');
      });
    } finally {
      await closeElectronApp(app2);
    }
  });
});
