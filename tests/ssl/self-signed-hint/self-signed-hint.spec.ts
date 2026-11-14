import fs from 'fs';
import https from 'https';
import path from 'path';
import { execFileSync } from 'child_process';
import { test, expect } from '../../../playwright';
import { closeAllCollections, createCollection, createRequest } from '../../utils/page';

// A local HTTPS server with a certificate nobody trusts, so the request fails without touching the network.
const startSelfSignedServer = async (dir: string) => {
  const keyPath = path.join(dir, 'key.pem');
  const certPath = path.join(dir, 'cert.pem');
  execFileSync('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', keyPath, '-out', certPath,
    '-days', '2', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1'
  ], { stdio: 'ignore' });

  const server = https.createServer(
    { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) },
    (_req, res) => res.end('ok')
  );
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, port: (server.address() as { port: number }).port };
};

test.describe('Request to a server with a self-signed certificate', () => {
  test.afterEach(async ({ page }) => {
    if (!page.isClosed()) {
      await closeAllCollections(page);
    }
  });

  test('the failure explains the cause and opens Preferences in one click', async ({ page, createTmpDir }) => {
    const dir = await createTmpDir('self-signed-hint');
    const { server, port } = await startSelfSignedServer(dir);

    try {
      await test.step('Create a request to the server', async () => {
        await createCollection(page, 'self-signed-hint', dir);
        await createRequest(page, 'ping', 'self-signed-hint', { url: `https://127.0.0.1:${port}/` });
      });

      await test.step('Send it and read the explanation', async () => {
        await page.getByTestId('send-arrow-icon').click();
        await expect(page.getByTestId('failure-explanation')).toBeVisible({ timeout: 30000 });
        await expect(page.getByTestId('failure-explanation')).toContainText('Use Custom CA Certificate');
      });

      await test.step('Open Preferences from the hint', async () => {
        await page.getByTestId('failure-explanation-action').click();
        await expect(page.getByText('SSL/TLS Certificate Verification').first()).toBeVisible();
      });
    } finally {
      server.close();
    }
  });
});
