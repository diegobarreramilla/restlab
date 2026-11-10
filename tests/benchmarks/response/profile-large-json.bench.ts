import { test, expect } from '../../../playwright';
import { type Page } from '@playwright/test';
import { clickResponseAction, closeAllCollections, createCollection, createRequest, openRequest } from '../../utils/page';
import { setBenchmarkWindowSize } from '../utils/window';
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
const SAMPLING_INTERVAL_US = 100;
const TOP_ENTRIES = 25;

interface ProfileNode {
  id: number;
  callFrame: { functionName: string; url: string; lineNumber: number; columnNumber: number };
  children?: number[];
}

interface CpuProfile {
  nodes: ProfileNode[];
  samples: number[];
  timeDeltas: number[];
}

const IDLE_FUNCTIONS = new Set(['(idle)', '(program)', '(root)']);

function frameLabel(node: ProfileNode): string {
  const { functionName, url, lineNumber, columnNumber } = node.callFrame;
  const file = url ? url.split('/').slice(-2).join('/') : '(native)';
  return `${functionName || '(anonymous)'}  ${file}:${lineNumber + 1}:${columnNumber + 1}`;
}

function summarizeProfile(profile: CpuProfile) {
  const byId = new Map(profile.nodes.map((node) => [node.id, node]));
  const selfUs = new Map<number, number>();

  profile.samples.forEach((nodeId, index) => {
    selfUs.set(nodeId, (selfUs.get(nodeId) || 0) + (profile.timeDeltas[index] || 0));
  });

  const inclusiveUs = new Map<number, number>();
  const total = (nodeId: number): number => {
    const cached = inclusiveUs.get(nodeId);
    if (cached !== undefined) return cached;
    const node = byId.get(nodeId)!;
    const value = (selfUs.get(nodeId) || 0) + (node.children || []).reduce((sum, child) => sum + total(child), 0);
    inclusiveUs.set(nodeId, value);
    return value;
  };
  profile.nodes.forEach((node) => total(node.id));

  const isWork = (node: ProfileNode) => !IDLE_FUNCTIONS.has(node.callFrame.functionName);
  const ms = (us: number) => Math.round(us / 100) / 10;

  const selfByFrame = new Map<string, number>();
  const selfByFile = new Map<string, number>();
  for (const node of profile.nodes) {
    const self = selfUs.get(node.id) || 0;
    if (!self || !isWork(node)) continue;
    selfByFrame.set(frameLabel(node), (selfByFrame.get(frameLabel(node)) || 0) + self);
    const file = node.callFrame.url ? node.callFrame.url.split('/').pop()! : '(native)';
    selfByFile.set(file, (selfByFile.get(file) || 0) + self);
  }

  const top = (map: Map<string, number>, limit: number) =>
    [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([label, us]) => `${String(ms(us)).padStart(8)} ms  ${label}`);

  const inclusive = profile.nodes
    .filter((node) => isWork(node) && node.callFrame.url)
    .map((node) => ({ label: frameLabel(node), us: inclusiveUs.get(node.id) || 0 }))
    .sort((a, b) => b.us - a.us)
    .slice(0, TOP_ENTRIES)
    .map(({ label, us }) => `${String(ms(us)).padStart(8)} ms  ${label}`);

  const busyUs = profile.nodes.filter(isWork).reduce((sum, node) => sum + (selfUs.get(node.id) || 0), 0);

  return { busyMs: ms(busyUs), selfByFile: top(selfByFile, 10), selfByFrame: top(selfByFrame, TOP_ENTRIES), inclusive };
}

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
