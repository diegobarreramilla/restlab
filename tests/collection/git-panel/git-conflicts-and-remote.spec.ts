import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { test, expect } from '../../../playwright';
import { createCollection, createRequest, openCollectionSettings } from '../../utils/page';

const COLLECTION_NAME = 'git-conflicts';
const REQUEST_NAME = 'ping';

const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, stdio: 'pipe' }).toString();

test.describe('Git panel: conflicts and the remote', () => {
  test('settles a conflict by choosing a side, finishes the merge, connects a remote and pushes', async ({ page, createTmpDir }) => {
    const dir = await createTmpDir('git-conflicts');
    const remoteDir = await createTmpDir('git-remote');
    const collectionPath = path.join(dir, COLLECTION_NAME);
    const requestFile = path.join(collectionPath, `${REQUEST_NAME}.yml`);
    const setHost = (host: string) =>
      fs.writeFileSync(requestFile, fs.readFileSync(requestFile, 'utf8').replace(/https:\/\/[a-z]+\.example\.com/, `https://${host}.example.com`));

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

    await test.step('Two branches change the same request and the merge stops', async () => {
      git(collectionPath, 'checkout', '-q', '-b', 'feature');
      setHost('theirs');
      git(collectionPath, 'commit', '-q', '-am', 'on feature');
      git(collectionPath, 'checkout', '-q', 'main');
      setHost('ours');
      git(collectionPath, 'commit', '-q', '-am', 'on main');
      expect(() => git(collectionPath, 'merge', '-q', 'feature')).toThrow();
      await page.getByTestId('git-refresh').click();

      await expect(page.getByTestId('git-conflicts')).toContainText('Choose which version to keep');
      await expect(page.getByTestId('git-view-changes')).toContainText('Changes · 1');
      await expect(page.getByTestId('git-finish-merge')).toHaveCount(0);
    });

    await test.step('Both versions of the request are shown side by side', async () => {
      const row = page.getByTestId('git-conflicted-list').getByTestId('git-file-row').filter({ hasText: REQUEST_NAME });
      await expect(row.getByTestId('git-file-status')).toHaveText('!');
      await row.click();

      const diff = page.getByTestId('git-file-diff');
      await expect(diff).toContainText('Yours');
      await expect(diff).toContainText('Theirs');
      await expect(diff).toContainText('ours.example.com');
      await expect(diff).toContainText('theirs.example.com');
    });

    await test.step('Taking their version settles the conflict and the merge can be finished', async () => {
      await page.getByTestId('git-conflicted-list').getByTestId('git-file-row').getByTestId('git-take-theirs').click();

      await expect(page.getByTestId('git-conflicted-list')).toHaveCount(0);
      await expect(page.getByTestId('git-conflicts')).toContainText('Every conflict is settled');
      await expect(page.getByTestId('git-commit')).toHaveCount(0);

      await page.getByTestId('git-finish-merge').click();
      await expect(page.getByTestId('git-no-changes')).toBeVisible();

      const content = fs.readFileSync(requestFile, 'utf8');
      expect(content).toContain('theirs.example.com');
      expect(content).not.toContain('<<<<<<<');
      expect(git(collectionPath, 'log', '-1', '--format=%P').trim().split(' ')).toHaveLength(2);
    });

    await test.step('Connecting a remote from the panel makes push available', async () => {
      git(remoteDir, 'init', '-q', '--bare', '-b', 'main');
      await expect(page.getByTestId('git-push')).toHaveCount(0);

      await page.getByTestId('git-connect').click();
      await page.getByTestId('git-remote-address').fill(remoteDir);
      await page.getByTestId('git-remote-save').click();

      await expect(page.getByTestId('git-connection')).toContainText(path.basename(remoteDir));
      await page.getByTestId('git-push').click();
      // Until the push lands the remote has no branch to read, and git fails instead of printing nothing.
      const remoteLog = () => {
        try {
          return git(remoteDir, 'log', '--format=%s', 'main');
        } catch {
          return '';
        }
      };
      await expect.poll(remoteLog).toContain('on feature');
    });

    await test.step('Disconnecting goes back to a local repository', async () => {
      await page.getByTestId('git-connection').click();
      await page.getByTestId('git-remote-disconnect').click();

      await expect(page.getByTestId('git-connection')).toContainText('Only on this computer');
      expect(git(collectionPath, 'remote').trim()).toBe('');
    });
  });
});
