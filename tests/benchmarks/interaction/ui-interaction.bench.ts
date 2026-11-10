import { test, expect } from '../../../playwright';
import { type Page } from '@playwright/test';
import { openCollectionFromPath, waitForCollectionMount, closeAllCollections, buildCommonLocators, openPreferences, selectPreferencesTab, closePreferences } from '../../utils/page';
import { generateCollection } from '../utils/collection-generator';
import { setBenchmarkWindowSize } from '../utils/window';
import { summarizeProfile, SAMPLING_INTERVAL_US, type CpuProfile } from '../utils/cpu-profile';
import * as path from 'path';
import * as fs from 'fs';

// Diagnostic: how long the UI takes to react to everyday actions (switch theme, open request tabs,
// open Preferences) with a 200-request collection loaded, plus a CPU profile of each action.
// Skipped unless BENCH_PROFILE=1:
//
//   BENCH_PROFILE=1 ELECTRON_IS_DEV=0 PLAYWRIGHT_ELECTRON_ARGS="--ozone-platform=x11" \
//     npm run test:benchmark -- -g "UI interaction"
const REQUESTS = Number(process.env.INTERACTION_REQUESTS) || 200;
const TAB_OPENS = 8;

const afterPaint = (page: Page) =>
  page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

async function timed(page: Page, action: () => Promise<void>) {
  const start = Date.now();
  await action();
  await afterPaint(page);
  return Date.now() - start;
}

test.describe('UI interaction (diagnostic)', () => {
  test.skip(process.env.BENCH_PROFILE !== '1', 'diagnostic only: set BENCH_PROFILE=1 to run it');

  test(`theme switch and tab opening with ${REQUESTS} requests loaded`, async ({ page, electronApp, createTmpDir }) => {
    test.setTimeout(10 * 60_000);
    await setBenchmarkWindowSize(electronApp, page);

    const name = `interaction-${REQUESTS}`;
    const dir = await createTmpDir(name);
    generateCollection({ dir, name, requestCount: REQUESTS, format: 'bru' });
    await openCollectionFromPath(page, electronApp, dir);
    await waitForCollectionMount(page, name, { timeout: 120_000 });

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: SAMPLING_INTERVAL_US });
    const resultsDir = path.join(process.cwd(), 'tests', 'benchmarks', 'results');
    fs.mkdirSync(resultsDir, { recursive: true });

    const profiled = async (label: string, action: () => Promise<void>) => {
      await cdp.send('Profiler.start');
      const ms = await timed(page, action);
      const { profile } = (await cdp.send('Profiler.stop')) as { profile: CpuProfile };
      fs.writeFileSync(path.join(resultsDir, `interaction-${label}.cpuprofile`), JSON.stringify(profile));
      const summary = summarizeProfile(profile);
      console.log(`[INTERACTION] ${label}: ${ms} ms wall, ${summary.busyMs} ms busy`);
      console.log(`[INTERACTION] ${label} self by file:\n${summary.selfByFile.join('\n')}`);
      console.log(`[INTERACTION] ${label} top self by function:\n${summary.selfByFrame.slice(0, 12).join('\n')}`);
      return ms;
    };

    // Tab opening: expand a folder once, then open requests one by one.
    await page.getByTestId('sidebar-collection-row').filter({ hasText: name }).click();
    const { sidebar } = buildCommonLocators(page);
    await sidebar.folder('folder-0').click();
    const folderWrapper = page.locator('[data-parent-name="folder-0"]');
    const opens: number[] = [];
    for (let i = 1; i <= TAB_OPENS; i++) {
      const row = folderWrapper.locator('.collection-item-name').filter({
        has: page.locator('.item-name').filter({ hasText: new RegExp(`^request-${i}$`) })
      });
      await row.waitFor({ state: 'visible' });
      const label = `open-request-${i}`;
      opens.push(i <= 2 ? await profiled(label, () => row.dblclick()) : await timed(page, () => row.dblclick()));
    }
    console.log(`[INTERACTION] open request tab, ms each: [${opens.join(', ')}]`);

    // Preferences tab + theme switch
    const prefMs = await profiled('open-preferences', () => openPreferences(page));
    await selectPreferencesTab(page, 'Themes');
    const themeMs: number[] = [];
    for (const mode of ['Light', 'Dark', 'Light', 'Dark']) {
      const card = page.getByText(mode, { exact: true }).first();
      themeMs.push(await profiled(`theme-${mode.toLowerCase()}-${themeMs.length}`, () => card.click()));
    }
    console.log(`[INTERACTION] preferences open: ${prefMs} ms; theme switch ms: [${themeMs.join(', ')}]`);
    await closePreferences(page);
    expect(opens.length).toBe(TAB_OPENS);
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });
});
