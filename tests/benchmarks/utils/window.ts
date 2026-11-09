import type { ElectronApplication, Page } from '@playwright/test';

/**
 * Window size used by every benchmark.
 *
 * The isolated test profile can persist a 1280x400 window state, which clips
 * menus and changes how much of the sidebar is rendered. A fixed size keeps
 * runs comparable and keeps the UI usable.
 */
export const BENCHMARK_WINDOW = { width: 1280, height: 800 };

export async function setBenchmarkWindowSize(electronApp: ElectronApplication, page?: Page): Promise<void> {
  await electronApp.evaluate(({ BrowserWindow }, size) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) {
      throw new Error('benchmark: no BrowserWindow to resize');
    }
    win.setContentSize(size.width, size.height);
  }, BENCHMARK_WINDOW);

  if (page) {
    await page.waitForFunction(
      ({ width, height }) => window.innerWidth === width && window.innerHeight >= height - 1,
      BENCHMARK_WINDOW
    );
  }
}
