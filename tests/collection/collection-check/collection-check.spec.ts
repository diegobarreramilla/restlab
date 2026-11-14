import { test, expect } from '../../../playwright';
import { openCollectionSettings } from '../../utils/page';

const COLLECTION_NAME = 'collection-check-collection';

test.describe('Reviewing a collection for things that will fail on send', () => {
  test('the overview lists them, says where, and opens the request', async ({ pageWithUserData: page }) => {
    await test.step('Open the collection overview', async () => {
      await page.locator('[data-app-state="loaded"]').waitFor();
      await openCollectionSettings(page, COLLECTION_NAME);
    });

    await test.step('A quiet line counts what was found', async () => {
      await expect(page.getByTestId('collection-check-toggle')).toContainText('2 things to review in this collection');
      await expect(page.getByTestId('collection-check-list')).toHaveCount(0);
    });

    await test.step('Opening it names the variable nothing defines and the one an environment lacks', async () => {
      await page.getByTestId('collection-check-toggle').click();
      const rows = page.getByTestId('collection-check-row');
      await expect(rows).toHaveCount(2);
      await expect(rows.filter({ hasText: '{{userId}}' })).toContainText('list users · uses {{userId}}, which nothing defines');
      await expect(rows.filter({ hasText: '{{token}}' })).toContainText('Environments · {{token}} is used by requests but missing in prod');
      await expect(page.getByTestId('collection-check')).not.toContainText('baseUrl');
    });

    await test.step('The location opens the request', async () => {
      await page.getByTestId('collection-check-row').filter({ hasText: '{{userId}}' }).getByTestId('collection-check-open').click();
      await expect(page.locator('.request-tab .tab-label').filter({ hasText: 'list users' })).toBeVisible();
    });
  });
});
