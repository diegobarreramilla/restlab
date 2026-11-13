import fs from 'fs';
import path from 'path';
import { test, expect } from '../../../playwright';
import {
  addEnvironmentVariable,
  closeAllCollections,
  createCollection,
  createEnvironment,
  openEnvironmentInSettings,
  saveEnvironment
} from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

const BASE = { name: 'copy-base', variable: { name: 'host', value: 'https://base.example.com' } };
const DERIVED = 'copy-derived';
const PLAIN_COPY = 'copy-plain';

test.describe('Copying an environment so the copy inherits from it', () => {
  test.afterEach(async ({ page }) => {
    if (!page.isClosed()) {
      await closeAllCollections(page);
    }
  });

  test('the copy dialog offers inheriting, and the list marks the inheriting environment', async ({
    page,
    createTmpDir
  }) => {
    const { environment } = buildCommonLocators(page);
    const collectionsDir = await createTmpDir('inherit-on-copy');
    const collectionName = 'inherit-on-copy';
    const environmentFile = (name: string) =>
      path.join(collectionsDir, collectionName, 'environments', `${name}.yml`);

    await test.step('Create a collection with one populated environment', async () => {
      await createCollection(page, collectionName, collectionsDir, 'yml');
      await createEnvironment(page, BASE.name);
      await addEnvironmentVariable(page, BASE.variable);
      await saveEnvironment(page);
    });

    const copyWith = async (newName: string, inherit: boolean) => {
      await openEnvironmentInSettings(page, BASE.name);
      await environment.copyAction().click();
      const modal = page.locator('.bruno-modal').filter({ hasText: 'Copy Environment' });
      await expect(page.getByTestId('copy-environment-inherit-checkbox')).not.toBeChecked();
      if (inherit) {
        await page.getByTestId('copy-environment-inherit-checkbox').check();
      }
      await modal.locator('#environment-name').fill(newName);
      await modal.getByRole('button', { name: 'Copy', exact: true }).click();
      await modal.waitFor({ state: 'hidden' });
      // The app opens the environment it just created; wait for that before doing anything else.
      await expect(environment.detailsTitle()).toHaveText(newName);
      await expect.poll(() => fs.existsSync(environmentFile(newName))).toBe(true);
    };

    await test.step('Leaving the option off keeps the plain copy', async () => {
      await copyWith(PLAIN_COPY, false);

      await expect.poll(() => fs.readFileSync(environmentFile(PLAIN_COPY), 'utf8')).toContain(BASE.variable.name);
      expect(fs.readFileSync(environmentFile(PLAIN_COPY), 'utf8')).not.toContain('extends');
    });

    await test.step('Ticking it creates an empty environment that extends the source', async () => {
      await copyWith(DERIVED, true);

      await expect.poll(() => fs.readFileSync(environmentFile(DERIVED), 'utf8')).toContain(`extends: ${BASE.name}`);
      expect(fs.readFileSync(environmentFile(DERIVED), 'utf8')).not.toContain(BASE.variable.name);

      await expect(environment.inheritedVarValue(BASE.variable.name)).toHaveText(BASE.variable.value);
    });

    await test.step('Only the inheriting environment carries the marker in the list', async () => {
      await expect(environment.sidebarListItemExact('collection', DERIVED).getByTestId('env-inheritance-hint')).toBeVisible();
      await expect(environment.sidebarListItemExact('collection', BASE.name).getByTestId('env-inheritance-hint')).toHaveCount(0);
      await expect(environment.sidebarListItemExact('collection', PLAIN_COPY).getByTestId('env-inheritance-hint')).toHaveCount(0);
    });
  });
});
