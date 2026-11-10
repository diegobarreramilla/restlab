import { test, waitForReadyPage } from '../../../playwright';
import { type ElectronApplication } from '@playwright/test';
import { generateCollection } from '../utils/collection-generator';
import { summarize } from '../utils/stats';
import { startTimer } from '../utils/timing';
import { writeResults, buildResultEntry, type ResultEntry } from '../utils/results';
import * as path from 'path';
import * as fs from 'fs';

const ITERATIONS = 5;
const WARMUP_RUNS = 1;
const COLLECTION_NAME = 'cold-start';
const COLLECTION_REQUESTS = 10;
const STARTUP_TIMEOUT = 3 * 60_000;

interface ColdStartOptions {
  userDataPath: string;
  collectionPath: string;
}

function writePreferences({ userDataPath, collectionPath }: ColdStartOptions) {
  const preferences = {
    maximized: false,
    lastOpenedCollections: [collectionPath],
    preferences: {
      onboarding: {
        hasLaunchedBefore: true,
        hasSeenWelcomeModal: true,
        lastSeenVersion: '2.0.0'
      }
    }
  };

  fs.writeFileSync(path.join(userDataPath, 'preferences.json'), JSON.stringify(preferences, null, 2));
}

async function launchUntilCollectionVisible(
  launchElectronApp: (options: { userDataPath: string }) => Promise<ElectronApplication>,
  userDataPath: string
): Promise<number> {
  const timer = startTimer();
  const app = await launchElectronApp({ userDataPath });

  try {
    const page = await waitForReadyPage(app, { timeout: STARTUP_TIMEOUT });
    await page
      .locator('#sidebar-collection-name')
      .filter({ hasText: COLLECTION_NAME })
      .waitFor({ state: 'visible', timeout: STARTUP_TIMEOUT });

    return timer.elapsed();
  } finally {
    await app.close();
  }
}

test.describe('Benchmark: Cold Start', () => {
  test('cold start until the first collection is visible', async ({ createTmpDir, launchElectronApp }) => {
    test.setTimeout(15 * 60_000);

    const collectionDir = await createTmpDir('cold-start-collection');
    generateCollection({
      dir: collectionDir,
      name: COLLECTION_NAME,
      requestCount: COLLECTION_REQUESTS,
      format: 'bru'
    });

    const userDataPath = await createTmpDir('cold-start-userdata');
    writePreferences({ userDataPath, collectionPath: collectionDir });

    // The first launch migrates lastOpenedCollections into the default workspace
    // and warms the disk cache. It is not part of the measurement.
    for (let i = 0; i < WARMUP_RUNS; i++) {
      await launchUntilCollectionVisible(launchElectronApp, userDataPath);
    }

    const timings: number[] = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const elapsed = await launchUntilCollectionVisible(launchElectronApp, userDataPath);
      timings.push(elapsed);
      console.log(`[BENCHMARK] cold start iteration ${i + 1}: ${Math.round(elapsed)}ms`);
    }

    const stats = summarize(timings);
    const r = (v: number) => Math.round(v);
    console.log(
      `[BENCHMARK] cold start — mean: ${r(stats.mean)}ms, median: ${r(stats.median)}ms, p90: ${r(stats.p90)}ms, stdDev: ${r(stats.stdDev)}ms, raw: [${timings.join(', ')}]`
    );

    const resultsDir = path.join(process.cwd(), 'tests', 'benchmarks', 'results');
    fs.mkdirSync(resultsDir, { recursive: true });

    const entries: Record<string, ResultEntry> = {
      'first-collection-visible': buildResultEntry(timings, {
        collection: COLLECTION_NAME,
        requests: COLLECTION_REQUESTS,
        format: 'bru'
      })
    };

    const outputPath = path.join(resultsDir, 'startup.json');
    writeResults(outputPath, { name: 'Cold Start', unit: 'ms', direction: 'smaller' }, entries);
    console.log(`[BENCHMARK] Results written to ${outputPath}`);
  });
});
