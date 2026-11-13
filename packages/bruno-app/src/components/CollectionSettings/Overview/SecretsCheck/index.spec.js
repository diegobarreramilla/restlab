import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import tabsReducer from 'providers/ReduxStore/slices/tabs';
import SecretsCheck from './index';

const mockMarkAsSecret = jest.fn();
jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  markEnvironmentVariablesAsSecret: (payload) => () => mockMarkAsSecret(payload)
}));

jest.mock('react-hot-toast', () => ({ error: jest.fn(), success: jest.fn() }));

const TOKEN = 'ghp_a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8';

const renderCheck = (collection) => {
  const store = configureStore({ reducer: { tabs: tabsReducer }, preloadedState: { tabs: { tabs: [], activeTabUid: null } } });
  render(
    <Provider store={store}>
      <ThemeProvider theme={themes.light}>
        <SecretsCheck collection={collection} />
      </ThemeProvider>
    </Provider>
  );
  return store;
};

const request = (headers) => ({
  type: 'http-request',
  uid: 'req-1',
  name: 'list users',
  request: { url: 'https://api.example.com', headers, params: [], auth: { mode: 'none' } }
});

const environment = (uid, name, variables) => ({ uid, name, variables });
const plain = (name, value) => ({ name, value, secret: false, enabled: true });

describe('SecretsCheck', () => {
  beforeEach(() => mockMarkAsSecret.mockReset().mockResolvedValue(undefined));

  it('renders nothing for a collection without plain-text secrets', () => {
    const { container } = render(
      <Provider store={configureStore({ reducer: { tabs: tabsReducer } })}>
        <ThemeProvider theme={themes.light}>
          <SecretsCheck collection={{ items: [request([{ name: 'Accept', value: '*/*', enabled: true }])], environments: [], root: {} }} />
        </ThemeProvider>
      </Provider>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('says how many there are and keeps the list closed until asked', () => {
    renderCheck({ items: [request([{ name: 'X-Trace', value: TOKEN, enabled: true }])], environments: [], root: {} });

    expect(screen.getByTestId('secrets-check-toggle')).toHaveTextContent('1 value looks like a secret stored in plain text');
    expect(screen.queryByTestId('secrets-check-list')).not.toBeInTheDocument();
  });

  it('lists where each one is without ever showing the value', () => {
    renderCheck({ items: [request([{ name: 'X-Trace', value: TOKEN, enabled: true }])], environments: [], root: {} });

    fireEvent.click(screen.getByTestId('secrets-check-toggle'));

    const row = screen.getByTestId('secrets-check-row');
    expect(row).toHaveTextContent('list users');
    expect(row).toHaveTextContent('X-Trace');
    expect(screen.getByTestId('secrets-check')).not.toHaveTextContent(TOKEN);
  });

  it('offers no "mark as secret" for a value in a request, which is not an environment variable', () => {
    renderCheck({ items: [request([{ name: 'X-Trace', value: TOKEN, enabled: true }])], environments: [], root: {} });

    fireEvent.click(screen.getByTestId('secrets-check-toggle'));

    expect(screen.queryByTestId('secrets-check-mark')).not.toBeInTheDocument();
  });

  it('marks one environment variable as secret', async () => {
    renderCheck({
      uid: 'col-1',
      items: [],
      environments: [environment('env-1', 'dev', [plain('password', 'correct-horse-battery')])],
      root: {}
    });
    fireEvent.click(screen.getByTestId('secrets-check-toggle'));

    fireEvent.click(screen.getByTestId('secrets-check-mark'));

    await waitFor(() => expect(mockMarkAsSecret).toHaveBeenCalledTimes(1));
    expect(mockMarkAsSecret).toHaveBeenCalledWith({ collectionUid: 'col-1', environmentUid: 'env-1', names: ['password'] });
  });

  it('marks every flagged variable at once, one call per environment', async () => {
    renderCheck({
      uid: 'col-1',
      items: [],
      environments: [
        environment('env-1', 'dev', [plain('password', 'correct-horse-battery'), plain('apiKey', 'k_live_1234567')]),
        environment('env-2', 'prod', [plain('password', 'another-long-password')])
      ],
      root: {}
    });
    fireEvent.click(screen.getByTestId('secrets-check-toggle'));

    fireEvent.click(screen.getByTestId('secrets-check-mark-all'));

    await waitFor(() => expect(mockMarkAsSecret).toHaveBeenCalledTimes(2));
    expect(mockMarkAsSecret).toHaveBeenCalledWith({ collectionUid: 'col-1', environmentUid: 'env-1', names: ['password', 'apiKey'] });
    expect(mockMarkAsSecret).toHaveBeenCalledWith({ collectionUid: 'col-1', environmentUid: 'env-2', names: ['password'] });
  });

  it('opens the environment settings when the location is clicked', () => {
    const store = renderCheck({
      uid: 'col-1',
      items: [],
      environments: [environment('env-1', 'dev', [plain('password', 'correct-horse-battery')])],
      root: {}
    });
    fireEvent.click(screen.getByTestId('secrets-check-toggle'));

    fireEvent.click(screen.getByTestId('secrets-check-open'));

    expect(store.getState().tabs.tabs.some((tab) => tab.type === 'environment-settings')).toBe(true);
  });
});
