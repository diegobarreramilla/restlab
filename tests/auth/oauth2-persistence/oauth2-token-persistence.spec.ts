import fs from 'fs';
import path from 'path';
import { test, expect } from '../../../playwright';
import { openCollection, openCollectionSettings, selectCollectionPaneTab, sendRequest } from '../../utils/page';

const COLLECTION_NAME = 'oauth2-persistence';

// What the app keeps on disk for the collection's OAuth2 credentials. The token is encrypted, so the test
// compares the stored text instead of reading it: a token fetched again is a new random string.
const readStoredCredentials = (userDataPath: string) => {
  const file = path.join(userDataPath, 'oauth2.json');
  if (!fs.existsSync(file)) return [];
  const { collections = [] } = JSON.parse(fs.readFileSync(file, 'utf8'));
  return collections.flatMap((collection: { credentials?: { data: string }[] }) =>
    (collection.credentials ?? []).map((credential) => credential.data)
  );
};

test.describe('OAuth2 token across an app restart', () => {
  test('a token fetched before closing the app is reused after reopening it', async ({
    launchElectronApp,
    createTmpDir,
    collectionFixturePath
  }) => {
    const userDataPath = await createTmpDir('oauth2-userdata');
    const initUserDataPath = path.join(__dirname, 'init-user-data');
    let storedBeforeRestart: string[] = [];

    await test.step('Fetch a token by sending a request', async () => {
      const app = await launchElectronApp({
        initUserDataPath,
        userDataPath,
        templateVars: { collectionPath: collectionFixturePath! }
      });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor();

      await openCollection(page, COLLECTION_NAME);
      await page.getByTitle('ping').click();
      await sendRequest(page, 200);

      await expect.poll(() => readStoredCredentials(userDataPath).length).toBe(1);
      storedBeforeRestart = readStoredCredentials(userDataPath);
      await app.close();
    });

    await test.step('Reopen the app and send the same request', async () => {
      const app = await launchElectronApp({ userDataPath });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor();

      await test.step('The collection Auth tab still shows the stored token before anything is sent', async () => {
        await openCollectionSettings(page, COLLECTION_NAME);
        await selectCollectionPaneTab(page, 'auth');
        await expect(page.getByTestId('oauth2-token-section-title').filter({ hasText: 'Access Token' })).toBeVisible();
        await expect(page.getByTestId('oauth2-no-token')).toHaveCount(0);
      });

      await openCollection(page, COLLECTION_NAME);
      await page.getByTitle('ping').click();
      await sendRequest(page, 200);

      // No new token was requested: the stored credentials are the very same text.
      expect(readStoredCredentials(userDataPath)).toEqual(storedBeforeRestart);
    });
  });
});
