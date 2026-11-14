import http from 'http';
import net from 'net';
import { test, expect } from '../../../playwright';
import { createCollection, createRequest, selectResponsePaneTab } from '../../utils/page';

const COLLECTION_NAME = 'response-compare';

// Answers differently on each call, so two sends of the same request have something to compare.
const startServer = async () => {
  let calls = 0;
  const server = http.createServer((_req, res) => {
    calls += 1;
    const body = { id: 7, name: calls === 1 ? 'Ada' : 'Grace', roles: ['admin', 'dev'] };
    res.writeHead(calls === 1 ? 200 : 201, { 'Content-Type': 'application/json', 'X-Version': String(calls) });
    res.end(JSON.stringify(body));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, port: (server.address() as net.AddressInfo).port };
};

test.describe('Comparing two answers of a request', () => {
  test('the Compare tab appears after the second answer and shows what changed', async ({ page, createTmpDir }) => {
    test.setTimeout(2 * 60 * 1000);
    const dir = await createTmpDir('response-compare');
    const { server, port } = await startServer();
    const status = page.getByTestId('response-status-code');

    try {
      await createCollection(page, COLLECTION_NAME, dir);
      await createRequest(page, 'user', COLLECTION_NAME, { url: `http://127.0.0.1:${port}/user` });

      await test.step('One answer is not enough to compare', async () => {
        await page.getByTestId('send-arrow-icon').click();
        await expect(status).toContainText('200', { timeout: 30000 });
        await expect(page.getByTestId('response-pane').getByRole('tab', { name: 'Compare' })).toHaveCount(0);
      });

      await test.step('The second answer brings the Compare tab', async () => {
        await page.getByTestId('send-arrow-icon').click();
        await expect(status).toContainText('201', { timeout: 30000 });
        await selectResponsePaneTab(page, 'Compare');
      });

      await test.step('It shows the status, the header and the field that changed', async () => {
        await expect(page.getByTestId('response-compare-status')).toContainText('200');
        await expect(page.getByTestId('response-compare-status')).toContainText('201');
        await expect(page.getByTestId('response-compare-header').filter({ hasText: 'x-version' })).toContainText('changed');

        const body = page.getByTestId('response-compare-body');
        await expect(body).toContainText('-   "name": "Ada"');
        await expect(body).toContainText('+   "name": "Grace"');
        await expect(body.locator('.body-line.added')).toHaveCount(1);
        await expect(body.locator('.body-line.removed')).toHaveCount(1);
      });
    } finally {
      server.close();
    }
  });
});
