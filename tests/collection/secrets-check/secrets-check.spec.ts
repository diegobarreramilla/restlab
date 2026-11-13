import fs from 'fs';
import path from 'path';
import { test, expect } from '../../../playwright';
import { openCollectionSettings, openShareCollectionModal } from '../../utils/page';

const COLLECTION_NAME = 'secrets-check-collection';
const PLANTED_TOKEN = 'ghp_a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8';

test.describe('Plain-text secrets in a collection', () => {
  test('the overview says where they are without showing them, fixes the variable, and the share dialog warns', async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    await test.step('Open the collection overview', async () => {
      await page.locator('[data-app-state="loaded"]').waitFor();
      await openCollectionSettings(page, COLLECTION_NAME);
    });

    await test.step('A quiet line counts what was found', async () => {
      const check = page.getByTestId('secrets-check');
      await expect(check).toBeVisible();
      await expect(page.getByTestId('secrets-check-toggle')).toContainText('2 values look like secrets stored in plain text');
      await expect(page.getByTestId('secrets-check-list')).toHaveCount(0);
    });

    await test.step('Opening it lists each place and never the value', async () => {
      await page.getByTestId('secrets-check-toggle').click();
      const rows = page.getByTestId('secrets-check-row');
      await expect(rows).toHaveCount(2);
      await expect(rows.filter({ hasText: 'X-Trace' })).toContainText('list users');
      await expect(rows.filter({ hasText: 'password' })).toContainText('Environment / dev');
      await expect(page.getByTestId('secrets-check')).not.toContainText(PLANTED_TOKEN);
      await expect(page.getByTestId('secrets-check')).not.toContainText('correct-horse-battery');
    });

    await test.step('Marking the environment variable as secret takes its value out of the file', async () => {
      const environmentFile = path.join(collectionFixturePath!, 'environments', 'dev.yml');
      expect(fs.readFileSync(environmentFile, 'utf8')).toContain('correct-horse-battery');

      await page.getByTestId('secrets-check-row').filter({ hasText: 'password' }).getByTestId('secrets-check-mark').click();

      await expect(page.getByTestId('secrets-check-row')).toHaveCount(1);
      await expect(page.getByTestId('secrets-check-row')).toContainText('X-Trace');
      await expect.poll(() => fs.readFileSync(environmentFile, 'utf8')).not.toContain('correct-horse-battery');
      expect(fs.readFileSync(environmentFile, 'utf8')).toContain('secret: true');
    });

    await test.step('Sharing the collection mentions what is left', async () => {
      await openShareCollectionModal(page, COLLECTION_NAME);
      await expect(page.getByTestId('export-secrets-notice')).toContainText('1 value looks like a secret');
    });
  });
});
