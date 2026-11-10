import { test, expect } from '../../../playwright';
import { type Page } from '@playwright/test';
import { clickResponseAction, closeAllCollections, createCollection, createRequest, openRequest } from '../../utils/page';
import { setBenchmarkWindowSize } from '../utils/window';
import { summarizeProfile, SAMPLING_INTERVAL_US, type CpuProfile } from '../utils/cpu-profile';
import * as path from 'path';
import * as fs from 'fs';

// Diagnostic, not a benchmark: records a CPU profile (CDP Profiler) while the app paints a large
// JSON response and prints where the main thread spent its time. It does nothing unless
// BENCH_PROFILE=1, so `npm run test:benchmark` skips it.
//
//   BENCH_PROFILE=1 PROFILE_SIZE_MB=10 npm run test:benchmark -- -g "Profile: Large JSON"
//
// The raw profile is written next to the other results and opens in DevTools (Performance tab >
// Load profile). Without source maps (production build) function names are minified, but the
// time per script file still shows which library the time goes to.
const SIZE_MB = Number(process.env.PROFILE_SIZE_MB) || 10;
const RESPONSE_TIMEOUT = 5 * 60_000;
async function sendAndWaitForPaint(page: Page) {
  await page.getByTestId('send-arrow-icon').click();
  await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: RESPONSE_TIMEOUT });
  await page
    .locator('[data-testid="response-preview-container"] .CodeMirror')
    .waitFor({ state: 'visible', timeout: RESPONSE_TIMEOUT });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

test.describe('Profile: Large JSON Response', () => {
  test.skip(process.env.BENCH_PROFILE !== '1', 'diagnostic only: set BENCH_PROFILE=1 to run it');

  test(`CPU profile while painting a ${SIZE_MB} MB JSON response`, async ({ page, electronApp, createTmpDir }) => {
    test.setTimeout(15 * 60_000);
    await setBenchmarkWindowSize(electronApp, page);

    const collectionName = `profile-json-${SIZE_MB}mb`;
    const requestName = `large-json-${SIZE_MB}mb`;
    const url = `http://localhost:8081/api/large-payload?size=${SIZE_MB * 1024 * 1024}&type=json`;

    await createCollection(page, collectionName, await createTmpDir(collectionName));
    await createRequest(page, requestName, collectionName, { url });
    await openRequest(page, collectionName, requestName);

    // One unprofiled send so lazy chunks and caches are warm, as in the benchmark.
    await sendAndWaitForPaint(page);
    await clickResponseAction(page, 'response-clear-btn');
    await page.getByTestId('response-status-code').first().waitFor({ state: 'hidden', timeout: RESPONSE_TIMEOUT });

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: SAMPLING_INTERVAL_US });
    await cdp.send('Profiler.start');

    await sendAndWaitForPaint(page);

    const { profile } = (await cdp.send('Profiler.stop')) as { profile: CpuProfile };

    const resultsDir = path.join(process.cwd(), 'tests', 'benchmarks', 'results');
    fs.mkdirSync(resultsDir, { recursive: true });
    const profilePath = path.join(resultsDir, `large-json-${SIZE_MB}mb.cpuprofile`);
    fs.writeFileSync(profilePath, JSON.stringify(profile));

    const summary = summarizeProfile(profile);
    console.log(`[PROFILE] ${SIZE_MB} MB JSON — busy main-thread time: ${summary.busyMs} ms (profile: ${profilePath})`);
    console.log(`[PROFILE] self time by script file:\n${summary.selfByFile.join('\n')}`);
    console.log(`[PROFILE] top self time by function:\n${summary.selfByFrame.join('\n')}`);
    console.log(`[PROFILE] top inclusive time by function:\n${summary.inclusive.join('\n')}`);
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });
});
