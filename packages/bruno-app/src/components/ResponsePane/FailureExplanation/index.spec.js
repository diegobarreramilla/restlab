import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'providers/Theme';
import tabsReducer from 'providers/ReduxStore/slices/tabs';
import { explainRequestFailure } from 'utils/request-failures';
import FailureExplanation from './index';

const item = { uid: 'req-1' };
const collection = { uid: 'col-1' };
const requestTab = { uid: 'req-1', collectionUid: 'col-1', type: 'request', requestPaneTab: 'params' };

const renderExplanation = (input, { tabs = [requestTab], onDismiss } = {}) => {
  const store = configureStore({
    reducer: { tabs: tabsReducer },
    preloadedState: { tabs: { tabs, activeTabUid: tabs[0]?.uid ?? null } }
  });
  render(
    <Provider store={store}>
      <ThemeProvider>
        <FailureExplanation explanation={explainRequestFailure(input)} item={item} collection={collection} onDismiss={onDismiss} />
      </ThemeProvider>
    </Provider>
  );
  return store;
};

describe('FailureExplanation', () => {
  it('shows the explanation and its kind', () => {
    renderExplanation({ error: 'connect ECONNREFUSED 127.0.0.1:3000' });

    const explanation = screen.getByTestId('failure-explanation');
    expect(explanation).toHaveTextContent('Nothing is listening on port 3000 of 127.0.0.1');
    expect(explanation).toHaveAttribute('data-kind', 'connection-refused');
    expect(screen.queryByTestId('failure-explanation-action')).not.toBeInTheDocument();
    expect(screen.queryByTestId('failure-explanation-close')).not.toBeInTheDocument();
  });

  it('opens the Preferences tab for a certificate error', () => {
    const store = renderExplanation({ error: 'certificate has expired' });

    fireEvent.click(screen.getByTestId('failure-explanation-action'));

    expect(store.getState().tabs.tabs.some((tab) => tab.type === 'preferences')).toBe(true);
  });

  it('opens the Auth tab of the request for a 401', () => {
    const store = renderExplanation({ status: 401, headers: {} });

    expect(screen.getByTestId('failure-explanation-action')).toHaveTextContent('Open Auth');
    fireEvent.click(screen.getByTestId('failure-explanation-action'));

    expect(store.getState().tabs.tabs[0].requestPaneTab).toBe('auth');
  });

  it('offers no request action when the request has no tab of its own', () => {
    renderExplanation({ status: 401, headers: {} }, { tabs: [] });

    expect(screen.getByTestId('failure-explanation')).toBeInTheDocument();
    expect(screen.queryByTestId('failure-explanation-action')).not.toBeInTheDocument();
  });

  it('can be dismissed when it is given a way to', () => {
    const onDismiss = jest.fn();
    renderExplanation({ status: 403, headers: {} }, { onDismiss });

    fireEvent.click(screen.getByTestId('failure-explanation-close'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
