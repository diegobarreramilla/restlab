import { test, expect } from '../../../playwright';
import { type Page } from '@playwright/test';
import {
  clickResponseAction,
  closeAllCollections,
  createCollection,
  createRequest,
  openRequest
} from '../../utils/page';
import { summarize } from '../utils/stats';
import { writeResults, buildResultEntry, type ResultEntry } from '../utils/results';
import { setBenchmarkWindowSize } from '../utils/window';
import * as path from 'path';
import * as fs from 'fs';

const ITERATIONS = 3;
const WARMUP_RUNS = 1;

// Rendering a 10 MB JSON response can block the renderer for a long time.
const RESPONSE_TIMEOUT = 5 * 60_000;

const CASES = [
  { key: '5mb', size: 5 * 1024 * 1024 },
  { key: '10mb', size: 10 * 1024 * 1024 }
];

interface LongTaskEntry {
  startTime: number;
  duration: number;
}

interface SendMeasurement {
  timeToPaint: number;
  maxLongTask: number;
  longTaskCount: number;
  longTaskTotal: number;
}

function endpointFor(size: number): string {
  return `http://localhost:8081/api/large-payload?size=${size}&type=json`;
}

async function installLongTaskObserver(page: Page) {
  await page.evaluate(() => {
    const w = window as any;

    w.__benchLongTasks = [];
    if (w.__benchLongTaskObserver) {
      w.__benchLongTaskObserver.disconnect();
    }

    w.__benchLongTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        w.__benchLongTasks.push({ startTime: entry.startTime, duration: entry.duration });
      }
    });
    w.__benchLongTaskObserver.observe({ type: 'longtask' });
  });
}

/**
 * Timestamp the real click on the Send button from inside the renderer, so the
 * measurement does not include Playwright's actionability checks.
 */
async function armSendTimer(page: Page) {
  await page.evaluate(() => {
    const w = window as any;
    w.__benchLongTasks = [];
    w.__benchSendStart = null;

    const button = document.querySelector('[data-testid="send-arrow-icon"]');
    if (!button) {
      throw new Error('benchmark: send button not found');
    }

    const onClick = () => {
      w.__benchSendStart = performance.now();
      button.removeEventListener('click', onClick, true);
    };
    button.addEventListener('click', onClick, true);
  });
}

async function clearResponse(page: Page) {
  const status = page.getByTestId('response-status-code').first();

  if ((await status.count()) === 0 || !(await status.isVisible().catch(() => false))) {
    return;
  }

  await clickResponseAction(page, 'response-clear-btn');
  await status.waitFor({ state: 'hidden', timeout: RESPONSE_TIMEOUT });
}

async function sendAndMeasure(page: Page): Promise<SendMeasurement> {
  await armSendTimer(page);

  await page.getByTestId('send-arrow-icon').click();
  await page.getByTestId('response-status-code').waitFor({ state: 'visible', timeout: RESPONSE_TIMEOUT });
  await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: RESPONSE_TIMEOUT });

  // The response editor only mounts once the formatted JSON is ready.
  await page
    .locator('[data-testid="response-preview-container"] .CodeMirror')
    .waitFor({ state: 'visible', timeout: RESPONSE_TIMEOUT });

  // Two frames after the editor is visible: the second frame runs after the
  // first paint of the rendered response.
  const result = await page.evaluate(
    () =>
      new Promise<{ timeToPaint: number; longTasks: LongTaskEntry[] }>((resolve) => {
        const w = window as any;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve({
              timeToPaint: performance.now() - w.__benchSendStart,
              longTasks: w.__benchLongTasks
            });
          });
        });
      })
  );

  const durations = result.longTasks.map((entry) => entry.duration);

  return {
    timeToPaint: result.timeToPaint,
    maxLongTask: durations.length ? Math.max(...durations) : 0,
    longTaskCount: durations.length,
    longTaskTotal: durations.reduce((sum, duration) => sum + duration, 0)
  };
}

test.describe('Benchmark: Large JSON Response', () => {
  const paintTimings: Record<string, number[]> = {};
  const longTaskTimings: Record<string, number[]> = {};

  for (const { key, size } of CASES) {
    test(`paint a ${key} JSON response`, async ({ page, electronApp, createTmpDir }) => {
      test.setTimeout(15 * 60_000);
      await setBenchmarkWindowSize(electronApp, page);

      const collectionName = `bench-json-${key}`;
      const requestName = `large-json-${key}`;

      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, requestName, collectionName, { url: endpointFor(size) });
      await openRequest(page, collectionName, requestName);

      await installLongTaskObserver(page);

      for (let i = 0; i < WARMUP_RUNS; i++) {
        const warmup = await sendAndMeasure(page);
        console.log(
          `[BENCHMARK] ${key} warmup — paint: ${Math.round(warmup.timeToPaint)}ms, max long task: ${Math.round(warmup.maxLongTask)}ms`
        );
        await clearResponse(page);
      }

      const paints: number[] = [];
      const longTasks: number[] = [];

      for (let i = 0; i < ITERATIONS; i++) {
        await clearResponse(page);
        const measurement = await sendAndMeasure(page);

        paints.push(measurement.timeToPaint);
        longTasks.push(measurement.maxLongTask);

        console.log(
          `[BENCHMARK] ${key} iteration ${i + 1} — paint: ${Math.round(measurement.timeToPaint)}ms, max long task: ${Math.round(measurement.maxLongTask)}ms (${measurement.longTaskCount} long tasks, ${Math.round(measurement.longTaskTotal)}ms total)`
        );
      }

      paintTimings[key] = paints;
      longTaskTimings[key] = longTasks;

      const paintStats = summarize(paints);
      const longTaskStats = summarize(longTasks);
      const r = (value: number) => Math.round(value);

      console.log(
        `[BENCHMARK] ${key} paint — mean: ${r(paintStats.mean)}ms, median: ${r(paintStats.median)}ms, p90: ${r(paintStats.p90)}ms, raw: [${paints.join(', ')}]`
      );
      console.log(
        `[BENCHMARK] ${key} max long task — mean: ${r(longTaskStats.mean)}ms, median: ${r(longTaskStats.median)}ms, p90: ${r(longTaskStats.p90)}ms, raw: [${longTasks.join(', ')}]`
      );

      test.info().annotations.push({
        type: 'benchmark',
        description: JSON.stringify({ size, paint: paintStats, longTask: longTaskStats })
      });
    });
  }

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test.afterAll(async () => {
    const resultsDir = path.join(process.cwd(), 'tests', 'benchmarks', 'results');
    fs.mkdirSync(resultsDir, { recursive: true });

    const entries: Record<string, ResultEntry> = {};

    for (const { key, size } of CASES) {
      if (paintTimings[key]) {
        entries[`json-${key}-paint`] = buildResultEntry(paintTimings[key], { size, metric: 'timeToPaint' });
      }
      if (longTaskTimings[key]) {
        entries[`json-${key}-long-task`] = buildResultEntry(longTaskTimings[key], { size, metric: 'maxLongTask' });
      }
    }

    const outputPath = path.join(resultsDir, 'large-json.json');
    writeResults(outputPath, { name: 'Large JSON Response', unit: 'ms', direction: 'smaller' }, entries);
    console.log(`[BENCHMARK] Results written to ${outputPath}`);
  });
});
