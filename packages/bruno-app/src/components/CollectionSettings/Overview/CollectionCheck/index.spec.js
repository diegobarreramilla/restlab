import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'providers/Theme';
import tabsReducer from 'providers/ReduxStore/slices/tabs';
import CollectionCheck from './index';

const request = (name, url) => ({ uid: `uid-${name}`, name, type: 'http-request', request: { url, headers: [], params: [] } });

const renderCheck = (collection, globalEnvironments = []) => {
  const store = configureStore({
    reducer: { tabs: tabsReducer, globalEnvironments: (state = { globalEnvironments }) => state },
    preloadedState: { tabs: { tabs: [], activeTabUid: null } }
  });
  render(
    <Provider store={store}>
      <ThemeProvider>
        <CollectionCheck collection={{ uid: 'col-1', name: 'demo', ...collection }} />
      </ThemeProvider>
    </Provider>
  );
  return store;
};

describe('CollectionCheck', () => {
  it('renders nothing for a healthy collection', () => {
    renderCheck({ items: [request('ok', 'https://a.test')] });

    expect(screen.queryByTestId('collection-check')).not.toBeInTheDocument();
  });

  it('counts the findings and lists them only when opened', () => {
    renderCheck({ items: [request('list', '{{host}}/users'), request('blank', '')] });

    expect(screen.getByTestId('collection-check-toggle')).toHaveTextContent('2 things to review in this collection');
    expect(screen.queryByTestId('collection-check-list')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('collection-check-toggle'));

    const rows = screen.getAllByTestId('collection-check-row');
    expect(rows[0]).toHaveTextContent('list · uses {{host}}, which nothing defines');
    expect(rows[1]).toHaveTextContent('blank · has no URL');
  });

  it('counts a global environment variable as defined', () => {
    renderCheck({ items: [request('list', '{{host}}/users')] }, [{ uid: 'g', variables: [{ name: 'host', value: 'x' }] }]);

    expect(screen.queryByTestId('collection-check')).not.toBeInTheDocument();
  });

  it('opens the request a finding is in', () => {
    const store = renderCheck({ items: [request('blank', '')] });

    fireEvent.click(screen.getByTestId('collection-check-toggle'));
    fireEvent.click(screen.getByTestId('collection-check-open'));

    expect(store.getState().tabs.tabs.map((tab) => tab.uid)).toEqual(['uid-blank']);
  });

  it('opens the environments for a variable some of them lack', () => {
    const store = renderCheck({
      environments: [
        { uid: 'e1', name: 'dev', variables: [{ name: 'token', value: 'x', enabled: true }] },
        { uid: 'e2', name: 'prod', variables: [] }
      ],
      items: [request('me', 'https://a.test?t={{token}}')]
    });

    fireEvent.click(screen.getByTestId('collection-check-toggle'));
    expect(screen.getByTestId('collection-check-row')).toHaveTextContent('{{token}} is used by requests but missing in prod');
    fireEvent.click(screen.getByTestId('collection-check-open'));

    expect(store.getState().tabs.tabs[0].type).toBe('environment-settings');
  });
});
