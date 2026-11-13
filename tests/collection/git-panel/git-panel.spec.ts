import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { test, expect } from '../../../playwright';
import { createCollection, createRequest, openCollectionSettings } from '../../utils/page';

const COLLECTION_NAME = 'git-panel';
const REQUEST_NAME = 'ping';

const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, stdio: 'pipe' }).toString();

test.describe('Git panel of a collection', () => {
  test('tracks, commits, shows history and blame, branches and puts changes aside', async ({ page, createTmpDir }) => {
    const dir = await createTmpDir('git-panel');
    const collectionPath = path.join(dir, COLLECTION_NAME);
    const requestFile = path.join(collectionPath, `${REQUEST_NAME}.yml`);

    await test.step('Create a collection with a request and open its Git tab', async () => {
      await createCollection(page, COLLECTION_NAME, dir, 'yml');
      await createRequest(page, REQUEST_NAME, COLLECTION_NAME, { url: 'https://a.example.com/ping' });
      await openCollectionSettings(page, COLLECTION_NAME);
      await page.getByTestId('collection-settings-tab-git').click();
    });

    await test.step('Start tracking changes', async () => {
      await expect(page.getByTestId('git-not-a-repository')).toBeVisible();
      await page.getByTestId('git-init').click();
      await expect(page.getByTestId('git-branch')).toContainText('main');
      expect(fs.existsSync(path.join(collectionPath, '.git'))).toBe(true);
      // The commits below must not depend on a git identity being configured on the machine.
      git(collectionPath, 'config', 'user.name', 'Ana');
      git(collectionPath, 'config', 'user.email', 'ana@example.com');
      git(collectionPath, 'config', 'commit.gpgsign', 'false');
    });

    await test.step('The new files are listed by request name, staged and committed', async () => {
      const unstaged = page.getByTestId('git-unstaged-list');
      await expect(unstaged.getByTestId('git-file-row').filter({ hasText: REQUEST_NAME })).toBeVisible();

      await page.getByTestId('git-stage-all').click();
      await expect(page.getByTestId('git-staged-list').getByTestId('git-file-row').first()).toBeVisible();
      await expect(page.getByTestId('git-commit')).toBeDisabled();

      await page.getByTestId('git-commit-message').fill('first version');
      await page.getByTestId('git-commit').click();

      await expect(page.getByTestId('git-no-changes')).toBeVisible();
      expect(git(collectionPath, 'log', '--format=%s')).toContain('first version');
    });

    await test.step('A change made outside the app shows up with its request diff', async () => {
      fs.writeFileSync(requestFile, fs.readFileSync(requestFile, 'utf8').replace('a.example.com', 'b.example.com'));
      await page.getByTestId('git-refresh').click();

      const row = page.getByTestId('git-unstaged-list').getByTestId('git-file-row').filter({ hasText: REQUEST_NAME });
      await expect(row.getByTestId('git-file-status')).toHaveText('M');
      await row.click();
      await expect(page.getByTestId('git-file-diff')).toContainText('b.example.com');

      await page.getByTestId('git-diff-toggle').click();
      await expect(page.getByTestId('git-diff-text')).toContainText('b.example.com');

      await row.getByTestId('git-stage').click();
      await page.getByTestId('git-commit-message').fill('point at b');
      await page.getByTestId('git-commit').click();
      await expect(page.getByTestId('git-no-changes')).toBeVisible();
    });

    await test.step('History lists both commits and what each one changed', async () => {
      await page.getByTestId('git-view-history').click();
      const commits = page.getByTestId('git-commit-row');
      await expect(commits).toHaveCount(2);
      await expect(commits.first()).toContainText('point at b');
      await expect(commits.first()).toContainText('Ana');

      await commits.first().click();
      const file = page.getByTestId('git-commit-files').getByTestId('git-file-row').filter({ hasText: REQUEST_NAME });
      await file.click();
      await expect(page.getByTestId('git-file-diff')).toContainText('b.example.com');
    });

    await test.step('By request shows who last changed each part and the history of the request', async () => {
      await page.getByTestId('git-view-requests').click();
      await page.getByTestId('git-request-option').filter({ hasText: REQUEST_NAME }).click();

      const url = page.getByTestId('git-blame-row').filter({ hasText: /^URL/ });
      await expect(url).toContainText('Ana');
      await expect(url).toContainText('point at b');
      await expect(page.getByTestId('git-request-commit')).toHaveCount(2);
    });

    await test.step('A new branch becomes the current one', async () => {
      await page.getByTestId('git-branch').click();
      await page.getByText('New branch…').click();
      await page.getByTestId('git-new-branch-name').fill('feature/retry');
      await page.getByTestId('git-new-branch-create').click();

      await expect(page.getByTestId('git-branch')).toContainText('feature/retry');
      expect(git(collectionPath, 'branch', '--show-current').trim()).toBe('feature/retry');
    });

    await test.step('Pending changes can be put aside and brought back', async () => {
      fs.writeFileSync(requestFile, fs.readFileSync(requestFile, 'utf8').replace('b.example.com', 'c.example.com'));
      await page.getByTestId('git-refresh').click();
      await page.getByTestId('git-view-stashes').click();

      await page.getByTestId('git-stash-message').fill('try c');
      await page.getByTestId('git-stash-create').click();
      await expect(page.getByTestId('git-stash-row')).toContainText('try c');
      expect(fs.readFileSync(requestFile, 'utf8')).toContain('b.example.com');

      await page.getByTestId('git-stash-apply').click();
      await expect.poll(() => fs.readFileSync(requestFile, 'utf8')).toContain('c.example.com');
    });
  });
});
