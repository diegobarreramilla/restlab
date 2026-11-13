import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { test, expect } from '../../../playwright';
import { createCollection, createRequest, openCollectionSettings } from '../../utils/page';

const COLLECTION_NAME = 'git-mix';
const REQUEST_NAME = 'ping';

const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, stdio: 'pipe' }).toString();

test.describe('Git panel: mixing both sides of a conflict', () => {
  test('keeps my URL and their method in the same request', async ({ page, createTmpDir }) => {
    const dir = await createTmpDir('git-mix');
    const collectionPath = path.join(dir, COLLECTION_NAME);
    const requestFile = path.join(collectionPath, `${REQUEST_NAME}.yml`);
    const edit = (change: (content: string) => string) => fs.writeFileSync(requestFile, change(fs.readFileSync(requestFile, 'utf8')));

    await test.step('Create a tracked collection with one commit', async () => {
      await createCollection(page, COLLECTION_NAME, dir, 'yml');
      await createRequest(page, REQUEST_NAME, COLLECTION_NAME, { url: 'https://base.example.com/ping' });
      await openCollectionSettings(page, COLLECTION_NAME);
      await page.getByTestId('collection-settings-tab-git').click();
      await page.getByTestId('git-init').click();
      await expect(page.getByTestId('git-branch')).toContainText('main');
      git(collectionPath, 'config', 'user.name', 'Ana');
      git(collectionPath, 'config', 'user.email', 'ana@example.com');
      git(collectionPath, 'config', 'commit.gpgsign', 'false');
      await page.getByTestId('git-stage-all').click();
      await page.getByTestId('git-commit-message').fill('first version');
      await page.getByTestId('git-commit').click();
      await expect(page.getByTestId('git-no-changes')).toBeVisible();
    });

    await test.step('They change the URL and the method, I change only the URL', async () => {
      git(collectionPath, 'checkout', '-q', '-b', 'feature');
      edit((content) => content.replace('base.example.com', 'theirs.example.com').replace('method: GET', 'method: POST'));
      git(collectionPath, 'commit', '-q', '-am', 'on feature');
      git(collectionPath, 'checkout', '-q', 'main');
      edit((content) => content.replace('base.example.com', 'ours.example.com'));
      git(collectionPath, 'commit', '-q', '-am', 'on main');
      expect(() => git(collectionPath, 'merge', '-q', 'feature')).toThrow();
      await page.getByTestId('git-refresh').click();
    });

    await test.step('The mixer proposes their method and asks about the URL', async () => {
      await page.getByTestId('git-conflicted-list').getByTestId('git-file-row').click();

      const parts = page.getByTestId('git-mixer-part');
      await expect(parts).toHaveCount(2);
      const method = parts.filter({ hasText: 'Method' });
      const url = parts.filter({ hasText: 'URL' });
      await expect(method).toContainText('only they changed it');
      await expect(method.getByTestId('git-mixer-theirs')).toHaveAttribute('aria-checked', 'true');
      await expect(url).toContainText('both changed it: choose one');
      await expect(page.getByTestId('git-mixer-save')).toBeDisabled();
    });

    await test.step('Choosing my URL and keeping the mix writes a request with both', async () => {
      await page.getByTestId('git-mixer-part').filter({ hasText: 'URL' }).getByTestId('git-mixer-ours').click();
      await page.getByTestId('git-mixer-save').click();

      await expect(page.getByTestId('git-conflicted-list')).toHaveCount(0);
      await expect
        .poll(() => fs.readFileSync(requestFile, 'utf8'))
        .toMatch(/method: POST[\s\S]*ours\.example\.com/);
      expect(fs.readFileSync(requestFile, 'utf8')).not.toContain('<<<<<<<');

      await page.getByTestId('git-finish-merge').click();
      await expect(page.getByTestId('git-no-changes')).toBeVisible();
      expect(git(collectionPath, 'log', '-1', '--format=%P').trim().split(' ')).toHaveLength(2);
    });
  });
});
