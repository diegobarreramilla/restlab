import { test, waitForReadyPage } from '../../../playwright';
import { type ElectronApplication, type Page } from '@playwright/test';
import { openCollection } from '../../utils/page';
import { generateCollection } from '../utils/collection-generator';
import { RendererMemorySampler } from '../utils/memory';
import { writeResults, buildResultEntry, type ResultEntry } from '../utils/results';
import { formatMib, round } from '../utils/format';
import { setBenchmarkWindowSize } from '../utils/window';
import * as path from 'path';
import * as fs from 'fs';

// How much memory the whole app holds while it sits idle, and whether it keeps growing.
// The number a user sees in the task manager is the sum over every Electron process, so
// that is what is sampled (`app.getAppMetrics()`), next to the renderer JS heap after a
// forced garbage collection at the start and at the end.
const IDLE_MS = 5 * 60_000;
const SAMPLE_INTERVAL_MS = 30_000;
// Startup and mount leave garbage that is only collected after a while; measuring earlier
// would count it as memory that the app "released" during the idle period.
const SETTLE_MS = 60_000;
const STARTUP_TIMEOUT = 3 * 60_000;
const MOUNT_TIMEOUT = 10 * 60_000;
const COLLECTION_FORMAT = 'bru';

const SCENARIOS = [
  { key: 'empty', requests: 0 },
  { key: 'bru-1000', requests: 1000 }
];

interface ProcessMemory {
  type: string;
  workingSetKb: number;
}

async function readProcessMemory(electronApp: ElectronApplication): Promise<ProcessMemory[]> {
  return electronApp.evaluate(({ app }) =>
    app.getAppMetrics().map((metric) => ({ type: metric.type, workingSetKb: metric.memory.workingSetSize }))
  );
}

const totalBytes = (processes: ProcessMemory[]) =>
  processes.reduce((sum, processInfo) => sum + processInfo.workingSetKb, 0) * 1024;

const byType = (processes: ProcessMemory[]) => {
  const result: Record<string, number> = {};
  for (const { type, workingSetKb } of processes) {
    result[type] = round((result[type] || 0) + workingSetKb / 1024, 1);
  }
  return result;
};

async function mountCollection(page: Page, collectionName: string) {
  await page.evaluate(() => {
    (window as any).__benchMountDone = new Promise<void>((resolve) => {
      const off = (window as any).ipcRenderer.on('main:collection-loading-state-updated', (val: any) => {
        if (!val.isLoading) {
          off();
          resolve();
        }
      });
    });
  });

  await openCollection(page, collectionName, { timeout: MOUNT_TIMEOUT });
  await page.evaluate(() => (window as any).__benchMountDone);
}

test.describe('Benchmark: Idle Memory', () => {
  const entries: Record<string, ResultEntry> = {};

  for (const { key, requests } of SCENARIOS) {
    test(`idle memory with ${key}`, async ({ createTmpDir, launchElectronApp }) => {
      test.setTimeout(IDLE_MS + 15 * 60_000);

      const userDataPath = await createTmpDir(`idle-memory-userdata-${key}`);
      const collectionName = `idle-${key}`;
      const lastOpenedCollections: string[] = [];

      if (requests > 0) {
        const collectionDir = await createTmpDir(`idle-memory-${key}`);
        generateCollection({ dir: collectionDir, name: collectionName, requestCount: requests, format: COLLECTION_FORMAT });
        lastOpenedCollections.push(collectionDir);
      }

      fs.writeFileSync(
        path.join(userDataPath, 'preferences.json'),
        JSON.stringify(
          {
            maximized: false,
            lastOpenedCollections,
            preferences: { onboarding: { hasLaunchedBefore: true, hasSeenWelcomeModal: true, lastSeenVersion: '2.0.0' } }
          },
          null,
          2
        )
      );

      // The first launch migrates lastOpenedCollections into the default workspace; the
      // measured launch below starts from a profile that already holds it.
      if (requests > 0) {
        const warmup = await launchElectronApp({ userDataPath });
        await waitForReadyPage(warmup, { timeout: STARTUP_TIMEOUT });
        await warmup.close();
      }

      const electronApp = await launchElectronApp({ userDataPath });

      try {
        const page = await waitForReadyPage(electronApp, { timeout: STARTUP_TIMEOUT });
        await setBenchmarkWindowSize(electronApp, page);

        if (requests > 0) {
          await mountCollection(page, collectionName);
        }

        // Let startup work (file watchers, indexing, deferred renders) finish before t0.
        await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));

        // The forced GC runs first so t0 is taken after the settle garbage is gone.
        const cdp = await page.context().newCDPSession(page);
        const rendererStartBytes = await RendererMemorySampler.measureRetainedBytes(cdp);

        const samples: number[] = [];
        const typeSamples: Record<string, number>[] = [];
        const first = await readProcessMemory(electronApp);
        samples.push(totalBytes(first));
        typeSamples.push(byType(first));

        const sampleCount = IDLE_MS / SAMPLE_INTERVAL_MS;
        let last = first;
        for (let i = 1; i <= sampleCount; i++) {
          await new Promise((resolve) => setTimeout(resolve, SAMPLE_INTERVAL_MS));
          last = await readProcessMemory(electronApp);
          samples.push(totalBytes(last));
          typeSamples.push(byType(last));
          console.log(`[BENCHMARK] ${key} idle ${Math.round((i * SAMPLE_INTERVAL_MS) / 1000)}s — total ${formatMib(samples[i])}`);
        }

        const rendererEndBytes = await RendererMemorySampler.measureRetainedBytes(cdp);

        const startBytes = samples[0];
        const endBytes = samples[samples.length - 1];
        console.log(
          `[BENCHMARK] ${key} — start ${formatMib(startBytes)}, after 5 min ${formatMib(endBytes)}, growth ${formatMib(endBytes - startBytes)}; `
          + `renderer heap ${formatMib(rendererStartBytes)} -> ${formatMib(rendererEndBytes)}; by type at end ${JSON.stringify(byType(last))}`
        );

        entries[`${key}-total-working-set`] = buildResultEntry(samples, {
          scenario: key,
          requests,
          format: COLLECTION_FORMAT,
          idleMs: IDLE_MS,
          sampleIntervalMs: SAMPLE_INTERVAL_MS,
          startMib: round(startBytes / 1024 ** 2, 1),
          endMib: round(endBytes / 1024 ** 2, 1),
          growthMib: round((endBytes - startBytes) / 1024 ** 2, 1),
          byTypeStartMib: byType(first),
          byTypeEndMib: byType(last),
          byTypeSamplesMib: typeSamples
        });
        entries[`${key}-renderer-heap-retained`] = buildResultEntry([rendererStartBytes, rendererEndBytes], {
          scenario: key,
          requests,
          note: 'bytes after a forced GC: [start, end of the idle period]'
        });
      } finally {
        await electronApp.close();
      }
    });
  }

  test.afterAll(async () => {
    if (!Object.keys(entries).length) return;

    const resultsDir = path.join(process.cwd(), 'tests', 'benchmarks', 'results');
    fs.mkdirSync(resultsDir, { recursive: true });
    const outputPath = path.join(resultsDir, 'idle-memory.json');
    writeResults(outputPath, { name: 'Idle Memory', unit: 'bytes', direction: 'smaller' }, entries);
    console.log(`[BENCHMARK] Results written to ${outputPath}`);
  });
});
