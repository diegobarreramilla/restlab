import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

global.React = React;

jest.mock('./StyledWrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('providers/ReduxStore/slices/app', () => ({
  savePreferences: jest.fn(() => () => Promise.resolve())
}));
jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  browseDirectory: jest.fn(),
  showInFolder: jest.fn((pathname) => {
    // same shape as the real thunk: returning a settled promise keeps the .catch reachable in tests
    return () => Promise.resolve(pathname);
  })
}));

import { showInFolder } from 'providers/ReduxStore/slices/collections/actions';
import General from './index';

const APP_DATA_PATH = '/home/diego/.config/restlab';
const COLLECTION_PATH = '/home/diego/demo-restlab/collections/sample';

const buildPreferences = (aiEnabled = false) => ({
  request: {
    sslVerification: true,
    customCaCertificate: { enabled: false, filePath: null },
    keepDefaultCaCertificates: { enabled: true },
    timeout: 0,
    storeCookies: true,
    sendCookies: true,
    oauth2: { useSystemBrowser: false }
  },
  autoSave: { enabled: false, interval: 1000 },
  general: { defaultLocation: '/home/diego/demo-restlab', fetchNotifications: false },
  ai: { enabled: aiEnabled }
});

const renderGeneralPreferences = ({ aiEnabled = false, collections = [] } = {}) => {
  const store = configureStore({
    reducer: {
      app: () => ({ preferences: buildPreferences(aiEnabled) }),
      collections: () => ({ collections })
    }
  });
  // the SettingsLayout wrappers read from the theme directly, so give them minimal values
  const theme = {
    text: '#1f1f1f',
    textLink: '#4b6e8f',
    font: { size: { base: '14px', sm: '12px', xs: '11px' } },
    border: { border1: '#e5e5e5', radius: { sm: '4px' } },
    colors: { text: { muted: '#8a8a8a', danger: '#d43f3f' } },
    input: { border: '#cfcfcf', focusBorder: '#8a8a8a' }
  };
  return render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <General />
      </ThemeProvider>
    </Provider>
  );
};

