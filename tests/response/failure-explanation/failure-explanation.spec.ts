import http from 'http';
import net from 'net';
import { test, expect } from '../../../playwright';
import { createCollection, createRequest } from '../../utils/page';

const COLLECTION_NAME = 'failure-explanation';

const listen = (server: net.Server) =>
  new Promise<number>((resolve) => server.listen(0, '127.0.0.1', () => resolve((server.address() as net.AddressInfo).port)));

// Local servers that fail in known ways, so nothing here touches the network.
const startServers = async () => {
  const api = http.createServer((req, res) => {
    if (req.url === '/private') {
      res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="staff area"' });
      return res.end('{"error":"unauthorized"}');
    }
    if (req.url === '/limited') {
      res.writeHead(429, { 'Retry-After': '7' });
      return res.end('slow down');
    }
    if (req.url === '/missing') {
      res.writeHead(404);
      return res.end('not found');
    }
    res.end('ok');
  });
  const notHttp = net.createServer((socket) => {
    socket.on('error', () => {});
    socket.on('data', () => socket.end('SSH-2.0-OpenSSH_9\r\n'));
  });
  const closed = net.createServer();

  const apiPort = await listen(api);
  const notHttpPort = await listen(notHttp);
  const closedPort = await listen(closed);
  await new Promise((resolve) => closed.close(resolve));

  return { apiPort, notHttpPort, closedPort, stop: () => [api, notHttp].forEach((server) => server.close()) };
};

test.describe('Explaining why a request failed', () => {
  test('a failed request says what went wrong and where to fix it, and a normal one says nothing', async ({ page, createTmpDir }) => {
    test.setTimeout(3 * 60 * 1000);
    const dir = await createTmpDir('failure-explanation');
    const servers = await startServers();
    const explanation = page.getByTestId('failure-explanation');

    const sendNew = async (name: string, url: string) => {
      await createRequest(page, name, COLLECTION_NAME, { url });
      await page.getByTestId('send-arrow-icon').click();
    };

    try {
      await createCollection(page, COLLECTION_NAME, dir);

      await test.step('Nothing listening on the port', async () => {
        await sendNew('refused', `http://127.0.0.1:${servers.closedPort}/`);
        await expect(explanation).toHaveAttribute('data-kind', 'connection-refused', { timeout: 30000 });
        await expect(explanation).toContainText(`Nothing is listening on port ${servers.closedPort} of 127.0.0.1`);
        await expect(page.getByTestId('failure-explanation-action')).toHaveCount(0);
      });

      await test.step('https:// against a port that speaks plain HTTP', async () => {
        await sendNew('wrong-scheme', `https://127.0.0.1:${servers.apiPort}/`);
        await expect(explanation).toHaveAttribute('data-kind', 'https-to-plain-http', { timeout: 30000 });
        await expect(explanation).toContainText('Try http://');
      });

      await test.step('A port that is not an HTTP service', async () => {
        await sendNew('not-http', `http://127.0.0.1:${servers.notHttpPort}/`);
        await expect(explanation).toHaveAttribute('data-kind', 'not-http', { timeout: 30000 });
      });

      await test.step('A 401 names what the server asks for and opens the Auth tab', async () => {
        await sendNew('private', `http://127.0.0.1:${servers.apiPort}/private`);
        await expect(explanation).toHaveAttribute('data-kind', 'authentication-required', { timeout: 30000 });
        await expect(explanation).toContainText('Basic authentication for "staff area"');

        await page.getByTestId('failure-explanation-action').click();
        await expect(page.getByTestId('responsive-tab-auth')).toHaveClass(/active/);
      });

      await test.step('A 429 says how long to wait, and can be dismissed', async () => {
        await sendNew('limited', `http://127.0.0.1:${servers.apiPort}/limited`);
        await expect(explanation).toHaveAttribute('data-kind', 'rate-limited', { timeout: 30000 });
        await expect(explanation).toContainText('try again in 7 seconds');

        await page.getByTestId('failure-explanation-close').click();
        await expect(explanation).toHaveCount(0);
      });

      await test.step('A status with no specific cause, and a success, are left alone', async () => {
        await sendNew('missing', `http://127.0.0.1:${servers.apiPort}/missing`);
        await expect(page.getByTestId('response-status-code')).toContainText('404', { timeout: 30000 });
        await expect(explanation).toHaveCount(0);

        await sendNew('fine', `http://127.0.0.1:${servers.apiPort}/`);
        await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 30000 });
        await expect(explanation).toHaveCount(0);
      });
    } finally {
      servers.stop();
    }
  });
});
