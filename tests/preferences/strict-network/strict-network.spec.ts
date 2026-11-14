import { test, expect } from '../../../playwright';
import { openPreferences, closePreferences } from '../../utils/page';

// 203.0.113.0/24 is reserved for documentation and is never routed, so nothing leaves this machine even if
// the block failed.
const OUTSIDE_URL = 'http://203.0.113.7/pixel.png';

const loadImage = (page, url: string) =>
  page.evaluate(
    (src) =>
      new Promise<string>((resolve) => {
        const image = new Image();
        image.onload = () => resolve('loaded');
        image.onerror = () => resolve('failed');
        image.src = src;
      }),
    url
  );

const blockedCount = (page) =>
  page.evaluate(() => (window as any).ipcRenderer.invoke('renderer:get-strict-network-status').then((status) => status.blockedCount));

test.describe('Strict network mode', () => {
  test('stops a window from loading something from another machine, and counts it', async ({ page }) => {
    const toggle = page.getByTestId('general-strict-network');
    const status = page.getByTestId('strict-network-status');

    await test.step('It is off by default and says nothing', async () => {
      await openPreferences(page);
      await expect(toggle).not.toBeChecked();
      await expect(status).toHaveCount(0);
    });

    try {
      await test.step('Turning it on reports that nothing has been blocked', async () => {
        await toggle.check();
        await expect(status).toContainText('Nothing has been blocked since RestLab started.');
      });

      await test.step('A load from another machine is cancelled and counted', async () => {
        const before = await blockedCount(page);
        expect(await loadImage(page, OUTSIDE_URL)).toBe('failed');
        await expect.poll(() => blockedCount(page)).toBe(before + 1);
      });

      await test.step('The count and the address show up in Privacy', async () => {
        await toggle.uncheck();
        await expect(status).toHaveCount(0);
        await toggle.check();
        await expect(status).toContainText('1 connection to 203.0.113.7');
      });
    } finally {
      await toggle.uncheck();
      await expect(status).toHaveCount(0);
      await closePreferences(page);
    }
  });
});