describe('Preferences — General: Privacy "Where your data lives"', () => {
  let ipcSpy;
  let fetchSpy;
  let xhrOpenSpy;
  let clipboardSpy;
  const originalFetch = window.fetch;
  const originalClipboard = navigator.clipboard;

  const stubClipboard = () => {
    clipboardSpy = jest.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: clipboardSpy }, configurable: true });
  };

  const stubOutboundNetwork = () => {
    // jsdom does not ship fetch; stub it just to prove nothing reaches out
    if (originalFetch) {
      fetchSpy = jest.spyOn(window, 'fetch');
    } else {
      fetchSpy = jest.fn();
      window.fetch = fetchSpy;
    }
    xhrOpenSpy = jest.spyOn(XMLHttpRequest.prototype, 'open');
  };

  const restoreStubs = () => {
    delete window.ipcRenderer;
    if (originalFetch) {
      fetchSpy?.mockRestore?.();
    } else {
      delete window.fetch;
    }
    xhrOpenSpy?.mockRestore?.();
    Object.defineProperty(navigator, 'clipboard', { value: originalClipboard, configurable: true });
  };

  beforeEach(() => {
    jest.clearAllMocks();

    stubClipboard();
    stubOutboundNetwork();

    ipcSpy = jest.fn((channel) => {
      if (channel === 'renderer:get-user-data-path') return Promise.resolve(APP_DATA_PATH);
      return Promise.resolve(undefined);
    });
    window.ipcRenderer = { invoke: ipcSpy, send: jest.fn(), on: jest.fn() };
  });

  afterEach(() => {
    restoreStubs();
    jest.restoreAllMocks();
  });

  it('asks the main process for the app data folder with a read-only IPC', async () => {
    renderGeneralPreferences();

    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:get-user-data-path');

    await waitFor(() => {
      expect(screen.getByTestId('privacy-user-data-path')).toHaveTextContent(APP_DATA_PATH);
    });
  });

  it('shows the folder where every open collection lives', () => {
    renderGeneralPreferences({
      collections: [
        { name: 'sample', pathname: COLLECTION_PATH },
        { name: 'sample', pathname: COLLECTION_PATH }, // duplicate path: shown once
        { name: 'payments', pathname: '/home/diego/demo-restlab/collections/payments' }
      ]
    });

    const rows = screen.getAllByTestId('privacy-collection-path');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('sample');
    expect(rows[0]).toHaveTextContent(COLLECTION_PATH);
    expect(rows[1]).toHaveTextContent('payments');
  });

  it('says when no collections are open and hides the empty lists', () => {
    renderGeneralPreferences();

    expect(screen.getByTestId('privacy-no-collections')).toHaveTextContent('No collections open');
    expect(screen.queryAllByTestId('privacy-collection-path')).toHaveLength(0);
    expect(screen.getByTestId('privacy-user-data-path')).toBeInTheDocument();
  });

  it('copies the app data folder path to the clipboard', async () => {
    renderGeneralPreferences();

    await waitFor(() => {
      expect(screen.getByTestId('privacy-user-data-path')).toHaveTextContent(APP_DATA_PATH);
    });

    fireEvent.click(screen.getByTestId('privacy-copy-user-data'));

    await waitFor(() => expect(clipboardSpy).toHaveBeenCalledWith(APP_DATA_PATH));
  });

  it('copies an open collection path to the clipboard', () => {
    renderGeneralPreferences({ collections: [{ name: 'sample', pathname: COLLECTION_PATH }] });

    fireEvent.click(screen.getAllByTestId('privacy-copy-collection')[0]);

    expect(clipboardSpy).toHaveBeenCalledWith(COLLECTION_PATH);
  });

  it('reveals the app data folder with the existing show-in-folder helper', async () => {
    renderGeneralPreferences();

    await waitFor(() => {
      expect(screen.getByTestId('privacy-user-data-path')).toHaveTextContent(APP_DATA_PATH);
    });

    fireEvent.click(screen.getByTestId('privacy-reveal-user-data'));

    expect(showInFolder).toHaveBeenCalledWith(APP_DATA_PATH);
    expect(ipcSpy).not.toHaveBeenCalledWith('renderer:show-in-folder', APP_DATA_PATH);
  });

  it('makes no network request and no outbound call beyond the read-only path IPC', async () => {
    renderGeneralPreferences({ collections: [{ name: 'sample', pathname: COLLECTION_PATH }] });

    fireEvent.click(screen.getAllByTestId('privacy-copy-collection')[0]);

    await waitFor(() => {
      expect(screen.getByTestId('privacy-user-data-path')).toHaveTextContent(APP_DATA_PATH);
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrOpenSpy).not.toHaveBeenCalled();
    expect(ipcSpy).toHaveBeenCalledTimes(1);
    expect(ipcSpy).toHaveBeenCalledWith('renderer:get-user-data-path');
  });

  it('lists AI among what can connect only while AI is enabled', () => {
    const { getByTestId } = renderGeneralPreferences({ aiEnabled: false });
    expect(getByTestId('privacy-ai-state')).toHaveTextContent('Currently: off');
  });

  it('says AI is on when it is enabled in preferences and it is listed', () => {
    const { getByTestId } = renderGeneralPreferences({ aiEnabled: true });
    expect(getByTestId('privacy-ai-state')).toHaveTextContent('Currently: on');
  });

  it('names the network inventory document as the complete reference', () => {
    renderGeneralPreferences();

    expect(screen.getByTestId('privacy-inventory-note')).toHaveTextContent('docs/privacy/network-inventory.md');
  });

  it('saves a setting that is switched on and back off without leaving the page', async () => {
    const { savePreferences } = require('providers/ReduxStore/slices/app');
    renderGeneralPreferences();
    const toggle = screen.getByTestId('general-strict-network');

    fireEvent.click(toggle);
    await waitFor(() => expect(savePreferences).toHaveBeenCalledTimes(1));
    expect(savePreferences.mock.calls[0][0].general.strictNetwork).toBe(true);

    fireEvent.click(toggle);
    await waitFor(() => expect(savePreferences).toHaveBeenCalledTimes(2));
    expect(savePreferences.mock.calls[1][0].general.strictNetwork).toBe(false);
  });
});
