const { ipcMain, session } = require('electron');
const { preferencesUtil } = require('../store/preferences');
const { APP_PARTITION } = require('./app-documents');

/**
 * Strict network mode: while it is on, the app's own windows cannot load anything from another machine.
 * Requests the user sends, token requests and git run in the main process or in their own session, so they
 * are not affected; what this stops is everything else a window could fetch by itself (a remote image in a
 * document, the assets of an HTML answer shown as a page, a call from an embedded app). Each blocked attempt
 * is counted so the user can check that the count stays at zero.
 */

const NETWORK_PROTOCOLS = ['http:', 'https:', 'ws:', 'wss:', 'ftp:'];
const MAX_REMEMBERED_HOSTS = 20;

const isLoopbackHost = (hostname) => {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return host === 'localhost' || host.endsWith('.localhost') || host === '::1' || /^127(\.\d{1,3}){3}$/.test(host);
};

/** Whether a URL stays on this machine. Anything that cannot be read as a URL is treated as leaving it. */
const staysOnThisMachine = (url) => {
  let parsed;
  try {
    parsed = new URL(url);
  } catch (error) {
    return false;
  }
  if (!NETWORK_PROTOCOLS.includes(parsed.protocol)) {
    return true;
  }
  return isLoopbackHost(parsed.hostname);
};

const createBlockedLog = () => {
  let count = 0;
  const hosts = new Map();

  return {
    record(url) {
      count += 1;
      let host = 'unknown';
      try {
        host = new URL(url).host || host;
      } catch (error) {
        // keep 'unknown'
      }
      if (hosts.has(host) || hosts.size < MAX_REMEMBERED_HOSTS) {
        hosts.set(host, (hosts.get(host) || 0) + 1);
      }
    },
    snapshot() {
      return { blockedCount: count, blockedHosts: [...hosts.entries()].map(([host, attempts]) => ({ host, attempts })) };
    }
  };
};

/** The decision for one request of a window: cancel it when the mode is on and it leaves this machine. */
const decide = ({ url, isEnabled, log }) => {
  if (!isEnabled() || staysOnThisMachine(url)) {
    return { cancel: false };
  }
  log.record(url);
  return { cancel: true };
};

const registerStrictNetwork = () => {
  const log = createBlockedLog();
  const isEnabled = () => preferencesUtil.isStrictNetworkEnabled();

  for (const windowSession of [session.defaultSession, session.fromPartition(APP_PARTITION)]) {
    windowSession.webRequest.onBeforeRequest((details, callback) => {
      callback(decide({ url: details.url, isEnabled, log }));
    });
  }

  ipcMain.handle('renderer:get-strict-network-status', () => ({ enabled: isEnabled(), ...log.snapshot() }));
};

module.exports = { registerStrictNetwork, staysOnThisMachine, createBlockedLog, decide };
